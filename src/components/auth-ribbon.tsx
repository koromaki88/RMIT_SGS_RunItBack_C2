/**
 * Agent 3. The sticky institutional header: product voice, company pill, and the
 * only auth surface in the UI. It never displays a derived "role" as identity
 * proof and never fakes a signed-in state (03-agent-ui-submission.md T+0–10).
 */

"use client";

import { useState } from "react";
import { LockIcon } from "./icons";
import { toUiError, uiErrorHeading } from "./client-api";
import { useAuthStatus, type AuthStatus } from "./merge-seam";

type AuthView = { kind: "problem"; heading: string; detail: string } | null;

export function AuthRibbon() {
  const auth: AuthStatus & { signIn: () => void; signOut: () => void } = useAuthStatus();
  const [view, setView] = useState<AuthView>(null);

  let statusText: string;
  let action: { label: string; onClick: () => void } | null = null;

  if (!auth.providerReady || auth.pending === true) {
    statusText = "Sign-in pending setup";
  } else if (auth.authenticated) {
    statusText = "You are signed in";
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
      },
    };
  } else {
    statusText = "Signed out";
    action = {
      label: "Sign in",
      onClick: () => {
        try {
          auth.signIn();
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
            <h1>
              <span className="ribbon-lock">
                <LockIcon size={19} />
              </span>
              <span aria-hidden="true" className="ribbon-rule" />
              Dual-Control Recovery Vault
            </h1>
            <p className="ribbon-sub">
              <span className="company-pill">Harbourline Freight</span>
              {" "}
              <span style={{ color: "#b9c3d6" }}>demo data only</span>
            </p>
          </div>
          <div className="ribbon-auth">
            <span className="auth-status">{statusText}</span>
            {action ? (
              <button type="button" className="btn btn-brass" onClick={action.onClick}>
                {action.label}
              </button>
            ) : null}
          </div>
        </div>
      </header>
      {view ? (
        <div style={{ maxWidth: 980, margin: "0.6rem auto 0", padding: "0 1.4rem" }}>
          <div className="banner banner-error" role="alert">
            <strong>{view.heading}</strong>
            <p>{view.detail}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
