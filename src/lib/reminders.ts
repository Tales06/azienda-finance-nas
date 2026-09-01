import { prisma } from "@/lib/db";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export async function getPaymentReminders(companyId: string, createdById?: string) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrowEnd = endOfDay(tomorrow);

  const pending = await prisma.transaction.findMany({
    where: {
      companyId,
      settlementStatus: "PENDING",
      ...(createdById ? { createdById } : {})
    },
    include: { category: true },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }]
  });

  const overdue = pending.filter((item) => item.dueDate && item.dueDate < todayStart);
  const dueToday = pending.filter((item) => item.dueDate && item.dueDate >= todayStart && item.dueDate <= todayEnd);
  const dueTomorrow = pending.filter((item) => item.dueDate && item.dueDate > todayEnd && item.dueDate <= tomorrowEnd);
  const withoutDueDate = pending.filter((item) => !item.dueDate);
  const future = pending.filter((item) => item.dueDate && item.dueDate > tomorrowEnd);

  return {
    overdue,
    dueToday,
    dueTomorrow,
    withoutDueDate,
    future,
    pendingCount: pending.length,
    notificationCount: overdue.length + dueToday.length + dueTomorrow.length
  };
}
