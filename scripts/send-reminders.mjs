import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const publishUrl = process.env.NTFY_PUBLISH_URL?.replace(/\/$/, "");
const topic = process.env.NTFY_TOPIC?.trim();
const accessToken = process.env.NTFY_ACCESS_TOKEN?.trim();

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

async function publish(companyName, overdue, today, tomorrow) {
  const parts = [];
  if (overdue > 0) parts.push(`${overdue} scaduta${overdue === 1 ? "" : "e"}`);
  if (today > 0) parts.push(`${today} prevista${today === 1 ? "" : "e"} oggi`);
  if (tomorrow > 0) parts.push(`${tomorrow} prevista${tomorrow === 1 ? "" : "e"} domani`);

  const response = await fetch(`${publishUrl}/${encodeURIComponent(topic)}`, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Title": "Scadenze Azienda Finance",
      "Priority": overdue > 0 ? "4" : "3",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: `${companyName}: ${parts.join(", ")}. Apri Azienda Finance per i dettagli.`
  });

  if (!response.ok) {
    throw new Error(`ntfy ha risposto ${response.status}: ${await response.text()}`);
  }
}

try {
  if (!publishUrl || !topic || !accessToken) {
    console.log("Notifiche telefono non configurate: imposta NTFY_PUBLISH_URL, NTFY_TOPIC e NTFY_ACCESS_TOKEN nel file .env.");
    process.exitCode = 0;
  } else {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrowEnd = endOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    const pending = await prisma.transaction.findMany({
      where: { settlementStatus: "PENDING", dueDate: { not: null, lte: tomorrowEnd } },
      include: { company: true }
    });

    const byCompany = new Map();
    for (const item of pending) {
      const current = byCompany.get(item.companyId) ?? { name: item.company.name, overdue: 0, today: 0, tomorrow: 0 };
      if (item.dueDate < todayStart) current.overdue += 1;
      else if (item.dueDate <= todayEnd) current.today += 1;
      else current.tomorrow += 1;
      byCompany.set(item.companyId, current);
    }

    for (const reminder of byCompany.values()) {
      await publish(reminder.name, reminder.overdue, reminder.today, reminder.tomorrow);
    }
    console.log(byCompany.size ? `Inviati avvisi per ${byCompany.size} azienda/e.` : "Nessuna scadenza urgente da notificare.");
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
