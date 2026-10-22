"use client";

import { TideCloakProvider } from "@tidecloak/nextjs";
import { useEffect, useState } from "react";

// Playbook: add-auth-nextjs-fresh Step 4a
// useDPoP goes inside config object (not as a separate JSX prop).
// Enables client-side DPoP proof generation (required for secureFetch).
export function Providers({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    fetch("/tidecloak.json", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("The real Tide adapter has not been exported. Fresh realm setup must complete before sign-in is available.");
        const value = await response.json();
        if (!value.realm || !value.resource || !value.jwk || !value.vendorId || !value["auth-server-url"]) {
          throw new Error("The exported Tide adapter is incomplete. Sign-in remains unavailable.");
        }
        if (!controller.signal.aborted) setConfig(value);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Could not load the Tide adapter.");
      });
    return () => controller.abort();
  }, [attempt]);
  if (!config) return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Recovery Vault — identity setup pending</h1>
      <p role={error ? "alert" : "status"}>{error || "Loading the real Tide configuration…"}</p>
      <p>No authenticated session or approval capability is being simulated.</p>
      {error && <button onClick={() => setAttempt((value) => value + 1)}>Retry configuration</button>}
    </main>
  );
  return (
    <TideCloakProvider
      config={{ ...config, useDPoP: { mode: "strict", alg: "ES256" } }}
    >
      {children}
    </TideCloakProvider>
  );
}
