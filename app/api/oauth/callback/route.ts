export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    const desc =
      searchParams.get("error_description") ?? "Autorizacao cancelada.";
    return closePopupPage({ error: desc });
  }

  try {
    const { exchangeCodeForToken, getLongLivedToken, getProfile, subscribeWebhooks } =
      await import("@/lib/instagram");
    const { db } = await import("@/lib/supabase");

    const short = await exchangeCodeForToken(code);
    const shortToken = short.access_token;

    let longToken = shortToken;
    let expiresIn = 5184000;
    try {
      const long = await getLongLivedToken(shortToken);
      if (long.access_token) {
        longToken = long.access_token;
        expiresIn = long.expires_in ?? 5184000;
      }
    } catch (e) {
      console.error("Long token exchange failed, using short token:", e);
    }

    const profile = await getProfile(
      short.user_id ?? "me",
      longToken
    );

    const { error: dbError } = await db.from("config").upsert({
      id: 1,
      access_token: longToken,
      instagram_user_id: profile.user_id ?? profile.id,
      instagram_username: profile.username,
      profile_picture_url: profile.profile_picture_url,
      token_expires_at: new Date(
        Date.now() + expiresIn * 1000
      ).toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (dbError) throw new Error(`DB: ${dbError.message}`);

    try {
      await subscribeWebhooks(profile.user_id ?? profile.id, longToken);
    } catch {
      // subscription may already exist
    }

    return closePopupPage({ success: true, username: profile.username });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro no login";
    return closePopupPage({ error: msg });
  }
}

function closePopupPage({ error, success, username }: { error?: string; success?: boolean; username?: string }) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Manybot OAuth</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#fafafa;color:#18181b}</style>
<script>window.opener?.postMessage(${JSON.stringify({ type: "oauth", error, success, username })}, "*");window.close();</script>
</head><body><p>${error ? "Erro: " + error.replace(/[<>]/g, "") : "Conectado! Fechando..."}</p>
<p style="margin-top:1rem;font-size:.875rem;color:#71717a">Podes fechar esta janela.</p></body></html>`;
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}