"use client";
import { useEffect, useState } from "react";
import { AppAuthContext } from "../tide/app-auth";
type Actor = { id: string; name: string; trustee: boolean };
type State = { actor: Actor | null; actors: Actor[]; roles: string[]; threshold: number };
let mode: Promise<boolean> | undefined;
export function isSimulation(): Promise<boolean> {
  return mode ??= fetch("/api/runtime", { cache: "no-store" }).then(async (r) => {
    if (!r.ok) throw new Error("Runtime configuration unavailable");
    return (await r.json()).mode === "simulation";
  });
}
export async function simulationCall(body: Record<string, unknown>) {
  const response = await fetch("/api/simulation", {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Simulation refused the action.");
  return data;
}
export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [epoch, setEpoch] = useState(0);
  async function reload() {
    const response = await fetch("/api/simulation", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not read simulated session.");
    setState(await response.json());
  }
  useEffect(() => { void reload().catch((e) => setError(e.message)); }, []);
  async function act(body: Record<string, unknown>) {
    setBusy(true); setError("");
    try { await simulationCall(body); await reload(); setEpoch((n) => n + 1); }
    catch (e) { setError(e instanceof Error ? e.message : "Simulation unavailable"); }
    finally { setBusy(false); }
  }
  return <AppAuthContext.Provider value={{
    authenticated: !!state?.actor, providerReady: !!state, pending: !state,
    signIn: async () => { await act({ action: "select", actorId: "operator" }); },
    signOut: async () => { await act({ action: "logout" }); },
  }}>
    <aside style={{ position: "sticky", top: 0, zIndex: 10000, background: "#fff0b9", color: "#332600", padding: "12px 20px", borderBottom: "3px solid #ad7400" }}>
      <strong>LOCAL SIMULATION — NO TIDE CRYPTOGRAPHIC GOVERNANCE VERIFIED</strong>
      <p style={{ margin: "4px 0" }}>Sign-in, roles and 2-of-3 approvals are simulated server-side. Archive bytes and purge transactions are real, synthetic data. All demo actors are controlled locally.</p>
      <label>Demo account: <select disabled={busy} value={state?.actor?.id || ""} onChange={(e) => { void act(e.target.value ? { action: "select", actorId: e.target.value } : { action: "logout" }); }}>
        <option value="">Signed out</option>
        {state?.actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}{actor.trustee ? " (trustee)" : " (member)"}</option>)}
      </select></label>{" "}
      <button disabled={busy || !state?.actor} onClick={() => { void act({ action: "refresh" }); }}>Refresh simulated role claims</button>
      <span> {state?.roles.length || 0} operation entitlement(s) in this session</span>
      {error && <p role="alert">{error}</p>}
    </aside>
    <div key={`${state?.actor?.id || "signed-out"}:${epoch}`}>{children}</div>
  </AppAuthContext.Provider>;
}
