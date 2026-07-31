import { NextResponse } from "next/server";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const clientId = process.env.INSTAGRAM_APP_ID!;
  const redirectUri = `${baseUrl}/api/oauth/callback`;
  const scope =
    "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments";

  const url = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;

  return NextResponse.redirect(url);
}
