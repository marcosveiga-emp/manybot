import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function GET() {
  const authed = await getSession();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await db
    .from("config")
    .select("*")
    .eq("id", 1)
    .single();

  return NextResponse.json({
    config: data
      ? {
          instagram_user_id: data.instagram_user_id,
          instagram_username: data.instagram_username,
          has_token: !!data.access_token,
          token_expires_at: data.token_expires_at,
        }
      : null,
    error: error?.message ?? null,
  });
}