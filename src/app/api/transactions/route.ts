import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cleanOptional, parseAmountToCents } from "@/lib/format";
import { createAuditLog, getCompany, getLatestExchangeRate } from "@/lib/queries";
import { redirectTo } from "@/lib/redirect";

async function resolveBaseAmount(companyId: string, baseCurrency: string, currencyCode: string, amountCents: number, transactionDate: Date, explicitRate?: number | null) {
  if (currencyCode === baseCurrency) {
    return { amountBaseCents: amountCents, exchangeRate: 1 };
  }

  let rate = explicitRate ?? null;
  if (!rate) {
    const savedRate = await getLatestExchangeRate(companyId, baseCurrency, currencyCode, transactionDate);
    rate = savedRate?.rate ?? null;
  }

  if (!rate) {
    throw new Error(`Manca il tasso di cambio ${currencyCode} → ${baseCurrency}`);
  }

  return {
    exchangeRate: rate,
    amountBaseCents: Math.round(amountCents * rate)
  };
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "MANAGER", "OPERATOR"].includes(user.role)) {
    return redirectTo(request, "/login?error=expired");
  }

  const formData = await request.formData();
  const company = await getCompany(user.companyId);
  const currencyCode = String(formData.get("currencyCode") || company.baseCurrency).toUpperCase();
  const transactionDate = new Date(`${String(formData.get("transactionDate"))}T12:00:00`);
  const amountCents = parseAmountToCents(String(formData.get("amount") || "0"));
  const exchangeRateValue = cleanOptional(formData.get("exchangeRate"));
  const exchangeRate = exchangeRateValue ? Number(exchangeRateValue) : null;
  const { amountBaseCents, exchangeRate: resolvedRate } = await resolveBaseAmount(
    user.companyId,
    company.baseCurrency,
    currencyCode,
    amountCents,
    transactionDate,
    exchangeRate
  );

  const transaction = await prisma.transaction.create({
    data: {
      companyId: user.companyId,
      categoryId: String(formData.get("categoryId")),
      createdById: user.userId,
      type: String(formData.get("type")) as "INCOME" | "EXPENSE",
      amountCents,
      amountBaseCents,
      currencyCode,
      exchangeRate: currencyCode === company.baseCurrency ? null : resolvedRate,
      description: cleanOptional(formData.get("description")),
      paymentMethod: cleanOptional(formData.get("paymentMethod")),
      reference: cleanOptional(formData.get("reference")),
      notes: cleanOptional(formData.get("notes")),
      transactionDate
    }
  });

  await createAuditLog({
    companyId: user.companyId,
    userId: user.userId,
    action: "CREATE",
    entityType: "TRANSACTION",
    entityId: transaction.id,
    description: `Creato movimento ${transaction.id}`
  });

  return redirectTo(request, "/transactions?success=created");
}
