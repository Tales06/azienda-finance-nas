import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type TransactionFilters = {
  from?: Date;
  to?: Date;
  type?: string;
  categoryId?: string;
  currencyCode?: string;
  settlementStatus?: string;
  createdById?: string;
};

export async function getCompany(companyId: string) {
  return prisma.company.findUniqueOrThrow({ where: { id: companyId } });
}

export async function getCategories(companyId: string) {
  return prisma.category.findMany({
    where: { companyId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }]
  });
}

export function buildTransactionWhere(companyId: string, filters: TransactionFilters): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { companyId };

  if (filters.type === "INCOME" || filters.type === "EXPENSE") {
    where.type = filters.type;
  }
  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }
  if (filters.currencyCode) {
    where.currencyCode = filters.currencyCode;
  }
  if (filters.settlementStatus === "PENDING" || filters.settlementStatus === "SETTLED") {
    where.settlementStatus = filters.settlementStatus;
  }
  if (filters.createdById) {
    where.createdById = filters.createdById;
  }
  if (filters.from || filters.to) {
    where.transactionDate = {};
    if (filters.from) {
      where.transactionDate.gte = filters.from;
    }
    if (filters.to) {
      where.transactionDate.lte = filters.to;
    }
  }
  return where;
}

export async function getTransactions(companyId: string, filters: TransactionFilters = {}) {
  return prisma.transaction.findMany({
    where: buildTransactionWhere(companyId, filters),
    include: {
      category: true,
      createdBy: {
        select: {
          id: true,
          username: true,
          displayName: true
        }
      }
    },
    orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }]
  });
}

export async function getTransactionById(id: string, companyId: string, createdById?: string) {
  return prisma.transaction.findFirst({
    where: { id, companyId, ...(createdById ? { createdById } : {}) },
    include: {
      category: true,
      createdBy: {
        select: {
          id: true,
          username: true,
          displayName: true
        }
      }
    }
  });
}

export async function getLatestExchangeRate(companyId: string, baseCurrency: string, quoteCurrency: string, effectiveDate: Date) {
  return prisma.exchangeRate.findFirst({
    where: {
      companyId,
      baseCurrency,
      quoteCurrency,
      effectiveDate: { lte: effectiveDate }
    },
    orderBy: { effectiveDate: "desc" }
  });
}

export async function createAuditLog(params: {
  companyId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  return prisma.auditLog.create({
    data: {
      companyId: params.companyId,
      userId: params.userId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      description: params.description ?? null,
      metadata: params.metadata
    }
  });
}
