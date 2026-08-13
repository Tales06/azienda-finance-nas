import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createAuditLog, getCompany } from "@/lib/queries";
import { exchangeRateSchema } from "@/lib/validation";
import { redirectTo } from "@/lib/redirect";

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return redirectTo(request, "/login?error=expired");
  }

  const formData = await request.formData();
  const parsed = exchangeRateSchema.safeParse({
    quoteCurrency: formData.get("quoteCurrency"),
    rate: formData.get("rate"),
    effectiveDate: formData.get("effectiveDate")
  });

  if (!parsed.success) {
    return redirectTo(request, "/settings?error=rate");
  }

  const company = await getCompany(user.companyId);
  const effectiveDate = new Date(`${parsed.data.effectiveDate}T00:00:00`);

  const rate = await prisma.exchangeRate.upsert({
    where: {
      companyId_baseCurrency_quoteCurrency_effectiveDate: {
        companyId: user.companyId,
        baseCurrency: company.baseCurrency,
        quoteCurrency: parsed.data.quoteCurrency,
        effectiveDate
      }
    },
    update: {
      rate: parsed.data.rate
    },
    create: {
      companyId: user.companyId,
      baseCurrency: company.baseCurrency,
      quoteCurrency: parsed.data.quoteCurrency,
      rate: parsed.data.rate,
      effectiveDate
    }
  });

  await createAuditLog({
    companyId: user.companyId,
    userId: user.userId,
    action: "UPSERT",
    entityType: "EXCHANGE_RATE",
    entityId: rate.id,
    description: `Cambio ${rate.quoteCurrency} → ${rate.baseCurrency}`
  });

  return redirectTo(request, "/settings?success=rate");
}
