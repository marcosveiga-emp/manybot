import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { cookies } from "next/headers";

async function getSelectedAccount() {
  const cookieStore = await cookies();
  const selectedId = cookieStore.get("selected_ig_account")?.value;
  let configQuery = db.from("config").select("instagram_user_id");
  if (selectedId) configQuery = configQuery.eq("instagram_user_id", selectedId);
  const { data } = await configQuery.limit(1).maybeSingle();
  return data?.instagram_user_id ?? null;
}

export async function GET() {
  const igUserId = await getSelectedAccount();

  let query = db.from("automations").select("*").order("created_at", { ascending: false });
  if (igUserId) query = query.eq("instagram_user_id", igUserId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const igUserId = await getSelectedAccount();
  if (!igUserId) {
    return NextResponse.json({ error: "Nenhuma conta Instagram selecionada" }, { status: 400 });
  }

  const body = await request.json();
  const { data, error } = await db
    .from("automations")
    .insert({ ...body, instagram_user_id: igUserId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
