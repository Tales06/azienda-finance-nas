import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export { SESSION_COOKIE, createSessionToken, sessionCookieOptions, verifySessionToken, type SessionUser } from "@/lib/session";

export async function getSessionUser() {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
