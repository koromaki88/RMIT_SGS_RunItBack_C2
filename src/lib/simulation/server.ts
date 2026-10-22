import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { NextRequest } from "next/server";
import type { JWTPayload } from "jose";
import { getRequest, getVault } from "../vault/core";

export const SIM_ISSUER = "urn:recovery-vault:local-simulation";
export const SIM_CLIENT = "local-simulation-client";
export const actors = [
  { id: "operator", name: "Demo Operator", trustee: false },
  { id: "trustee-a", name: "Demo Trustee A", trustee: true },
  { id: "trustee-b", name: "Demo Trustee B", trustee: true },
  { id: "trustee-c", name: "Demo Trustee C", trustee: true },
];
const cookieName = "vault_simulation_session";
let database: DatabaseSync | undefined;
export function simulationEnabled() { return process.env.AUTH_MODE === "simulation"; }
export function simulationDb() {
  if (!simulationEnabled()) throw new Error("Simulation is disabled");
  if (!database) {
    const path = process.env.SIMULATION_DATA_DIR || join(process.cwd(), "data", "simulation");
    mkdirSync(path, { recursive: true, mode: 0o700 });
    database = new DatabaseSync(join(path, "governance.sqlite"));
    database.exec(`PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, actor TEXT NOT NULL, roles TEXT NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS changes (id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, recipient TEXT NOT NULL, entitlement TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS approvals (change_id TEXT NOT NULL, actor TEXT NOT NULL, PRIMARY KEY(change_id, actor));`);
  }
  return database;
}
export function simulationRequestAllowed(req: NextRequest) {
  if (!simulationEnabled()) return false;
  const host = req.headers.get("host");
  if (host !== "localhost:3000" && host !== "127.0.0.1:3000") return false;
  if (!["GET", "HEAD"].includes(req.method)) {
    const origin = req.headers.get("origin");
    if (origin !== "http://localhost:3000" && origin !== "http://127.0.0.1:3000") return false;
  }
  return true;
}
type SessionRow = { id: string; actor: string; roles: string; expires: number };
export function session(req: NextRequest): SessionRow | null {
  const id = req.cookies.get(cookieName)?.value;
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return null;
  const row = simulationDb().prepare("SELECT * FROM sessions WHERE id = ? AND expires > ?").get(id, Date.now()) as SessionRow | undefined;
  return row || null;
}
export function simulatedClaims(req: NextRequest): JWTPayload | null {
  if (!simulationRequestAllowed(req)) return null;
  const row = session(req);
  const actor = actors.find((entry) => entry.id === row?.actor);
  if (!row || !actor) return null;
  return { iss: SIM_ISSUER, sub: actor.id, azp: SIM_CLIENT, aud: SIM_CLIENT,
    exp: Math.floor(row.expires / 1000), iat: Math.floor(Date.now() / 1000),
    realm_access: { roles: JSON.parse(row.roles) },
    resource_access: actor.trustee ? { "realm-management": { roles: ["tide-realm-admin"] } } : {},
  };
}
function activeRoles(actor: string) {
  return (simulationDb().prepare(`SELECT entitlement FROM changes c WHERE recipient = ?
    AND (SELECT COUNT(*) FROM approvals a WHERE a.change_id = c.id) >= 2`).all(actor) as { entitlement: string }[]).map((r) => r.entitlement);
}
export function sessionResponse(req: NextRequest) {
  const row = session(req);
  return { simulation: true, actor: actors.find((entry) => entry.id === row?.actor) || null,
    actors, roles: row ? JSON.parse(row.roles) : [], threshold: 2 };
}
export function selectActor(actorId: unknown) {
  const actor = actors.find((entry) => entry.id === actorId);
  if (!actor) throw new Error("Choose one of the fixed simulation actors.");
  const id = randomBytes(32).toString("hex");
  simulationDb().prepare("INSERT INTO sessions VALUES (?, ?, ?, ?)").run(id, actor.id, JSON.stringify(activeRoles(actor.id)), Date.now() + 2 * 60 * 60 * 1000);
  return `${cookieName}=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=7200`;
}
export function refreshSession(req: NextRequest) {
  const row = session(req);
  if (!row) throw new Error("Select a demo actor first.");
  simulationDb().prepare("UPDATE sessions SET roles = ? WHERE id = ?").run(JSON.stringify(activeRoles(row.actor)), row.id);
}
export function signOut(req: NextRequest) {
  const row = session(req);
  if (row) simulationDb().prepare("DELETE FROM sessions WHERE id = ?").run(row.id);
  return `${cookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
export function propose(req: NextRequest, requestId: string) {
  const claims = simulatedClaims(req);
  const actor = actors.find((a) => a.id === claims?.sub);
  if (!actor?.trustee) throw new Error("Only simulated trustees may propose a grant.");
  const frozen = getRequest(getVault(), requestId);
  if (frozen.state !== "FILED" || frozen.manifest.requester.issuer !== SIM_ISSUER) throw new Error("Request is expired, executed or not from the simulation.");
  const db = simulationDb();
  db.prepare("INSERT OR IGNORE INTO changes VALUES (?, ?, ?, ?)").run(randomUUID(), frozen.requestId, frozen.manifest.executorSubject, frozen.entitlement);
  return db.prepare("SELECT id FROM changes WHERE request_id = ?").get(requestId) as { id: string };
}
export function observe(changeId: string) {
  const db = simulationDb();
  const row = db.prepare("SELECT * FROM changes WHERE id = ?").get(changeId) as { request_id: string } | undefined;
  if (!row) throw new Error("Unknown simulated change.");
  const count = (db.prepare("SELECT COUNT(*) AS count FROM approvals WHERE change_id = ?").get(changeId) as { count: number }).count;
  return { changeRequestId: changeId, status: count >= 2 ? "APPROVED" : "PENDING", authorizationCount: count, threshold: 2 };
}
export function approve(req: NextRequest, changeId: string) {
  const claims = simulatedClaims(req);
  if (!actors.find((a) => a.id === claims?.sub)?.trustee) throw new Error("Only simulated trustees may approve.");
  const row = simulationDb().prepare("SELECT request_id FROM changes WHERE id = ?").get(changeId) as { request_id: string } | undefined;
  if (!row || getRequest(getVault(), row.request_id).state !== "FILED") throw new Error("Unknown, expired or executed request.");
  // Unique (change_id, actor) is the server-side repeat-vote guard.
  simulationDb().prepare("INSERT OR IGNORE INTO approvals VALUES (?, ?)").run(changeId, String(claims!.sub));
  return observe(changeId);
}
