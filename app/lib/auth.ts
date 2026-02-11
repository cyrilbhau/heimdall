import { cookies } from "next/headers";
import crypto from "crypto";

const ADMIN_SESSION_COOKIE = "admin_session";
const ADMIN_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 8; // 8 hours

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }
  return secret;
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD;
}

export function createAdminSessionToken() {
  const secret = getSessionSecret();
  const issuedAt = Date.now().toString();
  const hmac = crypto.createHmac("sha256", secret).update(issuedAt).digest("hex");
  return `${issuedAt}.${hmac}`;
}

export function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token) return false;
  const [issuedAtStr, signature] = token.split(".");
  if (!issuedAtStr || !signature) return false;

  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt)) return false;

  // Optional: enforce max age based on timestamp as a backup in case cookie maxAge changes.
  if (Date.now() - issuedAt > ADMIN_SESSION_MAX_AGE_MS) {
    return false;
  }

  const secret = getSessionSecret();
  const expectedHmac = crypto.createHmac("sha256", secret).update(issuedAtStr).digest("hex");

  const expectedBuf = Buffer.from(expectedHmac, "hex");
  const receivedBuf = Buffer.from(signature, "hex");

  if (expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}

