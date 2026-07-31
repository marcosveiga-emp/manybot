import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/admin/automations/[id]">
) {
  const { id } = await ctx.params;
  const { data, error } = await db
    .from("automations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json(data);
}

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/admin/automations/[id]">
) {
  const { id } = await ctx.params;
  const body = await request.json();

  const { data, error } = await db
    .from("automations")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/automations/[id]">
) {
  const { id } = await ctx.params;
  const { error } = await db.from("automations").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
