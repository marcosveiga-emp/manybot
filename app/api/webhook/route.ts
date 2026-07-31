import { NextResponse } from "next/server";
import { validateSignature } from "@/lib/crypto";
import { db } from "@/lib/supabase";
import { enqueue, drainQueue } from "@/lib/queue";
import { replyToComment } from "@/lib/instagram";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";

  if (!validateSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entries = payload?.entry ?? [];

  for (const entry of entries) {
    const igUserId = entry.id as string;

    // Comments format: entry[].changes[]
    const changes = entry.changes ?? [];
    for (const change of changes) {
      try {
        await processChange(change, igUserId);
      } catch (e) {
        console.error("Change processing error:", e);
      }
    }

    // Messages format: entry[].messaging[]
    const messaging = entry.messaging ?? [];
    for (const event of messaging) {
      try {
        await processMessage(event, igUserId);
      } catch (e) {
        console.error("Message processing error:", e);
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}

async function processChange(change: Record<string, unknown>, igUserId: string) {
  const field = change.field as string;
  const value = (change.value as Record<string, unknown>) ?? {};

  if (field === "comments") {
    await processComment(value, igUserId);
  }
}

async function processComment(value: Record<string, unknown>, igUserId: string) {
  const from = (value.from as Record<string, string>) ?? {};
  const media = (value.media as Record<string, string>) ?? {};

  const senderId = from.id;
  const senderUsername = from.username;
  const commentId = value.id as string;
  const messageText = (value.text as string) ?? "";
  const mediaId = media.id ?? "";

  // Fetch config for this account
  const config = await getConfig(igUserId);
  if (!config.access_token) {
    console.error("No config found for igUserId:", igUserId);
    return;
  }

  // Log event
  const { data: evt } = await db
    .from("events")
    .insert({
      instagram_user_id: igUserId,
      event_type: "comment",
      sender_id: senderId,
      sender_username: senderUsername,
      media_id: mediaId,
      comment_id: commentId,
      message_text: messageText,
      raw_payload: value,
      processed: false,
    })
    .select()
    .single();

  if (!evt) return;

  // Upsert contact
  await db.from("contacts").upsert(
    {
      instagram_user_id: igUserId,
      instagram_id: senderId,
      username: senderUsername,
      first_contact_at: new Date().toISOString(),
    },
    { onConflict: "instagram_user_id,instagram_id" }
  );

  // Fetch active automations for this account
  const { data: automations } = await db
    .from("automations")
    .select("*")
    .eq("instagram_user_id", igUserId)
    .eq("active", true);

  if (!automations?.length) {
    console.log("No active automations for account:", igUserId);
    return;
  }

  for (const auto of automations) {
    const triggers = auto.triggers ?? [];
    const keywords = auto.keywords ?? [];

    if (!triggers.includes("comment")) continue;
    if (!keywords.length) continue;

    const matched = matchKeyword(messageText, keywords, auto.match_type);
    if (!matched) continue;

    // Check specific post only if it's a valid media ID (numeric)
    if (
      auto.specific_post_id &&
      /^\d+$/.test(auto.specific_post_id) &&
      auto.specific_post_id !== mediaId
    ) continue;

    // Update event with match info
    await db
      .from("events")
      .update({
        matched_keyword: matched,
        matched_automation_id: auto.id,
        processed: true,
      })
      .eq("id", evt.id);

    // Private reply via comment_id
    const msgBody: Record<string, unknown> = { text: auto.welcome_message };
    if (auto.quick_reply_button) {
      msgBody.quick_replies = [
        {
          content_type: "text",
          title: auto.quick_reply_button,
          payload: "WELCOME_REPLY",
        },
      ];
    }
    await enqueue({
      instagram_user_id: igUserId,
      recipient_type: "comment_id",
      recipient_value: commentId,
      message: msgBody,
    });

    // Optional public reply
    if (auto.public_replies?.length > 0) {
      const reply =
        auto.public_replies[
          Math.floor(Math.random() * auto.public_replies.length)
        ];
      try {
        await replyToComment(commentId, config.access_token, reply);
      } catch (e) {
        console.error("Public reply error:", e);
      }
    }

    // Send link as follow-up if configured
    if (auto.link_url) {
      await enqueue({
        instagram_user_id: igUserId,
        recipient_type: "comment_id",
        recipient_value: commentId,
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "button",
              text: auto.link_text || "Aqui esta o link:",
              buttons: [
                {
                  type: "web_url",
                  title: auto.link_button_label || "Acessar",
                  url: auto.link_url,
                },
              ],
            },
          },
        },
      });
    }
  }

  // Drain queue immediately for instant delivery
  try {
    await drainQueue(config.access_token);
  } catch (e) {
    console.error("Drain error:", e);
  }
}

async function processMessage(event: Record<string, unknown>, igUserId: string) {
  const sender = (event.sender as Record<string, string>) ?? {};
  const message = (event.message as Record<string, unknown>) ?? {};
  const timestamp = event.timestamp as string;

  const senderId = sender.id;
  const messageText = (message.text as string) ?? "";
  const replyTo = message.reply_to as Record<string, unknown> | undefined;
  const isStoryReply = replyTo?.story != null;

  const eventType = isStoryReply ? "story_reply" : "message";

  // Fetch config for this account
  const config = await getConfig(igUserId);
  if (!config.access_token) {
    console.error("No config found for igUserId:", igUserId);
    return;
  }

  // Log event
  const { data: evt } = await db
    .from("events")
    .insert({
      instagram_user_id: igUserId,
      event_type: eventType,
      sender_id: senderId,
      message_text: messageText,
      raw_payload: event,
      processed: false,
    })
    .select()
    .single();

  if (!evt) return;

  // Upsert contact
  await db.from("contacts").upsert(
    {
      instagram_user_id: igUserId,
      instagram_id: senderId,
      last_response_at: timestamp
        ? new Date(Number(timestamp)).toISOString()
        : new Date().toISOString(),
    },
    { onConflict: "instagram_user_id,instagram_id" }
  );

  // Fetch active automations for this account
  const { data: automations } = await db
    .from("automations")
    .select("*")
    .eq("instagram_user_id", igUserId)
    .eq("active", true);

  if (!automations?.length) {
    console.log("No active automations for account:", igUserId);
    return;
  }

  for (const auto of automations) {
    const triggers = auto.triggers ?? [];
    const keywords = auto.keywords ?? [];

    if (!triggers.includes(eventType === "story_reply" ? "story" : "dm")) continue;
    if (!keywords.length) continue;

    const matched = matchKeyword(messageText, keywords, auto.match_type);
    if (!matched) continue;

    await db
      .from("events")
      .update({
        matched_keyword: matched,
        matched_automation_id: auto.id,
        processed: true,
      })
      .eq("id", evt.id);

    if (igUserId && senderId) {
      const msgBody: Record<string, unknown> = { text: auto.welcome_message };
      if (auto.quick_reply_button) {
        msgBody.quick_replies = [
          {
            content_type: "text",
            title: auto.quick_reply_button,
            payload: "WELCOME_REPLY",
          },
        ];
      }
      await enqueue({
        instagram_user_id: igUserId,
        recipient_type: "id",
        recipient_value: senderId,
        message: msgBody,
      });

      if (auto.link_url) {
        await enqueue({
          instagram_user_id: igUserId,
          recipient_type: "id",
          recipient_value: senderId,
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "button",
                text: auto.link_text || "Aqui esta o link:",
                buttons: [
                  {
                    type: "web_url",
                    title: auto.link_button_label || "Acessar",
                    url: auto.link_url,
                  },
                ],
              },
            },
          },
        });
      }
    }

    await db
      .from("contacts")
      .update({
        last_response_at: new Date().toISOString(),
        conversation_open_until: new Date(
          Date.now() + 24 * 60 * 60 * 1000
        ).toISOString(),
        last_automation_id: auto.id,
      })
      .eq("instagram_user_id", igUserId)
      .eq("instagram_id", senderId);
  }

  // Drain queue immediately
  try {
    await drainQueue(config.access_token);
  } catch (e) {
    console.error("Drain error:", e);
  }
}

function matchKeyword(
  text: string,
  keywords: string[],
  matchType: string
): string | null {
  const textLower = text.toLowerCase();
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    if (matchType === "exact" && textLower === kwLower) return kw;
    if (matchType === "contains" && textLower.includes(kwLower)) return kw;
    if (matchType === "any") return kw;
  }
  return null;
}

async function getConfig(igUserId: string) {
  const { data } = await db
    .from("config")
    .select("*")
    .eq("instagram_user_id", igUserId)
    .single();
  return (
    data ?? {
      access_token: "",
      instagram_user_id: "",
      instagram_username: "",
      profile_picture_url: "",
    }
  );
}

