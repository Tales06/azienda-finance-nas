import { getSessionUser } from "@/lib/auth";
import { PasswordField } from "@/components/password-field";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message =
    error === "invalid"
      ? "Credenziali non valide."
      : error === "inactive"
        ? "Utente disattivato."
        : error === "expired"
          ? "Sessione scaduta. Effettua di nuovo il login."
          : "";
  const redirectTo = typeof params.from === "string" ? params.from : "/dashboard";

  return (
    <div className="login-page">
      <div className="login-card">
        <p className="eyebrow">Locale · Multi-dispositivo · NAS</p>
        <h1 className="login-title">Azienda Finance</h1>
        <p className="login-subtitle">
          Accedi al pannello per registrare movimenti, vedere grafici, esportare report e gestire utenti.
        </p>

        {message ? <div className="alert alert-error">{message}</div> : null}

        <form action="/api/auth/login" method="post" className="stack">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div className="field">
            <label htmlFor="username">Username</label>
            <input className="input" id="username" name="username" autoComplete="username" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <PasswordField id="password" name="password" autoComplete="current-password" required />
          </div>
          <button className="button button-primary button-full" type="submit">
            Accedi
          </button>
        </form>

        <p className="small-note" style={{ marginTop: 16 }}>
          Nessuna registrazione pubblica: gli utenti vengono creati solo da un amministratore.
        </p>
      </div>
    </div>
  );
}
