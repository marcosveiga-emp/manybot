const BASE = "https://graph.instagram.com/v26.0";
const TOKEN_BASE = "https://graph.instagram.com";
const API_BASE = "https://api.instagram.com";

async function api(path: string, token: string, options?: RequestInit) {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instagram API error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function exchangeCodeForToken(code: string) {
  const res = await fetch(`${API_BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.INSTAGRAM_APP_ID!,
      client_secret: process.env.INSTAGRAM_APP_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/callback`,
      code,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OAuth error ${res.status}: ${body}`);
  }
  const json = await res.json();
  if (Array.isArray(json.data) && json.data[0]) {
    return {
      access_token: json.data[0].access_token,
      user_id: json.data[0].user_id,
    };
  }
  return json;
}

export async function getLongLivedToken(shortToken: string) {
  const params = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    access_token: shortToken,
  });
  const res = await fetch(`${TOKEN_BASE}/access_token?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function refreshLongLivedToken(token: string) {
  const params = new URLSearchParams({
    grant_type: "ig_refresh_token",
    access_token: token,
  });
  const res = await fetch(`${TOKEN_BASE}/refresh_access_token?${params}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getProfile(igUserId: string, token: string) {
  return api(
    `/${igUserId}?fields=id,username,name,profile_picture_url`,
    token
  );
}

export async function sendMessage(
  igUserId: string,
  token: string,
  body: Record<string, unknown>
) {
  return api(`/${igUserId}/messages`, token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function replyToComment(
  commentId: string,
  token: string,
  message: string
) {
  const res = await fetch(`${BASE}/${commentId}/replies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Reply error ${res.status}: ${body}`);
  }
  return res.json();
}

export async function subscribeWebhooks(igUserId: string, token: string) {
  return api(
    `/${igUserId}/subscribed_apps?subscribed_fields=comments,messages`,
    token,
    { method: "POST" }
  );
}

export async function getMedia(igUserId: string, token: string) {
  return api(
    `/${igUserId}/media?fields=id,media_type,media_url,thumbnail_url,caption,permalink&limit=50`,
    token
  );
}