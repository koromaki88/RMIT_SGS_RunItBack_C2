/**
 * Agent 3. Sign-in/out and status are the only auth surface in the UI; this
 * component never displays a derived "role" as identity proof and never fakes
 * a signed-in state (03-agent-ui-submission.md T+0–10; 00-coordination.md §5).
 */

"use client";

import { useState } from "react";
import { useAuthStatus } from "./merge-seam";
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
    // MERGE-SWAP note: Agent 1's provider may expose a token-verified label. Until
    // then we show only the generic signed-in word — no invented names/emails.
    return "signed in";
  }

  let statusText: string;
  let action: { label: string; onClick: () => void } | null = null;

  if (!auth.providerReady || auth.pending === true) {
    statusText = "Sign-in pending setup — governance adapter not merged yet";
  } else if (auth.authenticated) {
    statusText = `You are ${genuineLabel()}`;
    action = {
      label: "Sign out",
      onClick: () => {
        try {
          auth.signOut();
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
      onClick: () => {
        try {
          auth.signIn();
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
            <h1>Dual-Control Recovery Vault</h1>
            <p className="ribbon-sub">
              Harbourline Freight <span className="muted">(synthetic company)</span>
            </p>
          </div>
          <div className="ribbon-auth">
            <span className="auth-status" data-auth-status={statusText}>
              {statusText}
            </span>
            {action ? (
              <button type="button" className="btn" onClick={action.onClick}>
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
