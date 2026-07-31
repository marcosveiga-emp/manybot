import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { getMedia } from "@/lib/instagram";

export async function GET() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const selectedId = cookieStore.get("selected_ig_account")?.value;

  let configQuery = db.from("config").select("access_token, instagram_user_id");
  if (selectedId) configQuery = configQuery.eq("instagram_user_id", selectedId);
  const { data: config } = await configQuery.limit(1).maybeSingle();

  if (!config?.access_token || !config?.instagram_user_id) {
    return NextResponse.json({ error: "No Instagram connected" }, { status: 400 });
  }

  try {
    const media = await getMedia(config.instagram_user_id, config.access_token);
    return NextResponse.json(media.data ?? []);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch media" },
      { status: 500 }
    );
  }
}
