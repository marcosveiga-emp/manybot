import { NextResponse } from "next/server";
import { validatePassword, getSetCookieHeader } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = await request.json();

  if (!validatePassword(password)) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", getSetCookieHeader());
  return res;
}
