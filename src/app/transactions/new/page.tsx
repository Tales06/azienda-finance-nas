import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { CURRENCIES } from "@/lib/constants";
import { requireUser } from "@/lib/guards";
import { formatDateInput } from "@/lib/format";
import { getCategories, getCompany } from "@/lib/queries";

export default async function NewTransactionPage() {
  const user = await requireUser(["ADMIN", "MANAGER", "OPERATOR"]);
  const [company, categories] = await Promise.all([
    getCompany(user.companyId),
    getCategories(user.companyId)
  ]);

  return (
    <AppShell
      title="Nuovo movimento"
      description="Registra una nuova entrata o uscita e, se serve, un tasso di cambio dedicato."
      currentPath="/transactions"
      user={user}
    >
      <section className="card">
        <form action="/api/transactions" method="post" className="stack">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="type">Tipo</label>
              <select className="select" id="type" name="type" defaultValue="EXPENSE">
                <option value="INCOME">Entrata</option>
                <option value="EXPENSE">Uscita</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="transactionDate">Data</label>
              <input className="input" id="transactionDate" type="date" name="transactionDate" defaultValue={formatDateInput(new Date())} required />
            </div>
            <div className="field">
              <label htmlFor="categoryId">Categoria</label>
              <select className="select" id="categoryId" name="categoryId" required>
                {categories.filter((category) => category.isActive).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="currencyCode">Valuta</label>
              <select className="select" id="currencyCode" name="currencyCode" defaultValue={company.baseCurrency}>
                {CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} · {currency.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="amount">Importo</label>
              <input className="input" id="amount" name="amount" placeholder="1234,56" required />
            </div>
            <div className="field">
              <label htmlFor="exchangeRate">Tasso verso {company.baseCurrency}</label>
              <input className="input" id="exchangeRate" name="exchangeRate" type="number" step="0.000001" placeholder="Lascia vuoto se stessa valuta o presente nei cambi salvati" />
            </div>
            <div className="field full-width">
              <label htmlFor="description">Descrizione</label>
              <input className="input" id="description" name="description" placeholder="Fattura marzo, canone affitto, incasso POS..." />
            </div>
            <div className="field">
              <label htmlFor="paymentMethod">Metodo pagamento</label>
              <input className="input" id="paymentMethod" name="paymentMethod" placeholder="Bonifico, contanti, POS..." />
            </div>
            <div className="field">
              <label htmlFor="reference">Riferimento</label>
              <input className="input" id="reference" name="reference" placeholder="Numero fattura, ordine, ecc." />
            </div>
            <div className="field full-width">
              <label htmlFor="notes">Note</label>
              <textarea className="textarea" id="notes" name="notes" placeholder="Informazioni aggiuntive opzionali" />
            </div>
          </div>
          <div className="form-actions">
            <button className="button button-primary" type="submit">Salva movimento</button>
            <Link className="button button-ghost" href="/transactions">Annulla</Link>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
