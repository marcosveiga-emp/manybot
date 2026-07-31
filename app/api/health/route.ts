import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    app: "manybot",
    env: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      INSTAGRAM_APP_ID: !!process.env.INSTAGRAM_APP_ID,
      INSTAGRAM_APP_SECRET: !!process.env.INSTAGRAM_APP_SECRET,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      WEBHOOK_VERIFY_TOKEN: !!process.env.WEBHOOK_VERIFY_TOKEN,
      ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD,
      CRON_SECRET: !!process.env.CRON_SECRET,
    },
    verifyToken: process.env.WEBHOOK_VERIFY_TOKEN
      ? process.env.WEBHOOK_VERIFY_TOKEN.slice(0, 4) + "..."
      : "NOT SET",
    timestamp: new Date().toISOString(),
  });
}
