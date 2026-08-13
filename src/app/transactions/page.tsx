import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CURRENCIES } from "@/lib/constants";
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
  const dateRange = parseDateRange(from, to);
  const transactions = await getTransactions(user.companyId, {
    ...dateRange,
    type,
    categoryId,
    currencyCode
  });
  const summary = buildSummary(transactions);
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (type) query.set("type", type);
  if (categoryId) query.set("categoryId", categoryId);
  if (currencyCode) query.set("currencyCode", currencyCode);
  const exportQuery = query.toString();
  const canEdit = ["ADMIN", "MANAGER", "OPERATOR"].includes(user.role);

  return (
    <AppShell
      title="Movimenti"
      description="Archivio completo delle entrate e delle uscite, con filtri, export ed editing puntuale."
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
          <a className="button button-secondary" href={`/api/export/excel${exportQuery ? `?${exportQuery}` : ""}`}>
            Export Excel
          </a>
          <a className="button button-secondary" href={`/api/export/pdf${exportQuery ? `?${exportQuery}` : ""}`}>
            Export PDF
          </a>
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
          <div className="full-width form-actions">
            <button className="button button-secondary" type="submit">Applica filtri</button>
            <Link className="button button-ghost" href="/transactions">Reset</Link>
          </div>
        </form>
      </section>

      <section className="stat-grid">
        <article className="card stat-card">
          <p className="label">Entrate nel filtro</p>
          <p className="value kpi-positive">{formatCurrency(summary.incomeBaseCents, company.baseCurrency)}</p>
        </article>
        <article className="card stat-card">
          <p className="label">Uscite nel filtro</p>
          <p className="value kpi-negative">{formatCurrency(summary.expenseBaseCents, company.baseCurrency)}</p>
        </article>
        <article className="card stat-card">
          <p className="label">Saldo nel filtro</p>
          <p className={`value ${summary.balanceBaseCents >= 0 ? "kpi-positive" : "kpi-negative"}`}>
            {formatCurrency(summary.balanceBaseCents, company.baseCurrency)}
          </p>
        </article>
        <article className="card stat-card">
          <p className="label">Valuta base</p>
          <p className="value">{company.baseCurrency}</p>
        </article>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <h3>Elenco movimenti</h3>
            <p>Le cifre mostrate sono sempre conservate anche nella valuta base dell'azienda.</p>
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
                  <th>Valuta</th>
                  <th>Importo</th>
                  <th>Base</th>
                  <th>Operatore</th>
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
                      <div className="muted">{item.reference || item.paymentMethod || ""}</div>
                    </td>
                    <td>{item.currencyCode}</td>
                    <td className={item.type === "INCOME" ? "kpi-positive" : "kpi-negative"}>
                      {item.type === "INCOME" ? "+" : "-"}{formatCurrency(item.amountCents, item.currencyCode)}
                    </td>
                    <td>{formatCurrency(item.amountBaseCents, company.baseCurrency)}</td>
                    <td>{item.createdBy.displayName}</td>
                    {canEdit ? (
                      <td>
                        <div className="inline-actions">
                          <Link className="button button-ghost" href={`/transactions/${item.id}/edit`}>
                            Modifica
                          </Link>
                          <form action={`/api/transactions/${item.id}/delete`} method="post">
                            <button className="button button-danger" type="submit">Elimina</button>
                          </form>
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
