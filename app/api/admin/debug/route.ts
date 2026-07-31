import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getProfile, subscribeWebhooks } from "@/lib/instagram";

export async function GET() {
  const { data: config } = await db.from("config").select("*").eq("id", 1).single();

  const { data: events } = await db.from("events").select("*").order("created_at", { ascending: false }).limit(10);

  const { data: automations } = await db.from("automations").select("*").order("created_at", { ascending: false });

  let profileTest = null;
  let subscribeTest = null;
  if (config?.access_token && config?.instagram_user_id) {
    try {
      profileTest = await getProfile(config.instagram_user_id, config.access_token);
    } catch (e) {
      profileTest = { error: e instanceof Error ? e.message : "failed" };
    }
    try {
      subscribeTest = await subscribeWebhooks(config.instagram_user_id, config.access_token);
    } catch (e) {
      subscribeTest = { error: e instanceof Error ? e.message : "failed" };
    }
  }

  return NextResponse.json({
    config: config ? {
      instagram_user_id: config.instagram_user_id,
      instagram_username: config.instagram_username,
      has_token: !!config.access_token,
      token_expires_at: config.token_expires_at,
    } : null,
    automations: automations ?? [],
    events: events ?? [],
  });
}