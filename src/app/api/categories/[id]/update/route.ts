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
  const formData = await request.formData();
  const toggleActive = String(formData.get("toggleActive") || "true") === "true";

  const updated = await prisma.category.update({
    where: { id },
    data: { isActive: toggleActive }
  });

  await createAuditLog({
    companyId: user.companyId,
    userId: user.userId,
    action: "UPDATE",
    entityType: "CATEGORY",
    entityId: updated.id,
    description: `${toggleActive ? "Riattivata" : "Disattivata"} categoria ${updated.name}`
  });

  return redirectTo(request, "/categories");
}
