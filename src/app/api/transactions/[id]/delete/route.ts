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
  if (!user || !["ADMIN", "MANAGER"].includes(user.role)) {
    return redirectTo(request, "/login?error=expired");
  }

  const { id } = await params;
  const deleted = await prisma.transaction.deleteMany({ where: { id, companyId: user.companyId } });
  if (deleted.count === 0) {
    return redirectTo(request, "/transactions?error=notfound");
  }
  await createAuditLog({
    companyId: user.companyId,
    userId: user.userId,
    action: "DELETE",
    entityType: "TRANSACTION",
    entityId: id,
    description: `Eliminato movimento ${id}`
  });
  return redirectTo(request, "/transactions?success=deleted");
}
