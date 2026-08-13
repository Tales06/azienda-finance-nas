import { AppShell } from "@/components/app-shell";
import { ROLE_LABELS } from "@/lib/constants";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { PasswordField } from "@/components/password-field";
import { DeleteUserDialog } from "@/components/delete-user-dialog";

type UsersPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const user = await requireUser(["ADMIN"]);
  const users = await prisma.user.findMany({
    where: { companyId: user.companyId },
    orderBy: [{ role: "asc" }, { displayName: "asc" }]
  });
  const params = (await searchParams) ?? {};
  const successMessage =
    params.success === "created"
      ? "Utente creato correttamente."
      : params.success === "deleted"
        ? "Utente eliminato correttamente."
        : params.success === "updated"
          ? "Stato utente aggiornato."
          : null;
  const errorDetails = typeof params.details === "string" ? params.details : null;
  const errorMessage =
    params.error === "invalid"
      ? errorDetails
        ? "Controlla questi campi:"
        : "I dati inseriti non sono validi."
      : params.error === "duplicate"
        ? "Lo username è già presente. Scegli un altro nome utente."
        : params.error === "self-delete"
          ? "Non puoi eliminare il tuo account da qui."
          : params.error === "has-dependencies"
            ? "Impossibile eliminare l'utente perché ha movimenti associati."
            : params.error === "notfound"
              ? "Utente non trovato."
              : null;

  return (
    <AppShell
      title="Utenti"
      description="Crea e gestisci gli account interni che possono usare l'app sulla rete locale."
      currentPath="/users"
      user={user}
    >
      {successMessage ? <div className="alert alert-success">{successMessage}</div> : null}
      {errorMessage ? (
        <div className="alert alert-error">
          <div>{errorMessage}</div>
          {errorDetails ? <div style={{ marginTop: 6, fontSize: "0.84rem", opacity: 0.95 }}>{errorDetails}</div> : null}
        </div>
      ) : null}

      <section className="card">
        <div className="section-heading">
          <div>
            <h3>Nuovo utente</h3>
            <p>Nessuna registrazione pubblica: qui puoi creare solo utenti interni autorizzati.</p>
          </div>
        </div>
        <form action="/api/users" method="post" className="form-grid">
          <div className="field">
            <label htmlFor="username">Username</label>
            <input className="input" id="username" name="username" required />
          </div>
          <div className="field">
            <label htmlFor="displayName">Nome visualizzato</label>
            <input className="input" id="displayName" name="displayName" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password iniziale</label>
            <PasswordField id="password" name="password" autoComplete="current-password" required />
          </div>
          <div className="field">
            <label htmlFor="role">Ruolo</label>
            <select className="select" id="role" name="role" defaultValue="OPERATOR">
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Manager</option>
              <option value="OPERATOR">Operatore</option>
              <option value="VIEWER">Lettura</option>
            </select>
          </div>
          <div className="field" style={{ alignSelf: "end" }}>
            <button className="button button-primary" type="submit">Crea utente</button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="section-heading">
          <div>
            <h3>Utenti attivi</h3>
            <p>Puoi sospendere gli accessi senza cancellare la cronologia dei movimenti.</p>
          </div>
        </div>
        {users.length === 0 ? (
          <div className="empty-state">Nessun utente presente.</div>
        ) : (
          <div className="table-wrap">
            <table className="table table-compact">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Username</th>
                  <th>Ruolo</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {users.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.displayName}</td>
                    <td>@{entry.username}</td>
                    <td>{ROLE_LABELS[entry.role]}</td>
                    <td>
                      <span className={`badge ${entry.isActive ? "badge-success" : "badge-warning"}`}>
                        {entry.isActive ? "Attivo" : "Disattivato"}
                      </span>
                    </td>
                    <td>
                      <div className="inline-actions">
                        <form action={`/api/users/${entry.id}/toggle`} method="post" className="inline-actions">
                          <button className={`button ${entry.isActive ? "button-warning" : "button-secondary"}`} type="submit">
                            {entry.isActive ? "Disattiva" : "Riattiva"}
                          </button>
                        </form>
                        <DeleteUserDialog userName={entry.displayName} userId={entry.id} />
                      </div>
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
