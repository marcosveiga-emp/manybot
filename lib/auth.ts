import { createHmac } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_session";

function hashPassword(pw: string): string {
  const secret = process.env.INSTAGRAM_APP_SECRET ?? "fallback-secret";
  return createHmac("sha256", secret).update(pw).digest("hex");
}

export function validatePassword(password: string): boolean {
  const adminPw = process.env.ADMIN_PASSWORD;
  if (!adminPw) return true;
  return password === adminPw;
}

export function createSessionToken(): string {
  const adminPw = process.env.ADMIN_PASSWORD ?? "default";
  return hashPassword(adminPw);
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME);
  if (!token) return false;
  const expected = createSessionToken();
  return token.value === expected;
}

export async function requireAuth(): Promise<boolean> {
  const authed = await getSession();
  return authed;
}

export function getSetCookieHeader(): string {
  const token = createSessionToken();
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`;
}

export function getClearCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
