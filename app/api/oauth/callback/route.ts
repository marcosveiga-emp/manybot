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

  const logs: string[] = [];

  try {
    logs.push("1. Trocando code por token curto...");
    const short = await exchangeCodeForToken(code);
    logs.push("OK: short token obtido");

    logs.push("2. Trocando por token longo...");
    const long = await getLongLivedToken(short.access_token);
    logs.push("OK: long token obtido");

    logs.push("3. Buscando perfil...");
    const profile = await getProfile(
      short.user_id ?? long.user_id,
      long.access_token
    );
    logs.push(`OK: perfil=${profile.username}`);

    logs.push("4. Salvando no banco...");
    const { error: dbError } = await db.from("config").upsert({
      id: 1,
      access_token: long.access_token,
      instagram_user_id: profile.user_id ?? profile.id,
      instagram_username: profile.username,
      profile_picture_url: profile.profile_picture_url,
      token_expires_at: new Date(
        Date.now() + (long.expires_in ?? 5184000) * 1000
      ).toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (dbError) {
      logs.push(`ERRO DB: ${dbError.message}`);
      throw new Error(`DB: ${dbError.message}`);
    }
    logs.push("OK: salvo no banco");

    logs.push("5. Inscrevendo webhooks...");
    try {
      await subscribeWebhooks(profile.user_id ?? profile.id, long.access_token);
      logs.push("OK: webhooks inscritos");
    } catch (e) {
      logs.push(`AVISO: webhook subscription falhou: ${e instanceof Error ? e.message : "erro"}`);
    }

    return NextResponse.redirect(new URL("/admin", request.url));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro no login";
    return NextResponse.redirect(
      new URL(`/admin?error=${encodeURIComponent(msg)}`, request.url)
    );
  }
}