import { AppShell } from "@/components/app-shell";
import { DashboardCharts } from "@/components/dashboard-charts";
import { requireUser } from "@/lib/guards";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCompany, getTransactions } from "@/lib/queries";
import { buildCategoryBreakdown, buildMonthlySeries, buildSummary, previousPeriod, parseDateRange } from "@/lib/reporting";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser(["ADMIN", "MANAGER", "VIEWER"]);
  const company = await getCompany(user.companyId);
  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : undefined;
  const to = typeof params.to === "string" ? params.to : undefined;
  const dateRange = parseDateRange(from, to);
  const transactions = await getTransactions(user.companyId, dateRange);
  const summary = buildSummary(transactions);
  const chartsData = {
    monthlySeries: buildMonthlySeries(transactions),
    expensesByCategory: buildCategoryBreakdown(transactions, "EXPENSE"),
    incomesByCategory: buildCategoryBreakdown(transactions, "INCOME")
  };
  const prevRange = previousPeriod(dateRange.from, dateRange.to);
  const previousSummary = buildSummary(await getTransactions(user.companyId, prevRange));
  const balanceDelta = summary.balanceBaseCents - previousSummary.balanceBaseCents;
  const recentTransactions = transactions.slice(0, 8);

  return (
    <AppShell
      title="Dashboard"
      description="Panoramica immediata di entrate, uscite, saldo e trend dell'azienda."
      currentPath="/dashboard"
      user={user}
    >
      <div className="toolbar">
        <div className="muted">
          Periodo: <strong>{formatDate(dateRange.from)}</strong> — <strong>{formatDate(dateRange.to)}</strong>
        </div>
        <form className="inline-actions" method="get">
          <input className="input" type="date" name="from" defaultValue={from ?? dateRange.from.toISOString().slice(0, 10)} />
          <input className="input" type="date" name="to" defaultValue={to ?? dateRange.to.toISOString().slice(0, 10)} />
          <button className="button button-secondary" type="submit">Aggiorna</button>
        </form>
      </div>

      <section className="stat-grid">
        <article className="card stat-card">
          <p className="label">Entrate reali</p>
          <p className="value kpi-positive">{formatCurrency(summary.incomeBaseCents, company.baseCurrency)}</p>
        </article>
        <article className="card stat-card">
          <p className="label">Uscite reali</p>
          <p className="value kpi-negative">{formatCurrency(summary.expenseBaseCents, company.baseCurrency)}</p>
        </article>
        <article className="card stat-card">
          <p className="label">Saldo netto</p>
          <p className={`value ${summary.balanceBaseCents >= 0 ? "kpi-positive" : "kpi-negative"}`}>
            {formatCurrency(summary.balanceBaseCents, company.baseCurrency)}
          </p>
        </article>
        <article className="card stat-card">
          <p className="label">Delta vs periodo precedente</p>
          <p className={`value ${balanceDelta >= 0 ? "kpi-positive" : "kpi-negative"}`}>
            {formatCurrency(balanceDelta, company.baseCurrency)}
          </p>
        </article>
        <article className="card stat-card">
          <p className="label">Da incassare</p>
          <p className="value kpi-positive">{formatCurrency(summary.pendingIncomeBaseCents, company.baseCurrency)}</p>
        </article>
        <article className="card stat-card">
          <p className="label">Da pagare</p>
          <p className="value kpi-negative">{formatCurrency(summary.pendingExpenseBaseCents, company.baseCurrency)}</p>
        </article>
      </section>

      <DashboardCharts
        monthlySeries={chartsData.monthlySeries}
        expensesByCategory={chartsData.expensesByCategory}
        incomesByCategory={chartsData.incomesByCategory}
        baseCurrency={company.baseCurrency}
      />

      <div className="grid two-columns">
        <section className="card">
          <div className="section-heading">
            <div>
              <h3>Ultimi movimenti</h3>
              <p>Le registrazioni più recenti inserite dagli operatori.</p>
            </div>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="empty-state">Nessun movimento nel periodo selezionato.</div>
          ) : (
            <div className="mini-list">
              {recentTransactions.map((item) => (
                <div className="mini-row" key={item.id}>
                  <div>
                    <strong>{item.description || item.category.name}</strong>
                    <div className="muted">
                      {formatDate(item.transactionDate)} · {item.category.name} · {item.createdBy.displayName}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={item.type === "INCOME" ? "kpi-positive" : "kpi-negative"}>
                      {item.type === "INCOME" ? "+" : "-"}{formatCurrency(item.amountCents, item.currencyCode)}
                    </div>
                    {item.currencyCode !== company.baseCurrency ? (
                      <div className="muted">Base: {formatCurrency(item.amountBaseCents, company.baseCurrency)}</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <h3>Stato operativo</h3>
              <p>Indicazioni rapide per il team.</p>
            </div>
          </div>
          <div className="mini-list">
            <div className="mini-row">
              <span>Valuta base aziendale</span>
              <strong>{company.baseCurrency}</strong>
            </div>
            <div className="mini-row">
              <span>Movimenti saldati nel periodo</span>
              <strong>{summary.count}</strong>
            </div>
            <div className="mini-row">
              <span>Movimenti in attesa</span>
              <strong>{summary.pendingCount}</strong>
            </div>
            <div className="mini-row">
              <span>Accesso attuale</span>
              <strong>{user.displayName}</strong>
            </div>
            <div className="mini-row">
              <span>Ruolo</span>
              <strong>{user.role}</strong>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
