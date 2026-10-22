"use client";

import { TideCloakProvider, useTideCloak } from "@tidecloak/nextjs";
import { useEffect, useState } from "react";
import { SimulationProvider, isSimulation } from "../lib/simulation/client";
import { AppAuthContext } from "../lib/tide/app-auth";

function LiveAuthBridge({ children }: { children: React.ReactNode }) {
  const { authenticated, isInitializing, login, logout } = useTideCloak();
  return <AppAuthContext.Provider value={{ authenticated, providerReady: !isInitializing,
    pending: isInitializing, signIn: login, signOut: logout }}>{children}</AppAuthContext.Provider>;
}

// Playbook: add-auth-nextjs-fresh Step 4a
// useDPoP goes inside config object (not as a separate JSX prop).
// Enables client-side DPoP proof generation (required for secureFetch).
export function Providers({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [simulation, setSimulation] = useState<boolean | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    isSimulation().then(async (enabled) => {
      if (!controller.signal.aborted) setSimulation(enabled);
      if (enabled) return null;
      return fetch("/tidecloak.json", { cache: "no-store", signal: controller.signal });
    })
      .then(async (response) => {
        if (!response) return;
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
  if (simulation) return <SimulationProvider>{children}</SimulationProvider>;
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
      <LiveAuthBridge>{children}</LiveAuthBridge>
    </TideCloakProvider>
  );
}
