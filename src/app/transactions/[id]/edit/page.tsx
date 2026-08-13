import { notFound } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CURRENCIES } from "@/lib/constants";
import { requireUser } from "@/lib/guards";
import { formatDateInput } from "@/lib/format";
import { getCategories, getCompany, getTransactionById } from "@/lib/queries";

type EditTransactionPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditTransactionPage({ params }: EditTransactionPageProps) {
  const user = await requireUser(["ADMIN", "MANAGER", "OPERATOR"]);
  const { id } = await params;
  const [company, categories, transaction] = await Promise.all([
    getCompany(user.companyId),
    getCategories(user.companyId),
    getTransactionById(id, user.companyId)
  ]);

  if (!transaction) {
    notFound();
  }

  return (
    <AppShell
      title="Modifica movimento"
      description="Aggiorna importi, categoria, descrizione o tasso di cambio della registrazione selezionata."
      currentPath="/transactions"
      user={user}
    >
      <section className="card">
        <form action={`/api/transactions/${transaction.id}/update`} method="post" className="stack">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="type">Tipo</label>
              <select className="select" id="type" name="type" defaultValue={transaction.type}>
                <option value="INCOME">Entrata</option>
                <option value="EXPENSE">Uscita</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="transactionDate">Data</label>
              <input className="input" id="transactionDate" type="date" name="transactionDate" defaultValue={formatDateInput(transaction.transactionDate)} required />
            </div>
            <div className="field">
              <label htmlFor="categoryId">Categoria</label>
              <select className="select" id="categoryId" name="categoryId" defaultValue={transaction.categoryId} required>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="currencyCode">Valuta</label>
              <select className="select" id="currencyCode" name="currencyCode" defaultValue={transaction.currencyCode}>
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} · {currency.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="amount">Importo</label>
              <input className="input" id="amount" name="amount" defaultValue={(transaction.amountCents / 100).toFixed(2).replace(".", ",")} required />
            </div>
            <div className="field">
              <label htmlFor="exchangeRate">Tasso verso {company.baseCurrency}</label>
              <input className="input" id="exchangeRate" name="exchangeRate" type="number" step="0.000001" defaultValue={transaction.exchangeRate ?? undefined} />
            </div>
            <div className="field full-width">
              <label htmlFor="description">Descrizione</label>
              <input className="input" id="description" name="description" defaultValue={transaction.description ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="paymentMethod">Metodo pagamento</label>
              <input className="input" id="paymentMethod" name="paymentMethod" defaultValue={transaction.paymentMethod ?? ""} />
            </div>
            <div className="field">
              <label htmlFor="reference">Riferimento</label>
              <input className="input" id="reference" name="reference" defaultValue={transaction.reference ?? ""} />
            </div>
            <div className="field full-width">
              <label htmlFor="notes">Note</label>
              <textarea className="textarea" id="notes" name="notes" defaultValue={transaction.notes ?? ""} />
            </div>
          </div>
          <div className="form-actions">
            <button className="button button-primary" type="submit">Aggiorna movimento</button>
            <Link className="button button-ghost" href="/transactions">Torna alla lista</Link>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
