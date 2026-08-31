import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/auth";

export async function requireUser(roles?: UserRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  if (roles && !roles.includes(user.role)) {
    redirect(user.role === "OPERATOR" ? "/transactions/new?error=unauthorized" : "/dashboard?error=unauthorized");
  }
  return user;
}
