import { NextResponse } from "next/server";
import { validateSignature } from "@/lib/crypto";
import { db } from "@/lib/supabase";
import { enqueue } from "@/lib/queue";
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
    const messaging = entry.messaging ?? [];

    for (const event of messaging) {
      try {
        await processEvent(event);
      } catch (e) {
        console.error("Event processing error:", e);
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}

async function processEvent(event: Record<string, unknown>) {
  const sender = (event.sender as Record<string, string>) ?? {};
  const recipient = (event.recipient as Record<string, string>) ?? {};
  const message = (event.message as Record<string, unknown>) ?? {};
  const timestamp = event.timestamp as string;

  const senderId = sender.id;
  const igUserId = recipient.id;

  const messageText = (message.text as string) ?? "";
  const replyTo = message.reply_to as Record<string, unknown> | undefined;
  const isStoryReply = replyTo?.story != null;
  const commentId = (event.comment_id as string) ?? "";
  const media = event.media as Record<string, unknown> | undefined;
  const mediaId = (media?.id as string) ?? "";

  const eventType = commentId
    ? "comment"
    : isStoryReply
      ? "story_reply"
      : "message";

  // Log event
  const { data: evt } = await db
    .from("events")
    .insert({
      event_type: eventType,
      sender_id: senderId,
      sender_username: null,
      media_id: mediaId,
      comment_id: commentId,
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
      instagram_id: senderId,
      last_response_at: timestamp
        ? new Date(timestamp).toISOString()
        : new Date().toISOString(),
    },
    { onConflict: "instagram_id" }
  );

  // Fetch active automations
  const { data: automations } = await db
    .from("automations")
    .select("*")
    .eq("active", true);

  if (!automations?.length) return;

  const config = await getConfig();

  for (const auto of automations) {
    const triggers = auto.triggers ?? [];
    const keywords = auto.keywords ?? [];

    if (!triggers.includes(eventType)) continue;
    if (!keywords.length) continue;

    const matched = matchKeyword(messageText.toLowerCase(), keywords, auto.match_type);
    if (!matched) continue;

    // Update event with match info
    await db
      .from("events")
      .update({
        matched_keyword: matched,
        matched_automation_id: auto.id,
        processed: true,
      })
      .eq("id", evt.id);

    // Handle based on event type
    if (eventType === "comment" && commentId) {
      // Private reply (fura a janela de 24h, 1 vez por comentario)
      await enqueue({
        instagram_user_id: config.instagram_user_id,
        recipient_type: "comment_id",
        recipient_value: commentId,
        message: { text: auto.welcome_message },
      });

      // Optional public reply (direct call, not queued)
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

      if (auto.quick_reply_button) {
        await enqueue({
          instagram_user_id: config.instagram_user_id,
          recipient_type: "comment_id",
          recipient_value: commentId,
          message: {
            text: auto.quick_reply_button,
            quick_replies: [{ content_type: "text", title: auto.quick_reply_button, payload: "WELCOME_REPLY" }],
          },
        });
      }
    } else if ((eventType === "message" || eventType === "story_reply") && messageText) {
      // DM ou story reply - manda welcome direct
      if (config.instagram_user_id && senderId) {
        await enqueue({
          instagram_user_id: config.instagram_user_id,
          recipient_type: "id",
          recipient_value: senderId,
          message: { text: auto.welcome_message },
        });
      }

      // Open the 24h window - update contact
      await db
        .from("contacts")
        .update({
          last_response_at: new Date().toISOString(),
          conversation_open_until: new Date(
            Date.now() + 24 * 60 * 60 * 1000
          ).toISOString(),
          last_automation_id: auto.id,
        })
        .eq("instagram_id", senderId);
    }
  }

  // Drain queue immediately for instant delivery
  after(() => {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/drain`, {
      method: "POST",
      headers: { "x-cron-secret": process.env.CRON_SECRET! },
    }).catch(() => {});
  });
}

function matchKeyword(
  text: string,
  keywords: string[],
  matchType: string
): string | null {
  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    if (matchType === "exact" && text === kwLower) return kw;
    if (matchType === "contains" && text.includes(kwLower)) return kw;
    if (matchType === "any") return kw;
  }
  return null;
}

async function getConfig() {
  const { data } = await db.from("config").select("*").eq("id", 1).single();
  return (
    data ?? {
      access_token: "",
      instagram_user_id: "",
      instagram_username: "",
      profile_picture_url: "",
    }
  );
}

function after(fn: () => void) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(fn);
  } else {
    setTimeout(fn, 0);
  }
}
