import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/queries";
import { redirectTo } from "@/lib/redirect";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return redirectTo(request, "/login?error=expired");
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return redirectTo(request, "/users?error=notfound");
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !target.isActive }
  });

  await createAuditLog({
    companyId: user.companyId,
    userId: user.userId,
    action: "UPDATE",
    entityType: "USER",
    entityId: updated.id,
    description: `${updated.isActive ? "Riattivato" : "Disattivato"} utente ${updated.username}`
  });

  return redirectTo(request, "/users");
}
