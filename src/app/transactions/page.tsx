import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CURRENCIES, paymentMethodLabel, settlementStatusLabel } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireUser } from "@/lib/guards";
import { getCategories, getCompany, getTransactions } from "@/lib/queries";
import { buildSummary, parseDateRange } from "@/lib/reporting";

type TransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const user = await requireUser();
  const company = await getCompany(user.companyId);
  const categories = await getCategories(user.companyId);
  const params = await searchParams;
  const from = typeof params.from === "string" ? params.from : undefined;
  const to = typeof params.to === "string" ? params.to : undefined;
  const type = typeof params.type === "string" ? params.type : undefined;
  const categoryId = typeof params.categoryId === "string" ? params.categoryId : undefined;
  const currencyCode = typeof params.currencyCode === "string" ? params.currencyCode : undefined;
  const settlementStatus = typeof params.settlementStatus === "string" ? params.settlementStatus : undefined;
  const dateRange = parseDateRange(from, to);
  const transactions = await getTransactions(user.companyId, {
    ...dateRange,
    type,
    categoryId,
    currencyCode,
    settlementStatus,
    createdById: user.role === "OPERATOR" ? user.userId : undefined
  });
  const summary = buildSummary(transactions);
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (type) query.set("type", type);
  if (categoryId) query.set("categoryId", categoryId);
  if (currencyCode) query.set("currencyCode", currencyCode);
  if (settlementStatus) query.set("settlementStatus", settlementStatus);
  const exportQuery = query.toString();
  const canEdit = ["ADMIN", "MANAGER", "OPERATOR"].includes(user.role);
  const canDelete = ["ADMIN", "MANAGER"].includes(user.role);
  const canExport = user.role !== "OPERATOR";
  const isOperator = user.role === "OPERATOR";

  return (
    <AppShell
      title={isOperator ? "I tuoi movimenti" : "Movimenti"}
      description={isOperator ? "Qui puoi inserire e modificare esclusivamente i movimenti creati da te." : "Archivio completo delle entrate e delle uscite, con filtri, export ed editing puntuale."}
      currentPath="/transactions"
      user={user}
    >
      <div className="toolbar">
        <div className="inline-actions">
          {canEdit ? (
            <Link href="/transactions/new" className="button button-primary">
              Nuovo movimento
            </Link>
          ) : null}
          {canExport ? (
            <>
              <a className="button button-secondary" href={`/api/export/excel${exportQuery ? `?${exportQuery}` : ""}`}>
                Export Excel
              </a>
              <a className="button button-secondary" href={`/api/export/pdf${exportQuery ? `?${exportQuery}` : ""}`}>
                Export PDF
              </a>
            </>
          ) : null}
        </div>
        <div className="badge badge-neutral">Totale record: {transactions.length}</div>
      </div>

      <section className="card">
        <form className="filters-grid" method="get">
          <div className="field">
            <label htmlFor="from">Dal</label>
            <input className="input" id="from" type="date" name="from" defaultValue={from ?? dateRange.from.toISOString().slice(0, 10)} />
          </div>
          <div className="field">
            <label htmlFor="to">Al</label>
            <input className="input" id="to" type="date" name="to" defaultValue={to ?? dateRange.to.toISOString().slice(0, 10)} />
          </div>
          <div className="field">
            <label htmlFor="type">Tipo</label>
            <select className="select" id="type" name="type" defaultValue={type ?? ""}>
              <option value="">Tutti</option>
              <option value="INCOME">Entrate</option>
              <option value="EXPENSE">Uscite</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="categoryId">Categoria</label>
            <select className="select" id="categoryId" name="categoryId" defaultValue={categoryId ?? ""}>
              <option value="">Tutte</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="currencyCode">Valuta</label>
            <select className="select" id="currencyCode" name="currencyCode" defaultValue={currencyCode ?? ""}>
              <option value="">Tutte</option>
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="settlementStatus">Stato</label>
            <select className="select" id="settlementStatus" name="settlementStatus" defaultValue={settlementStatus ?? ""}>
              <option value="">Tutti</option>
              <option value="SETTLED">Pagati / incassati</option>
              <option value="PENDING">Da pagare / incassare</option>
            </select>
          </div>
          <div className="full-width form-actions">
            <button className="button button-secondary" type="submit">Applica filtri</button>
            <Link className="button button-ghost" href="/transactions">Reset</Link>
          </div>
        </form>
      </section>

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
          <p className="label">Saldo nel filtro</p>
          <p className={`value ${summary.balanceBaseCents >= 0 ? "kpi-positive" : "kpi-negative"}`}>
            {formatCurrency(summary.balanceBaseCents, company.baseCurrency)}
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

      <section className="card">
        <div className="section-heading">
          <div>
            <h3>Elenco movimenti</h3>
            <p>Il saldo reale considera solo le operazioni già pagate o incassate.</p>
          </div>
        </div>
        {transactions.length === 0 ? (
          <div className="empty-state">Nessun movimento trovato con i filtri correnti.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Descrizione</th>
                  <th>Stato</th>
                  <th>Metodo</th>
                  <th>Valuta</th>
                  <th>Importo</th>
                  <th>Base</th>
                  {!isOperator ? <th>Operatore</th> : null}
                  {canEdit ? <th>Azioni</th> : null}
                </tr>
              </thead>
              <tbody>
                {transactions.map((item) => (
                  <tr key={item.id}>
                    <td>{formatDate(item.transactionDate)}</td>
                    <td>
                      <span className={`badge ${item.type === "INCOME" ? "badge-success" : "badge-danger"}`}>
                        {item.type === "INCOME" ? "Entrata" : "Uscita"}
                      </span>
                    </td>
                    <td>
                      <span className="color-swatch" style={{ backgroundColor: item.category.color }} />
                      {item.category.name}
                    </td>
                    <td>
                      <strong>{item.description || "—"}</strong>
                      <div className="muted">{item.reference || ""}</div>
                    </td>
                    <td>
                      <span className={`badge ${item.settlementStatus === "SETTLED" ? "badge-success" : "badge-warning"}`}>
                        {settlementStatusLabel(item.type, item.settlementStatus)}
                      </span>
                      {item.dueDate ? <div className="muted">Prevista: {formatDate(item.dueDate)}</div> : null}
                    </td>
                    <td>{paymentMethodLabel(item.paymentMethod)}</td>
                    <td>{item.currencyCode}</td>
                    <td className={item.type === "INCOME" ? "kpi-positive" : "kpi-negative"}>
                      {item.type === "INCOME" ? "+" : "-"}{formatCurrency(item.amountCents, item.currencyCode)}
                    </td>
                    <td>{formatCurrency(item.amountBaseCents, company.baseCurrency)}</td>
                    {!isOperator ? <td>{item.createdBy.displayName}</td> : null}
                    {canEdit ? (
                      <td>
                        <div className="inline-actions">
                          <Link className="button button-ghost" href={`/transactions/${item.id}/edit`}>
                            Modifica
                          </Link>
                          {canDelete ? (
                            <form action={`/api/transactions/${item.id}/delete`} method="post">
                              <button className="button button-danger" type="submit">Elimina</button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
