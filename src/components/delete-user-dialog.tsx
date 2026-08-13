"use client";

import { useEffect, useRef, useState } from "react";

type DeleteUserDialogProps = {
  userName: string;
  userId: string;
};

export function DeleteUserDialog({ userName, userId }: DeleteUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus il bottone "Annulla" appena il dialog si apre
    cancelButtonRef.current?.focus();

    // Chiudi con Esc
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        className="button button-danger icon-button icon-button-danger"
        type="button"
        aria-label={`Elimina ${userName}`}
        title={`Elimina ${userName}`}
        onClick={() => setIsOpen(true)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>

      {isOpen ? (
        <div
          className="modal-backdrop dud-backdrop"
          role="presentation"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="modal-card dud-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-icon dud-icon-glow">
              <div className="dud-icon-wobble">
                <svg
                  className="dud-icon-svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" className="dud-icon-ring" />
                  <rect x="10.85" y="6" width="2.3" height="8" rx="1.15" className="dud-icon-mark" />
                  <circle cx="12" cy="17" r="1.35" className="dud-icon-mark" />
                </svg>
              </div>
            </div>

            <h3 id="delete-user-title">Eliminare questo utente?</h3>
            <p>
              Stai per eliminare <strong>{userName}</strong>.
              Questa azione è irreversibile e rimuoverà l’accesso dell’account.
            </p>
            <div className="modal-actions">
              <button
                ref={cancelButtonRef}
                className="button button-secondary"
                type="button"
                onClick={() => setIsOpen(false)}
              >
                Annulla
              </button>
              <form action={`/api/users/${userId}/delete`} method="post">
                <button className="button button-danger" type="submit">
                  Elimina
                </button>
              </form>
            </div>
          </div>

          <style jsx>{`
            .dud-backdrop {
              animation: dud-fade-in 0.18s ease-out both;
            }

            .dud-card {
              animation: dud-card-in 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.15) both;
              transform-origin: center bottom;
            }

            .dud-icon-glow {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 72px;
              height: 72px;
              border-radius: 9999px;
              animation: dud-icon-in 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both,
                dud-glow-pulse 2.2s ease-in-out 0.85s infinite;
            }

            .dud-icon-wobble {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 44px;
              height: 44px;
              transform-origin: 50% 85%;
              animation: dud-wobble 1.6s ease-in-out 0.85s infinite;
            }

            .dud-icon-svg {
              width: 44px;
              height: 44px;
              display: block;
            }

            .dud-icon-ring {
              stroke: var(--color-danger, #e5484d);
              stroke-width: 1.6;
              fill: color-mix(in srgb, var(--color-danger, #e5484d) 12%, transparent);
            }

            .dud-icon-mark {
              fill: var(--color-danger, #e5484d);
            }

            @keyframes dud-fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
            }

            @keyframes dud-card-in {
              0% { opacity: 0; transform: scale(0.72) translateY(28px); }
              55% { opacity: 1; transform: scale(1.04) translateY(-4px); }
              75% { transform: scale(0.98) translateY(1px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }

            @keyframes dud-icon-in {
              0% { opacity: 0; transform: scale(0) rotate(-110deg); }
              50% { opacity: 1; transform: scale(1.25) rotate(8deg); }
              70% { transform: scale(0.9) rotate(-5deg); }
              85% { transform: scale(1.05) rotate(2deg); }
              100% { opacity: 1; transform: scale(1) rotate(0deg); }
            }

            @keyframes dud-wobble {
              0%, 100% { transform: rotate(-9deg); }
              50% { transform: rotate(9deg); }
            }

            @keyframes dud-glow-pulse {
              0%, 100% {
                box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-danger, #e5484d) 45%, transparent);
              }
              50% {
                box-shadow: 0 0 0 10px color-mix(in srgb, var(--color-danger, #e5484d) 0%, transparent),
                  0 0 24px 6px color-mix(in srgb, var(--color-danger, #e5484d) 40%, transparent);
              }
            }

            @media (prefers-reduced-motion: reduce) {
              .dud-backdrop,
              .dud-card,
              .dud-icon-glow,
              .dud-icon-wobble {
                animation: none;
              }
            }
          `}</style>
        </div>
      ) : null}
    </>
  );
}