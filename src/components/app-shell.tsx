"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { SessionUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { LogoutForm } from "@/components/logout-form";

type AppShellProps = {
  title: string;
  description?: string;
  currentPath: string;
  user: SessionUser;
  children: React.ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "◈", roles: ["ADMIN", "MANAGER", "OPERATOR", "VIEWER"] },
  { href: "/transactions", label: "Movimenti", icon: "⇄", roles: ["ADMIN", "MANAGER", "OPERATOR", "VIEWER"] },
  { href: "/categories", label: "Categorie", icon: "⊞", roles: ["ADMIN", "MANAGER", "OPERATOR", "VIEWER"] },
  { href: "/reports", label: "Report", icon: "◐", roles: ["ADMIN", "MANAGER", "OPERATOR", "VIEWER"] },
  { href: "/settings", label: "Impostazioni", icon: "⚙", roles: ["ADMIN"] },
  { href: "/users", label: "Utenti", icon: "◉", roles: ["ADMIN"] },
] as const;

export function AppShell({ title, description, currentPath, user, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [currentPath]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  const visibleNav = navItems.filter((item) => (item.roles as readonly string[]).includes(user.role));

  return (
    <div className="layout-shell">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-inner">
          <div className="sidebar-top">
            <div className="brand-card">
              <div className="brand-mark"></div>
              <div>
                <div className="eyebrow">Gestionale NAS</div>
                <h1 className="brand-title">Azienda Finance</h1>
              </div>
            </div>

            <nav className="nav-list" aria-label="Navigazione principale">
              {visibleNav.map((item) => {
                const active =
                  currentPath === item.href || currentPath.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item ${active ? "nav-item-active" : ""}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                    {active && <span className="nav-active-dot" aria-hidden="true" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="sidebar-footer">
            <div className="user-card">
              <div className="user-avatar">{user.displayName.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <p className="user-name">{user.displayName}</p>
                <p className="user-role">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
            <LogoutForm />
          </div>
        </div>
      </aside>

      <div className="main-wrapper">
        <div className="topbar">
          <button
            className="hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Chiudi menu" : "Apri menu"}
            aria-expanded={sidebarOpen}
          >
            <span className={`hamburger-line ${sidebarOpen ? "open" : ""}`} />
            <span className={`hamburger-line ${sidebarOpen ? "open" : ""}`} />
            <span className={`hamburger-line ${sidebarOpen ? "open" : ""}`} />
          </button>
          <div className="topbar-brand">
            <div className="brand-mark brand-mark-sm">AF</div>
            <span className="topbar-title">Azienda Finance</span>
          </div>
          <div className="user-avatar user-avatar-sm topbar-user">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        </div>

        <main className="content">
          <header className="page-header">
            <div>
              <p className="eyebrow">Pannello operativo</p>
              <h2 className="page-title">{title}</h2>
              {description ? <p className="page-description">{description}</p> : null}
            </div>
          </header>
          <div className="content-body">{children}</div>
        </main>
      </div>
    </div>
  );
}
