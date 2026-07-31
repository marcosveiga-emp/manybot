import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getProfile, subscribeWebhooks, sendMessage } from "@/lib/instagram";

export async function GET() {
  const { data: config } = await db.from("config").select("*").eq("id", 1).single();

  const { data: events } = await db.from("events").select("*").order("created_at", { ascending: false }).limit(10);

  const { data: automations } = await db.from("automations").select("*").order("created_at", { ascending: false });

  const { data: queue } = await db.from("queue").select("*").order("created_at", { ascending: false }).limit(10);

  let sendTest = null;
  if (config?.access_token && config?.instagram_user_id) {
    // Test sending a DM to self
    const matchedEvent = (events ?? []).find((e: Record<string, unknown>) => e.comment_id && e.matched_keyword);
    if (matchedEvent) {
      try {
        const commentId = (matchedEvent as Record<string, string>).comment_id;
        sendTest = await sendMessage(
          config.instagram_user_id,
          config.access_token,
          {
            recipient: { comment_id: commentId },
            message: { text: "Teste de DM do Manybot!" },
          }
        );
      } catch (e) {
        sendTest = { error: e instanceof Error ? e.message : "failed" };
      }
    }
  }

  return NextResponse.json({
    config: config ? {
      instagram_user_id: config.instagram_user_id,
      instagram_username: config.instagram_username,
      has_token: !!config.access_token,
    } : null,
    automations: automations ?? [],
    events: events ?? [],
    queue: queue ?? [],
    sendTest,
  });
}