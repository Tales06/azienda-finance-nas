export function LogoutForm() {
  return (
    <form action="/api/auth/logout" method="post">
      <button className="button button-secondary button-full" type="submit">
        Esci
      </button>
    </form>
  );
}
