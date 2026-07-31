import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function GET() {
  const results: Record<string, unknown> = {};

  try {
    const { data, error } = await db
      .from("config")
      .select("id")
      .eq("id", 1)
      .single();
    results.read = error ? `ERROR: ${error.message}` : "OK";
    results.data = data;
  } catch (e) {
    results.read = `EXCEPTION: ${e instanceof Error ? e.message : "unknown"}`;
  }

  try {
    const { error } = await db.from("config").upsert({
      id: 1,
      updated_at: new Date().toISOString(),
    });
    results.write = error ? `ERROR: ${error.message}` : "OK";
  } catch (e) {
    results.write = `EXCEPTION: ${e instanceof Error ? e.message : "unknown"}`;
  }

  return NextResponse.json(results);
}