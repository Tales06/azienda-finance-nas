import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@prisma/client";

export const SESSION_COOKIE = "azienda_finance_session";
const ISSUER = "azienda-finance-local";
const AUDIENCE = "azienda-finance-users";

export type SessionUser = {
  userId: string;
  companyId: string;
  username: string;
  displayName: string;
  role: UserRole;
};

function getSecretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET mancante o troppo corto. Usa almeno 32 caratteri.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime("12h")
    .sign(getSecretKey());
}

export async function verifySessionToken(token?: string | null): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE
    });

    return {
      userId: String(payload.userId),
      companyId: String(payload.companyId),
      username: String(payload.username),
      displayName: String(payload.displayName),
      role: String(payload.role) as UserRole
    };
  } catch {
    return null;
  }
}

function shouldUseSecureCookies() {
  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    try {
      return new URL(appUrl).protocol === "https:";
    } catch {
      throw new Error("APP_URL non valido. Usa un URL completo, per esempio http://192.168.1.50:3000.");
    }
  }

  return process.env.NODE_ENV === "production";
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: shouldUseSecureCookies(),
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 12
};
