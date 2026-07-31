import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { drainQueue } from "@/lib/queue";

export async function POST(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: config } = await db
    .from("config")
    .select("access_token")
    .eq("id", 1)
    .single();

  if (!config?.access_token) {
    return NextResponse.json({ error: "No token configured" }, { status: 400 });
  }

  const result = await drainQueue(config.access_token);

  return NextResponse.json(result);
}
