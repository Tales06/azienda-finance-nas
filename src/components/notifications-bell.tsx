"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NotificationSummary = {
  count: number;
  overdue: number;
  dueToday: number;
  dueTomorrow: number;
};

export function NotificationsBell() {
  const [summary, setSummary] = useState<NotificationSummary | null>(null);

  useEffect(() => {
    fetch("/api/notifications", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setSummary(data))
      .catch(() => setSummary(null));
  }, []);

  const count = summary?.count ?? 0;

  return (
    <details className="notification-bell">
      <summary aria-label="Apri notifiche scadenze" title="Scadenze">
        <span aria-hidden="true">🔔</span>
        {count > 0 ? <span className="notification-count">{count > 99 ? "99+" : count}</span> : null}
      </summary>
      <div className="notification-popover">
        <strong>Scadenze</strong>
        {summary ? (
          count > 0 ? (
            <div className="notification-lines">
              {summary.overdue > 0 ? <span>{summary.overdue} scaduta{summary.overdue === 1 ? "" : "e"}</span> : null}
              {summary.dueToday > 0 ? <span>{summary.dueToday} prevista{summary.dueToday === 1 ? "" : "e"} oggi</span> : null}
              {summary.dueTomorrow > 0 ? <span>{summary.dueTomorrow} prevista{summary.dueTomorrow === 1 ? "" : "e"} domani</span> : null}
            </div>
          ) : <p>Nessuna scadenza urgente.</p>
        ) : <p>Impossibile leggere le scadenze.</p>}
        <Link className="button button-secondary" href="/notifications">Apri scadenze</Link>
      </div>
    </details>
  );
}
