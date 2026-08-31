import { AppShell } from "@/components/app-shell";
import { DashboardCharts } from "@/components/dashboard-charts";
import { formatCurrency, formatDate, formatDateInput } from "@/lib/format";
import { requireUser } from "@/lib/guards";
import { getCompany, getTransactions } from "@/lib/queries";
import { buildCategoryBreakdown, buildCurrencyBreakdown, buildMonthlySeries, buildSummary, parseDateRange } from "@/lib/reporting";

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const user = await requireUser(["ADMIN", "MANAGER", "VIEWER"]);
  const company = await getCompany(user.companyId);
  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : undefined;
  const to = typeof params.to === "string" ? params.to : undefined;
  const dateRange = parseDateRange(from, to);
  const transactions = await getTransactions(user.companyId, dateRange);
  const summary = buildSummary(transactions);
  const expensesByCategory = buildCategoryBreakdown(transactions, "EXPENSE");
  const incomesByCategory = buildCategoryBreakdown(transactions, "INCOME");
  const monthlySeries = buildMonthlySeries(transactions);
  const currencyBreakdown = buildCurrencyBreakdown(transactions);
  const exportQuery = new URLSearchParams({
    from: from ?? formatDateInput(dateRange.from),
    to: to ?? formatDateInput(dateRange.to)
  }).toString();

  return (
    <AppShell
      title="Report e statistiche"
      description="Analisi sintetica e dettagliata dei movimenti aziendali, pronta per esportazione e controllo manageriale."
      currentPath="/reports"
      user={user}
    >
      <div className="toolbar">
        <form className="inline-actions" method="get">
          <input className="input" type="date" name="from" defaultValue={from ?? formatDateInput(dateRange.from)} />
          <input className="input" type="date" name="to" defaultValue={to ?? formatDateInput(dateRange.to)} />
          <button className="button button-secondary" type="submit">Aggiorna report</button>
        </form>
        <div className="inline-actions">
          <a className="button button-secondary" href={`/api/export/excel?${exportQuery}`}>Excel</a>
          <a className="button button-secondary" href={`/api/export/pdf?${exportQuery}`}>PDF</a>
        </div>
      </div>

      <section className="stat-grid">
        <article className="card stat-card">
          <p className="label">Periodo analizzato</p>
          <p className="value">{formatDate(dateRange.from)} → {formatDate(dateRange.to)}</p>
        </article>
        <article className="card stat-card">
          <p className="label">Entrate reali</p>
          <p className="value kpi-positive">{formatCurrency(summary.incomeBaseCents, company.baseCurrency)}</p>
        </article>
        <article className="card stat-card">
          <p className="label">Uscite reali</p>
          <p className="value kpi-negative">{formatCurrency(summary.expenseBaseCents, company.baseCurrency)}</p>
        </article>
        <article className="card stat-card">
          <p className="label">Saldo finale</p>
          <p className={`value ${summary.balanceBaseCents >= 0 ? "kpi-positive" : "kpi-negative"}`}>
            {formatCurrency(summary.balanceBaseCents, company.baseCurrency)}
          </p>
        </article>
        <article className="card stat-card">
          <p className="label">Entrate da pagare</p>
          <p className="value kpi-positive">{formatCurrency(summary.pendingIncomeBaseCents, company.baseCurrency)}</p>
        </article>
        <article className="card stat-card">
          <p className="label">Uscite da pagare</p>
          <p className="value kpi-negative">{formatCurrency(summary.pendingExpenseBaseCents, company.baseCurrency)}</p>
        </article>
      </section>

      <DashboardCharts
        monthlySeries={monthlySeries}
        expensesByCategory={expensesByCategory}
        incomesByCategory={incomesByCategory}
        baseCurrency={company.baseCurrency}
      />

      <div className="grid two-columns">
        <section className="card">
          <div className="section-heading">
            <div>
              <h3>Breakdown per valuta</h3>
              <p>Importi originali e convertiti in valuta base.</p>
            </div>
          </div>
          {currencyBreakdown.length === 0 ? (
            <div className="empty-state">Nessun dato disponibile per il periodo selezionato.</div>
          ) : (
            <div className="table-wrap">
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Valuta</th>
                    <th>Movimenti</th>
                    <th>Totale originale</th>
                    <th>Totale base</th>
                  </tr>
                </thead>
                <tbody>
                  {currencyBreakdown.map((item) => (
                    <tr key={item.currency}>
                      <td>{item.currency}</td>
                      <td>{item.count}</td>
                      <td>{formatCurrency(item.originalCents, item.currency)}</td>
                      <td>{formatCurrency(item.baseCents, company.baseCurrency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <h3>Top categorie di spesa</h3>
              <p>Classifica ordinata delle voci che assorbono più budget.</p>
            </div>
          </div>
          {expensesByCategory.length === 0 ? (
            <div className="empty-state">Nessuna spesa nel periodo selezionato.</div>
          ) : (
            <div className="mini-list">
              {expensesByCategory.slice(0, 8).map((item) => (
                <div className="mini-row" key={item.name}>
                  <div>
                    <span className="color-swatch" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </div>
                  <strong>{formatCurrency(item.value, company.baseCurrency)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
