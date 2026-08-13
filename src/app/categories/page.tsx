import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/guards";
import { getCategories } from "@/lib/queries";

export default async function CategoriesPage() {
  const user = await requireUser();
  const categories = await getCategories(user.companyId);
  const canManage = ["ADMIN", "MANAGER"].includes(user.role);

  return (
    <AppShell
      title="Categorie"
      description="Gestisci le categorie personalizzate per le tue entrate e uscite."
      currentPath="/categories"
      user={user}
    >
      {canManage ? (
        <section className="card">
          <div className="section-heading">
            <div>
              <h3>Nuova categoria</h3>
              <p>Crea una voce personalizzata disponibile sui dispositivi collegati.</p>
            </div>
          </div>
          <form action="/api/categories" method="post" className="form-grid">
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input className="input" id="name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="type">Tipo</label>
              <select className="select" id="type" name="type" defaultValue="EXPENSE">
                <option value="INCOME">Entrate</option>
                <option value="EXPENSE">Uscite</option>
                <option value="BOTH">Entrambe</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="color">Colore</label>
              <input className="input" id="color" name="color" type="color" defaultValue="#2563eb" />
            </div>
            <div className="field" style={{ alignSelf: "end" }}>
              <button className="button button-primary" type="submit">Crea categoria</button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="card">
        <div className="section-heading">
          <div>
            <h3>Elenco categorie</h3>
            <p>Puoi disattivarle o modificarle senza perdere i movimenti storici associati.</p>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="empty-state">Nessuna categoria disponibile.</div>
        ) : (
          <div className="table-wrap">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Stato</th>
                  <th>Colore</th>
                  {canManage ? <th>Azioni</th> : null}
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <span className="color-swatch" style={{ backgroundColor: category.color }} />
                      {category.name}
                    </td>
                    <td>{category.type}</td>
                    <td>
                      <span className={`badge ${category.isActive ? "badge-success" : "badge-warning"}`}>
                        {category.isActive ? "Attiva" : "Disattivata"}
                      </span>
                    </td>
                    <td>{category.color}</td>
                    {canManage ? (
                      <td>
                        <form action={`/api/categories/${category.id}/update`} method="post" className="inline-actions">
                          <input type="hidden" name="toggleActive" value={category.isActive ? "false" : "true"} />
                          <button className="button button-warning" type="submit">
                            {category.isActive ? "Disattiva" : "Riattiva"}
                          </button>
                        </form>
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
