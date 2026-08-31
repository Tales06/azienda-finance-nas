import type { Prisma } from "@prisma/client";

export type TransactionWithRelations = Prisma.TransactionGetPayload<{
  include: {
    category: true;
    createdBy: {
      select: {
        id: true;
        username: true;
        displayName: true;
      };
    };
  };
}>;

export function getDefaultDateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from, to };
}

export function parseDateRange(inputFrom?: string, inputTo?: string) {
  const fallback = getDefaultDateRange();
  const from = inputFrom ? new Date(`${inputFrom}T00:00:00`) : fallback.from;
  const fallbackTo = fallback.to.toISOString().slice(0, 10);
  const to = inputTo ? new Date(`${inputTo}T23:59:59`) : new Date(`${fallbackTo}T23:59:59`);
  return { from, to };
}

export function buildSummary(transactions: TransactionWithRelations[]) {
  const settledTransactions = transactions.filter((item) => item.settlementStatus === "SETTLED");
  const pendingTransactions = transactions.filter((item) => item.settlementStatus === "PENDING");
  const incomeBaseCents = settledTransactions
    .filter((item) => item.type === "INCOME")
    .reduce((sum, item) => sum + item.amountBaseCents, 0);
  const expenseBaseCents = settledTransactions
    .filter((item) => item.type === "EXPENSE")
    .reduce((sum, item) => sum + item.amountBaseCents, 0);
  return {
    incomeBaseCents,
    expenseBaseCents,
    balanceBaseCents: incomeBaseCents - expenseBaseCents,
    count: settledTransactions.length,
    totalCount: transactions.length,
    pendingCount: pendingTransactions.length,
    pendingIncomeBaseCents: pendingTransactions
      .filter((item) => item.type === "INCOME")
      .reduce((sum, item) => sum + item.amountBaseCents, 0),
    pendingExpenseBaseCents: pendingTransactions
      .filter((item) => item.type === "EXPENSE")
      .reduce((sum, item) => sum + item.amountBaseCents, 0)
  };
}

export function buildCategoryBreakdown(transactions: TransactionWithRelations[], type: "INCOME" | "EXPENSE") {
  const map = new Map<string, { name: string; value: number; color: string }>();
  for (const item of transactions.filter((entry) => entry.settlementStatus === "SETTLED" && entry.type === type)) {
    const key = item.categoryId;
    const existing = map.get(key);
    if (existing) {
      existing.value += item.amountBaseCents;
    } else {
      map.set(key, {
        name: item.category.name,
        value: item.amountBaseCents,
        color: item.category.color
      });
    }
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

export function buildMonthlySeries(transactions: TransactionWithRelations[]) {
  const map = new Map<string, { month: string; income: number; expense: number; balance: number }>();

  for (const item of transactions.filter((entry) => entry.settlementStatus === "SETTLED")) {
    const date = new Date(item.transactionDate);
    const key = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
    const existing = map.get(key) ?? { month: key, income: 0, expense: 0, balance: 0 };
    if (item.type === "INCOME") {
      existing.income += item.amountBaseCents / 100;
    } else {
      existing.expense += item.amountBaseCents / 100;
    }
    existing.balance = Number((existing.income - existing.expense).toFixed(2));
    map.set(key, existing);
  }

  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function buildCurrencyBreakdown(transactions: TransactionWithRelations[]) {
  const map = new Map<string, { currency: string; originalCents: number; baseCents: number; count: number }>();
  for (const item of transactions.filter((entry) => entry.settlementStatus === "SETTLED")) {
    const existing = map.get(item.currencyCode) ?? {
      currency: item.currencyCode,
      originalCents: 0,
      baseCents: 0,
      count: 0
    };
    existing.originalCents += item.amountCents;
    existing.baseCents += item.amountBaseCents;
    existing.count += 1;
    map.set(item.currencyCode, existing);
  }
  return [...map.values()].sort((a, b) => b.baseCents - a.baseCents);
}

export function previousPeriod(from: Date, to: Date) {
  const duration = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - duration);
  return { from: previousFrom, to: previousTo };
}
