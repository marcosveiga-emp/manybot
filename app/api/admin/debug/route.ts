import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/auth";
import { getProfile } from "@/lib/instagram";

export async function GET() {
  const authed = await getSession();
  if (!authed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: config } = await db.from("config").select("*").eq("id", 1).single();

  const { data: events } = await db.from("events").select("*").order("created_at", { ascending: false }).limit(10);

  const { data: queue } = await db.from("queue").select("*").order("created_at", { ascending: false }).limit(10);

  const { count: autoCount } = await db.from("automations").select("*", { count: "exact", head: true });

  let profileTest = null;
  if (config?.access_token && config?.instagram_user_id) {
    try {
      profileTest = await getProfile(config.instagram_user_id, config.access_token);
    } catch (e) {
      profileTest = { error: e instanceof Error ? e.message : "failed" };
    }
  }

  return NextResponse.json({
    config: config ? {
      instagram_user_id: config.instagram_user_id,
      instagram_username: config.instagram_username,
      has_token: !!config.access_token,
      token_expires_at: config.token_expires_at,
    } : null,
    automations_count: autoCount,
    events: events ?? [],
    queue: queue ?? [],
    profileTest,
  });
}