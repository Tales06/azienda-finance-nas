import { AppShell } from "@/components/app-shell";
import { CURRENCIES } from "@/lib/constants";
import { formatDateInput, formatPercent } from "@/lib/format";
import { requireUser } from "@/lib/guards";
import { getCompany } from "@/lib/queries";
import { prisma } from "@/lib/db";

export default async function SettingsPage() {
  const user = await requireUser(["ADMIN"]);
  const [company, rates] = await Promise.all([
    getCompany(user.companyId),
    prisma.exchangeRate.findMany({
      where: { companyId: user.companyId },
      orderBy: [{ quoteCurrency: "asc" }, { effectiveDate: "desc" }]
    })
  ]);

  return (
    <AppShell
      title="Impostazioni"
      description="Configura azienda, valuta base e tassi di cambio storici per la conversione dei movimenti."
      currentPath="/settings"
      user={user}
    >
      <section className="card">
        <div className="section-heading">
          <div>
            <h3>Anagrafica azienda</h3>
            <p>Questa valuta viene usata per il reporting consolidato.</p>
          </div>
        </div>
        <form action="/api/settings/company" method="post" className="form-grid">
          <div className="field">
            <label htmlFor="name">Nome azienda</label>
            <input className="input" id="name" name="name" defaultValue={company.name} required />
          </div>
          <div className="field">
            <label htmlFor="baseCurrency">Valuta base</label>
            <select className="select" id="baseCurrency" name="baseCurrency" defaultValue={company.baseCurrency}>
              {CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} · {currency.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ alignSelf: "end" }}>
            <button className="button button-primary" type="submit">Salva impostazioni</button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <h3>Tassi di cambio</h3>
            <p>Se non inserisci un cambio manuale nel movimento, l'app usa il più recente disponibile prima della data della transazione.</p>
          </div>
        </div>
        <form action="/api/settings/rates" method="post" className="form-grid">
          <div className="field">
            <label htmlFor="quoteCurrency">Valuta da convertire</label>
            <select className="select" id="quoteCurrency" name="quoteCurrency" defaultValue="USD">
              {CURRENCIES.filter((currency) => currency.code !== company.baseCurrency).map((currency) => (
                <option key={currency.code} value={currency.code}>{currency.code}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rate">Tasso verso {company.baseCurrency}</label>
            <input className="input" id="rate" name="rate" type="number" step="0.000001" required />
          </div>
          <div className="field">
            <label htmlFor="effectiveDate">Data validità</label>
            <input className="input" id="effectiveDate" name="effectiveDate" type="date" defaultValue={formatDateInput(new Date())} required />
          </div>
          <div className="field" style={{ alignSelf: "end" }}>
            <button className="button button-primary" type="submit">Aggiungi cambio</button>
          </div>
        </form>

        <div style={{ height: 16 }} />

        {rates.length === 0 ? (
          <div className="empty-state">Nessun tasso di cambio salvato.</div>
        ) : (
          <div className="table-wrap">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Da</th>
                  <th>A</th>
                  <th>Tasso</th>
                  <th>Validità</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((rate) => (
                  <tr key={rate.id}>
                    <td>{rate.quoteCurrency}</td>
                    <td>{rate.baseCurrency}</td>
                    <td>{formatPercent(rate.rate)}</td>
                    <td>{formatDateInput(rate.effectiveDate)}</td>
                    <td>
                      <form action={`/api/settings/rates/${rate.id}/delete`} method="post">
                        <button className="button button-danger" type="submit">Elimina</button>
                      </form>
                    </td>
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
