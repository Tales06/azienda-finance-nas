import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/queries";
import { companySchema } from "@/lib/validation";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return redirectTo(request, "/login?error=expired");
  }

  const formData = await request.formData();
  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    baseCurrency: formData.get("baseCurrency")
  });

  if (!parsed.success) {
    return redirectTo(request, "/settings?error=invalid");
  }

  await prisma.company.update({
    where: { id: user.companyId },
    data: parsed.data
  });

  await createAuditLog({
    companyId: user.companyId,
    userId: user.userId,
    action: "UPDATE",
    entityType: "COMPANY",
    entityId: user.companyId,
    description: "Aggiornate impostazioni azienda"
  });

  return redirectTo(request, "/settings?success=company");
}
