"use client";
import { useEffect, useState } from "react";
import { AppAuthContext } from "../tide/app-auth";
import { RefreshIcon, ShieldIcon } from "../../components/icons";
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
  const [notice, setNotice] = useState("");
  async function reload() {
    const response = await fetch("/api/simulation", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not read simulated session.");
    setState(await response.json());
  }
  useEffect(() => { void reload().catch((e) => setError(e.message)); }, []);
  async function act(body: Record<string, unknown>) {
    setBusy(true); setError(""); setNotice("");
    try {
      await simulationCall(body); await reload(); setEpoch((n) => n + 1);
      setNotice(body.action === "refresh" ? "Simulated role claims refreshed." : body.action === "logout" ? "Signed out of the demo." : "Demo account switched. Views refreshed.");
    }
    catch (e) { setError(e instanceof Error ? e.message : "Simulation unavailable"); }
    finally { setBusy(false); }
  }
  return <AppAuthContext.Provider value={{
    authenticated: !!state?.actor, providerReady: !!state, pending: !state,
    signIn: async () => { await act({ action: "select", actorId: "operator" }); },
    signOut: async () => { await act({ action: "logout" }); },
  }}>
    <aside className="simulation-panel" aria-label="Local simulation controls">
      <div className="simulation-inner">
        <div className="simulation-disclosure">
          <ShieldIcon size={18} />
          <div><strong>Local simulation <span>· No Tide cryptographic governance verified</span></strong>
            <p>Sign-in, roles and 2-of-3 votes are simulated. Archive bytes and purge transactions are real, synthetic data. All demo actors are controlled locally.</p>
          </div>
        </div>
        <div className="simulation-controls" aria-busy={busy}>
          <label className="account-picker">Acting as
            <select disabled={busy || !state} value={state?.actor?.id || ""} onChange={(e) => { void act(e.target.value ? { action: "select", actorId: e.target.value } : { action: "logout" }); }}>
              <option value="">Signed out</option>
              {state?.actors.map((actor) => <option key={actor.id} value={actor.id}>{actor.name}{actor.trustee ? " (trustee)" : " (member)"}</option>)}
            </select>
          </label>
          <div className="claims-control">
            <button type="button" className={`btn btn-ghost${busy ? " is-busy" : ""}`} disabled={busy || !state?.actor} onClick={() => { void act({ action: "refresh" }); }}>
              <RefreshIcon size={16} /> Refresh simulated role claims
            </button>
            <span className="control-hint">After approvals, load newly granted permissions.</span>
          </div>
          <span className="claims-count"><strong>{state?.roles.length || 0}</strong> scoped grant{state?.roles.length === 1 ? "" : "s"} in session</span>
        </div>
        {notice && <p className="simulation-notice" role="status">{notice}</p>}
        {error && <p className="simulation-error" role="alert">{error}</p>}
      </div>
    </aside>
    <div key={`${state?.actor?.id || "signed-out"}:${epoch}`}>{children}</div>
  </AppAuthContext.Provider>;
}
