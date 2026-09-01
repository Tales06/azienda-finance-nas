import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPaymentReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const reminders = await getPaymentReminders(
    user.companyId,
    user.role === "OPERATOR" ? user.userId : undefined
  );

  return NextResponse.json({
    count: reminders.notificationCount,
    overdue: reminders.overdue.length,
    dueToday: reminders.dueToday.length,
    dueTomorrow: reminders.dueTomorrow.length
  });
}
