import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireUser } from "@/lib/guards";
import { getCompany } from "@/lib/queries";
import { getPaymentReminders } from "@/lib/reminders";

export default async function NotificationsPage() {
  const user = await requireUser();
  const company = await getCompany(user.companyId);
  const reminders = await getPaymentReminders(
    user.companyId,
    user.role === "OPERATOR" ? user.userId : undefined
  );

  const sections = [
    { title: "Scadute", description: "Richiedono attenzione immediata.", items: reminders.overdue, tone: "badge-danger" },
    { title: "In scadenza oggi", description: "Da incassare o pagare entro oggi.", items: reminders.dueToday, tone: "badge-warning" },
    { title: "In scadenza domani", description: "Promemoria per la giornata successiva.", items: reminders.dueTomorrow, tone: "badge-info" },
    { title: "Senza data", description: "Movimenti senza una data prevista.", items: reminders.withoutDueDate, tone: "badge-neutral" },
    { title: "Più avanti", description: "Scadenze previste dopo domani.", items: reminders.future, tone: "badge-info" }
  ];

  return (
    <AppShell
      title="Scadenze e notifiche"
      description="Promemoria per le entrate da incassare e le uscite da pagare."
      currentPath="/notifications"
      user={user}
    >
      <div className="toolbar">
        <div className="badge badge-neutral">Movimenti in attesa: {reminders.pendingCount}</div>
        <Link className="button button-secondary" href="/transactions?all=1&settlementStatus=PENDING">Vedi tutti i movimenti da pagare</Link>
      </div>

      <div className="grid two-columns">
        {sections.map((section) => (
          <section className="card" key={section.title}>
            <div className="section-heading">
              <div>
                <h3>{section.title}</h3>
                <p>{section.description}</p>
              </div>
              <span className={`badge ${section.tone}`}>{section.items.length}</span>
            </div>
            {section.items.length === 0 ? <p className="muted">Nessun movimento in questa sezione.</p> : (
              <div className="mini-list">
                {section.items.map((item) => (
                  <div className="mini-row" key={item.id}>
                    <div>
                      <strong>{item.description || item.category.name}</strong>
                      <div className="muted">
                        {item.type === "INCOME" ? "Entrata da incassare" : "Uscita da pagare"}
                        {item.dueDate ? ` · ${formatDate(item.dueDate)}` : ""}
                      </div>
                    </div>
                    <strong className={item.type === "INCOME" ? "kpi-positive" : "kpi-negative"}>
                      {item.type === "INCOME" ? "+" : "-"}{formatCurrency(item.amountCents, item.currencyCode)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </AppShell>
  );
}
