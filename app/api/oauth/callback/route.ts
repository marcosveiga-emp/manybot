import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import {
  exchangeCodeForToken,
  getLongLivedToken,
  getProfile,
  subscribeWebhooks,
} from "@/lib/instagram";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    const desc =
      searchParams.get("error_description") ?? "Autorizacao cancelada.";
    return NextResponse.redirect(
      new URL(`/admin?error=${encodeURIComponent(desc)}`, request.url)
    );
  }

  try {
    const short = await exchangeCodeForToken(code);

    const long = await getLongLivedToken(short.access_token);
    const token = long.access_token;
    const expiresIn = long.expires_in ?? 5184000; // 60 days

    const profile = await getProfile(short.user_id ?? long.user_id, token);

    await db.from("config").upsert({
      id: 1,
      access_token: token,
      instagram_user_id: profile.user_id ?? profile.id,
      instagram_username: profile.username,
      profile_picture_url: profile.profile_picture_url,
      token_expires_at: new Date(
        Date.now() + expiresIn * 1000
      ).toISOString(),
      updated_at: new Date().toISOString(),
    });

    try {
      await subscribeWebhooks(
        profile.user_id ?? profile.id,
        token
      );
    } catch {
      // Webhook subscription may fail if already subscribed
    }

    return NextResponse.redirect(new URL("/admin", request.url));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro no login";
    return NextResponse.redirect(
      new URL(`/admin?error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}
