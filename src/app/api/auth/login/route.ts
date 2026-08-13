import { NextRequest } from "next/server";
import { createSessionToken, sessionCookieOptions, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/crypto";
import { createAuditLog } from "@/lib/queries";
import { loginSchema } from "@/lib/validation";
import { redirectTo as createRedirect } from "@/lib/redirect";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const redirectTo = String(formData.get("redirectTo") || "/dashboard");
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password")
  });

  if (!parsed.success) {
    return createRedirect(request, "/login?error=invalid");
  }

  const normalizedUsername = parsed.data.username.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { username: normalizedUsername },
    include: { company: true }
  });

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return createRedirect(request, "/login?error=invalid");
  }

  if (!user.isActive) {
    return createRedirect(request, "/login?error=inactive");
  }

  const token = await createSessionToken({
    userId: user.id,
    companyId: user.companyId,
    username: user.username,
    displayName: user.displayName,
    role: user.role
  });

  await createAuditLog({
    companyId: user.companyId,
    userId: user.id,
    action: "LOGIN",
    entityType: "USER",
    entityId: user.id,
    description: `Login di ${user.username}`
  });

  const safeRedirect = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard";
  const response = createRedirect(request, safeRedirect);
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return response;
}
