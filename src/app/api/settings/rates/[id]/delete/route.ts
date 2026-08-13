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
  await prisma.exchangeRate.delete({ where: { id } });
  await createAuditLog({
    companyId: user.companyId,
    userId: user.userId,
    action: "DELETE",
    entityType: "EXCHANGE_RATE",
    entityId: id,
    description: `Eliminato cambio ${id}`
  });
  return redirectTo(request, "/settings");
}
