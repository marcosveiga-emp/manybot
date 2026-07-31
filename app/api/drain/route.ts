import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { drainQueue } from "@/lib/queue";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Drain queue for ALL connected accounts
  const { data: accounts } = await db
    .from("config")
    .select("access_token, instagram_user_id")
    .not("access_token", "is", null);

  if (!accounts?.length) {
    return NextResponse.json({ error: "No accounts configured" }, { status: 400 });
  }

  let totalSent = 0;
  let totalFailed = 0;

  for (const account of accounts) {
    if (!account.access_token) continue;
    const result = await drainQueue(account.access_token);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return NextResponse.json({ sent: totalSent, failed: totalFailed });
}
