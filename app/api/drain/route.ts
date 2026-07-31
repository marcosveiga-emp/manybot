import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { drainQueue } from "@/lib/queue";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await drainQueue();

  return NextResponse.json(result);
}
