import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cleanOptional, parseAmountToCents } from "@/lib/format";
import { createAuditLog, getCompany, getLatestExchangeRate, getTransactionById } from "@/lib/queries";
import { redirectTo } from "@/lib/redirect";
import { parseTransactionDate, parseTransactionDetails } from "@/lib/transaction-input";

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

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteProps) {
  const user = await getSessionUser();
  if (!user || !["ADMIN", "MANAGER", "OPERATOR"].includes(user.role)) {
    return redirectTo(request, "/login?error=expired");
  }

  const { id } = await params;
  const existing = await getTransactionById(id, user.companyId);
  if (!existing) {
    return redirectTo(request, "/transactions?error=notfound");
  }
  if (user.role === "OPERATOR" && existing.createdById !== user.userId) {
    return redirectTo(request, "/transactions?error=unauthorized");
  }

  const formData = await request.formData();
  const company = await getCompany(user.companyId);
  const details = parseTransactionDetails(formData, existing.paymentMethod);
  const currencyCode = String(formData.get("currencyCode") || company.baseCurrency).toUpperCase();
  const transactionDate = parseTransactionDate(formData);
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
  const category = await prisma.category.findFirst({
    where: {
      id: details.categoryId,
      companyId: user.companyId,
      type: { in: [details.type, "BOTH"] }
    }
  });
  if (!category || (!category.isActive && category.id !== existing.categoryId)) {
    return redirectTo(request, `/transactions/${id}/edit?error=invalid_category`);
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      categoryId: details.categoryId,
      type: details.type,
      amountCents,
      amountBaseCents,
      currencyCode,
      exchangeRate: currencyCode === company.baseCurrency ? null : resolvedRate,
      description: cleanOptional(formData.get("description")),
      paymentMethod: details.paymentMethod,
      settlementStatus: details.settlementStatus,
      dueDate: details.dueDate,
      reference: cleanOptional(formData.get("reference")),
      notes: cleanOptional(formData.get("notes")),
      transactionDate
    }
  });

  await createAuditLog({
    companyId: user.companyId,
    userId: user.userId,
    action: "UPDATE",
    entityType: "TRANSACTION",
    entityId: updated.id,
    description: `Aggiornato movimento ${updated.id} (${details.settlementStatus})`
  });

  return redirectTo(request, "/transactions?success=updated");
}
