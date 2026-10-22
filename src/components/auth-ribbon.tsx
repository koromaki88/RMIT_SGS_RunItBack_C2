/**
 * Sign-in/out and provider status. Never displays a derived role as identity proof.
 * Explicit simulation account selection is separately labelled by its provider.
 */

"use client";

import { useState } from "react";
import { useAuthStatus } from "./use-auth-status";
import { LockIcon } from "./icons";
import { toUiError, uiErrorHeading } from "./client-api";

type AuthView =
  | { kind: "pending" }
  | { kind: "signedout" }
  | { kind: "signedin"; label: string }
  | { kind: "problem"; heading: string; detail: string };

export function AuthRibbon() {
  const auth = useAuthStatus();
  const [view, setView] = useState<AuthView | null>(null);

  function genuineLabel(): string {
    // Show generic provider status, not an invented personal name or email.
    return "signed in";
  }

  let statusText: string;
  let action: { label: string; onClick: () => void } | null = null;

  if (!auth.providerReady || auth.pending === true) {
    statusText = "Sign-in pending setup";
  } else if (auth.authenticated) {
    statusText = `You are ${genuineLabel()}`;
    action = {
      label: "Sign out",
      onClick: async () => {
        try {
          await auth.signOut();
        } catch (caught) {
          void toUiError(caught).then((err) =>
            setView({ kind: "problem", heading: uiErrorHeading(err), detail: err.message }),
          );
        }
        setView({ kind: "pending" });
      },
    };
  } else {
    statusText = "Signed out";
    action = {
      label: "Sign in",
      onClick: async () => {
        try {
          await auth.signIn();
          setView({ kind: "pending" });
        } catch (caught) {
          void toUiError(caught).then((err) =>
            setView({ kind: "problem", heading: uiErrorHeading(err), detail: err.message }),
          );
        }
      },
    };
  }

  return (
    <>
      <header className="ribbon">
        <div className="ribbon-inner">
          <div>
            <h1><span className="ribbon-lock"><LockIcon size={19} /></span>
              <span aria-hidden="true" className="ribbon-rule" />Dual-Control Recovery Vault</h1>
            <p className="ribbon-sub">
              <span className="company-pill">Harbourline Freight</span>{" "}
              <span style={{ color: "#b9c3d6" }}>demo data only</span>
            </p>
          </div>
          <div className="ribbon-auth">
            <span className="auth-status" data-auth-status={statusText}>
              {statusText}
            </span>
            {action ? (
              <button type="button" className="btn btn-brass" onClick={action.onClick}>
                {action.label}
              </button>
            ) : null}
          </div>
        </div>
      </header>
      {view?.kind === "problem" ? (
        <div className="banner banner-error" role="alert">
          <strong>{view.heading}</strong>
          <p>{view.detail}</p>
        </div>
      ) : null}
    </>
  );
}
