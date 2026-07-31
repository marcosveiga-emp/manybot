import { createHmac, timingSafeEqual } from "crypto";

export function validateSignature(
  rawBody: string,
  signature: string
): boolean {
  const secret = process.env.INSTAGRAM_APP_SECRET!;
  const hmac = createHmac("sha256", secret);
  const digest = hmac.update(rawBody).digest("hex");
  const expected = `sha256=${digest}`;
  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function generateVerifyToken(): string {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}
