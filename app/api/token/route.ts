import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { refreshLongLivedToken } from "@/lib/instagram";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: config } = await db
    .from("config")
    .select("access_token, token_expires_at")
    .eq("id", 1)
    .single();

  if (!config?.access_token) {
    return NextResponse.json({ error: "No token" }, { status: 400 });
  }

  try {
    const refreshed = await refreshLongLivedToken(config.access_token);
    await db
      .from("config")
      .update({
        access_token: refreshed.access_token,
        token_expires_at: new Date(
          Date.now() + (refreshed.expires_in ?? 5184000) * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    return NextResponse.json({
      status: "ok",
      expires_in_days: Math.floor((refreshed.expires_in ?? 5184000) / 86400),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
