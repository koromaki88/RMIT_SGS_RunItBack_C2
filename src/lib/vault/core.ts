// Agent 2: archive store, canonical manifest, and the one-time purge transaction.
// Pure server code (Node built-ins only) so it runs under Next.js and directly under
// `node --test` with type stripping. Authentication is NOT done here: callers pass claims
// that Agent 1's withAuth has already verified (signature, issuer, azp, DPoP binding).
import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ArchiveObject, GovernanceLink, PurgeManifest, PurgeRequest } from "./contract";

export const VAULT_ID = "harbourline-demo";
export const MANIFEST_SCHEMA = "vault-purge-v1";
export const REQUEST_TTL_MS = 30 * 60 * 1000;
export const MAX_BODY_BYTES = 4096;
export const ENTITLEMENT_PREFIX = "vault-purge:";
const MAX_LINKS = 10;

export class VaultError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const SHA256_RE = /^[0-9a-f]{64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ISO_MS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const OBJECT_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const LINK_FIELD_RE = /^[A-Za-z0-9._:-]{1,128}$/;
function hasControlChar(s: string): boolean {
  for (const ch of s) {
    const c = ch.codePointAt(0) as number;
    if (c < 0x20 || (c >= 0x7f && c <= 0x9f) || c === 0x2028 || c === 0x2029) return true;
  }
  return false;
}

export function sha256Hex(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// ---------------------------------------------------------------- canonical manifest

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function exactKeys(v: unknown, keys: string[], where: string): Record<string, unknown> {
  if (!isPlainObject(v)) throw new VaultError(400, "INVALID_SCHEMA", `${where} must be an object`);
  const got = Object.keys(v).sort();
  const want = [...keys].sort();
  if (got.length !== want.length || got.some((k, i) => k !== want[i])) {
    throw new VaultError(400, "INVALID_SCHEMA", `${where} must have exactly: ${want.join(", ")}`);
  }
  return v;
}

function nonEmptyString(v: unknown, where: string): string {
  if (typeof v !== "string" || v.length === 0) throw new VaultError(400, "INVALID_SCHEMA", `${where} must be a non-empty string`);
  return v;
}

export function normalizeReason(raw: unknown): string {
  if (typeof raw !== "string") throw new VaultError(400, "INVALID_REASON", "reason must be a string");
  const reason = raw.normalize("NFC").trim();
  const length = [...reason].length;
  if (length < 1 || length > 200) throw new VaultError(400, "INVALID_REASON", "reason must be 1-200 characters");
  if (hasControlChar(reason)) throw new VaultError(400, "INVALID_REASON", "reason must not contain control characters");
  return reason;
}

function checkVersion(v: unknown, where: string): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 1_000_000_000) {
    throw new VaultError(400, "INVALID_VERSION", `${where} must be an integer >= 1`);
  }
  return v;
}

/** Throws unless the manifest has exactly the frozen shape and values. */
export function validateManifest(m: unknown): PurgeManifest {
  const top = exactKeys(m, ["schema", "requestId", "operation", "vaultId", "objects", "requester",
    "executorSubject", "executorAudience", "createdAt", "expiresAt", "reason"], "manifest");
  if (top.schema !== MANIFEST_SCHEMA) throw new VaultError(400, "INVALID_SCHEMA", "manifest.schema");
  if (top.operation !== "PURGE_VERSIONS") throw new VaultError(400, "INVALID_SCHEMA", "manifest.operation");
  if (top.vaultId !== VAULT_ID) throw new VaultError(400, "INVALID_SCHEMA", "manifest.vaultId");
  if (typeof top.requestId !== "string" || !UUID_RE.test(top.requestId)) throw new VaultError(400, "INVALID_SCHEMA", "manifest.requestId");
  if (!Array.isArray(top.objects) || top.objects.length < 1) throw new VaultError(400, "INVALID_SCHEMA", "manifest.objects");
  const seen = new Set<string>();
  for (const o of top.objects) {
    const obj = exactKeys(o, ["objectId", "version", "sha256"], "manifest.objects[]");
    if (typeof obj.objectId !== "string" || !OBJECT_ID_RE.test(obj.objectId)) throw new VaultError(400, "INVALID_SCHEMA", "objectId");
    checkVersion(obj.version, "version");
    if (typeof obj.sha256 !== "string" || !SHA256_RE.test(obj.sha256)) throw new VaultError(400, "INVALID_SCHEMA", "sha256");
    const key = `${obj.objectId}\u0000${obj.version}`;
    if (seen.has(key)) throw new VaultError(400, "INVALID_SCHEMA", "duplicate object version");
    seen.add(key);
  }
  const req = exactKeys(top.requester, ["issuer", "subject"], "manifest.requester");
  nonEmptyString(req.issuer, "requester.issuer");
  nonEmptyString(req.subject, "requester.subject");
  nonEmptyString(top.executorSubject, "executorSubject");
  nonEmptyString(top.executorAudience, "executorAudience");
  for (const k of ["createdAt", "expiresAt"]) {
    const t = top[k];
    if (typeof t !== "string" || !ISO_MS_RE.test(t) || new Date(t).toISOString() !== t) {
      throw new VaultError(400, "INVALID_SCHEMA", `manifest.${k}`);
    }
  }
  if (Date.parse(top.expiresAt as string) - Date.parse(top.createdAt as string) !== REQUEST_TTL_MS) {
    throw new VaultError(400, "INVALID_SCHEMA", "manifest TTL must be exactly 30 minutes");
  }
  if (normalizeReason(top.reason) !== top.reason) throw new VaultError(400, "INVALID_REASON", "reason not normalized");
  return m as PurgeManifest;
}

function sortKeysDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeysDeep);
  if (isPlainObject(v)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeysDeep(v[k]);
    return out;
  }
  return v;
}

/** The single canonical serialization every module must use (contract section 2). */
export function canonicalizeManifest(m: PurgeManifest): string {
  validateManifest(m);
  const objects = [...m.objects].sort((a, b) =>
    a.objectId < b.objectId ? -1 : a.objectId > b.objectId ? 1 : a.version - b.version);
  return JSON.stringify(sortKeysDeep({ ...m, objects }));
}

export function manifestHash(m: PurgeManifest): string {
  return sha256Hex(canonicalizeManifest(m));
}

export function entitlementFor(hash: string): string {
  return ENTITLEMENT_PREFIX + hash;
}

/** Exact realm-role match only. Client roles, wildcards and generic admin roles never count. */
export function hasExactEntitlement(claims: Record<string, unknown>, entitlement: string): boolean {
  const realm = claims.realm_access;
  if (!isPlainObject(realm) || !Array.isArray(realm.roles)) return false;
  return realm.roles.some((r) => typeof r === "string" && r === entitlement);
}

// ---------------------------------------------------------------- storage

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS objects (
  object_id TEXT NOT NULL,
  version   INTEGER NOT NULL CHECK (version >= 1),
  name      TEXT NOT NULL,
  size      INTEGER NOT NULL,
  sha256    TEXT NOT NULL,
  state     TEXT NOT NULL CHECK (state IN ('AVAILABLE', 'PURGED')),
  content   BLOB,
  PRIMARY KEY (object_id, version),
  CHECK ((state = 'AVAILABLE' AND content IS NOT NULL) OR (state = 'PURGED' AND content IS NULL))
);
CREATE TABLE IF NOT EXISTS requests (
  request_id       TEXT PRIMARY KEY,
  manifest_json    TEXT NOT NULL,
  manifest_hash    TEXT NOT NULL UNIQUE,
  entitlement      TEXT NOT NULL,
  state            TEXT NOT NULL CHECK (state IN ('FILED', 'EXECUTED')),
  governance_links TEXT NOT NULL DEFAULT '[]',
  executed_at      TEXT,
  created_at       TEXT NOT NULL
);`;

// Two tiny, clearly synthetic recovery exports: one object, two versions.
export const SEED_OBJECT_ID = "obj_4f2a9c7e";
const SEED_NAME = "harbourline-freight-recovery-export.csv";
const SEED_VERSIONS = [
  "# SYNTHETIC DEMO DATA - Harbourline Freight recovery export v1\n" +
    "shipment_id,customer,origin,destination,status\n" +
    "HF-10421,Coastal Grocers,Port Botany,Hai Phong,IN_TRANSIT\n" +
    "HF-10422,Ridge Pharma,Melbourne,Ho Chi Minh City,DELIVERED\n",
  "# SYNTHETIC DEMO DATA - Harbourline Freight recovery export v2\n" +
    "shipment_id,customer,origin,destination,status\n" +
    "HF-10421,Coastal Grocers,Port Botany,Hai Phong,DELIVERED\n" +
    "HF-10422,Ridge Pharma,Melbourne,Ho Chi Minh City,DELIVERED\n" +
    "HF-10423,Kestrel Outdoor,Fremantle,Singapore,BOOKED\n",
];

function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    try { db.exec("ROLLBACK"); } catch { /* already rolled back by SQLite */ }
    throw toVaultError(err);
  }
}

export function toVaultError(err: unknown): VaultError {
  if (err instanceof VaultError) return err;
  return new VaultError(503, "STORAGE_UNAVAILABLE", "Storage unavailable");
}

/** Idempotent: the marker is written once, so a restart never resurrects a purged version. */
export function seedVault(db: DatabaseSync): boolean {
  return transaction(db, () => {
    if (db.prepare("SELECT value FROM meta WHERE key = 'seeded'").get()) return false;
    const insert = db.prepare(
      "INSERT INTO objects (object_id, version, name, size, sha256, state, content) VALUES (?, ?, ?, ?, ?, 'AVAILABLE', ?)");
    SEED_VERSIONS.forEach((text, i) => {
      const bytes = new TextEncoder().encode(text);
      insert.run(SEED_OBJECT_ID, i + 1, SEED_NAME, bytes.byteLength, sha256Hex(bytes), bytes);
    });
    db.prepare("INSERT INTO meta (key, value) VALUES ('seeded', ?)").run(new Date().toISOString());
    return true;
  });
}

export function openVault(path: string): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA busy_timeout = 3000;");
  db.exec(SCHEMA_SQL);
  seedVault(db);
  return db;
}

const g = globalThis as unknown as { __vaultDb?: DatabaseSync };

/** Process-wide connection for the single trusted Next.js server. */
export function getVault(): DatabaseSync {
  if (!g.__vaultDb) {
    try {
      g.__vaultDb = openVault(process.env.AUTH_MODE === "simulation"
        ? join(process.env.SIMULATION_DATA_DIR || join(process.cwd(), "data", "simulation"), "vault.sqlite")
        : process.env.VAULT_DB_PATH || join(process.cwd(), "data", "vault.sqlite"));
    } catch (err) {
      throw toVaultError(err);
    }
  }
  return g.__vaultDb;
}

// ---------------------------------------------------------------- reads

type ObjectRow = { object_id: string; version: number; name: string; size: number; sha256: string; state: string; content: Uint8Array | null };
type RequestRow = { request_id: string; manifest_json: string; manifest_hash: string; entitlement: string; state: string; governance_links: string; executed_at: string | null };

function toArchiveObject(r: ObjectRow): ArchiveObject {
  return { objectId: r.object_id, version: Number(r.version), name: r.name, size: Number(r.size),
    sha256: r.sha256, state: r.state === "PURGED" ? "PURGED" : "AVAILABLE" };
}

export function listObjects(db: DatabaseSync): ArchiveObject[] {
  const rows = db.prepare("SELECT object_id, version, name, size, sha256, state FROM objects ORDER BY object_id, version").all() as ObjectRow[];
  return rows.map(toArchiveObject);
}

export function parseObjectId(raw: string): string {
  if (!OBJECT_ID_RE.test(raw)) throw new VaultError(404, "NOT_FOUND", "Unknown object");
  return raw;
}

export function parseVersion(raw: string): number {
  if (!/^[1-9][0-9]{0,8}$/.test(raw)) throw new VaultError(404, "NOT_FOUND", "Unknown version");
  return Number(raw);
}

export function parseRequestId(raw: string): string {
  if (!UUID_RE.test(raw)) throw new VaultError(404, "NOT_FOUND", "Unknown request");
  return raw;
}

/** Exact stored bytes of an available version; 404 when absent or purged. */
export function readVersion(db: DatabaseSync, objectId: string, version: number): { name: string; bytes: Uint8Array; sha256: string } {
  const r = db.prepare("SELECT object_id, version, name, size, sha256, state, content FROM objects WHERE object_id = ? AND version = ?")
    .get(objectId, version) as ObjectRow | undefined;
  if (!r || r.state !== "AVAILABLE" || !r.content) throw new VaultError(404, "NOT_FOUND", "Version not available");
  return { name: r.name, bytes: new Uint8Array(r.content), sha256: r.sha256 };
}

function toRequest(r: RequestRow, now: Date): PurgeRequest {
  const manifest = JSON.parse(r.manifest_json) as PurgeManifest;
  let state: PurgeRequest["state"] = r.state === "EXECUTED" ? "EXECUTED" : "FILED";
  if (state === "FILED" && now.getTime() >= Date.parse(manifest.expiresAt)) state = "EXPIRED";
  return { requestId: r.request_id, manifest, manifestHash: r.manifest_hash, entitlement: r.entitlement, state,
    governanceLinks: JSON.parse(r.governance_links) as GovernanceLink[], executedAt: r.executed_at };
}

const REQUEST_COLS = "request_id, manifest_json, manifest_hash, entitlement, state, governance_links, executed_at";

export function listRequests(db: DatabaseSync, now: Date = new Date()): PurgeRequest[] {
  const rows = db.prepare(`SELECT ${REQUEST_COLS} FROM requests ORDER BY created_at DESC, request_id`).all() as RequestRow[];
  return rows.map((r) => toRequest(r, now));
}

export function getRequest(db: DatabaseSync, requestId: string, now: Date = new Date()): PurgeRequest {
  const r = db.prepare(`SELECT ${REQUEST_COLS} FROM requests WHERE request_id = ?`).get(requestId) as RequestRow | undefined;
  if (!r) throw new VaultError(404, "NOT_FOUND", "Unknown request");
  return toRequest(r, now);
}

// ---------------------------------------------------------------- filing (deletes nothing)

export type Identity = { issuer: string; subject: string; audience: string };

/** Freezes a manifest for one version. Requester/recipient come from the verified identity,
 *  audience from server config, digest from the stored bytes; never from the request body. */
export function fileRequest(db: DatabaseSync, body: unknown, who: Identity, now: Date = new Date()): PurgeRequest {
  const input = exactKeys(body, ["objectId", "version", "reason"], "body");
  if (typeof input.objectId !== "string" || !OBJECT_ID_RE.test(input.objectId)) throw new VaultError(400, "INVALID_SCHEMA", "objectId");
  const version = checkVersion(input.version, "version");
  const reason = normalizeReason(input.reason);
  for (const [k, v] of Object.entries(who)) {
    if (typeof v !== "string" || v.length === 0) throw new VaultError(401, "UNAUTHENTICATED", `missing verified ${k}`);
  }
  const objectId = input.objectId;
  return transaction(db, () => {
    const row = db.prepare("SELECT object_id, version, name, size, sha256, state, content FROM objects WHERE object_id = ? AND version = ?")
      .get(objectId, version) as ObjectRow | undefined;
    if (!row) throw new VaultError(404, "NOT_FOUND", "Unknown object version");
    if (row.state !== "AVAILABLE" || !row.content) throw new VaultError(409, "ALREADY_PURGED", "Version already purged");
    const digest = sha256Hex(new Uint8Array(row.content));
    if (digest !== row.sha256) throw new VaultError(409, "DIGEST_MISMATCH", "Stored bytes do not match recorded digest");
    const manifest: PurgeManifest = {
      schema: MANIFEST_SCHEMA, requestId: randomUUID(), operation: "PURGE_VERSIONS", vaultId: VAULT_ID,
      objects: [{ objectId, version, sha256: digest }],
      requester: { issuer: who.issuer, subject: who.subject },
      executorSubject: who.subject, executorAudience: who.audience,
      createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + REQUEST_TTL_MS).toISOString(), reason,
    };
    const hash = manifestHash(manifest);
    db.prepare(`INSERT INTO requests (request_id, manifest_json, manifest_hash, entitlement, state, governance_links, executed_at, created_at)
      VALUES (?, ?, ?, ?, 'FILED', '[]', NULL, ?)`).run(manifest.requestId, canonicalizeManifest(manifest), hash, entitlementFor(hash), manifest.createdAt);
    return getRequest(db, manifest.requestId, now);
  });
}

// ---------------------------------------------------------------- governance links (observation only)

export function setGovernanceLinks(db: DatabaseSync, requestId: string, body: unknown, now: Date = new Date()): PurgeRequest {
  const input = exactKeys(body, ["links"], "body");
  if (!Array.isArray(input.links) || input.links.length > MAX_LINKS) throw new VaultError(400, "INVALID_SCHEMA", `links must be an array of at most ${MAX_LINKS}`);
  const links: GovernanceLink[] = input.links.map((l) => {
    const o = exactKeys(l, ["changeRequestId", "actionType"], "links[]");
    if (typeof o.changeRequestId !== "string" || !LINK_FIELD_RE.test(o.changeRequestId)) throw new VaultError(400, "INVALID_SCHEMA", "changeRequestId");
    if (typeof o.actionType !== "string" || !LINK_FIELD_RE.test(o.actionType)) throw new VaultError(400, "INVALID_SCHEMA", "actionType");
    return { changeRequestId: o.changeRequestId, actionType: o.actionType };
  });
  return transaction(db, () => {
    const current = getRequest(db, requestId, now);
    if (current.state !== "FILED") throw new VaultError(409, "NOT_FILED", `Request is ${current.state}`);
    db.prepare("UPDATE requests SET governance_links = ? WHERE request_id = ?").run(JSON.stringify(links), requestId);
    return getRequest(db, requestId, now);
  });
}

// ---------------------------------------------------------------- execution (the only destructive path)

/** Verified JWT claims from withAuth. Only iss, sub, azp and realm_access.roles are consulted. */
export type ExecutionClaims = Record<string, unknown>;

export function executePurge(db: DatabaseSync, requestId: string, claims: ExecutionClaims, now: Date = new Date()):
  { request: PurgeRequest; purged: Array<{ objectId: string; version: number }> } {
  return transaction(db, () => {
    const row = db.prepare(`SELECT ${REQUEST_COLS} FROM requests WHERE request_id = ?`).get(requestId) as RequestRow | undefined;
    if (!row) throw new VaultError(404, "NOT_FOUND", "Unknown request");
    const manifest = JSON.parse(row.manifest_json) as PurgeManifest;
    // The stored row is the authority source; re-derive its hash so a tampered row cannot execute.
    const hash = manifestHash(manifest);
    if (hash !== row.manifest_hash || row.entitlement !== entitlementFor(hash)) {
      throw new VaultError(503, "INTEGRITY_FAILURE", "Stored request failed integrity check");
    }
    if (claims.iss !== manifest.requester.issuer || claims.sub !== manifest.executorSubject || claims.azp !== manifest.executorAudience) {
      throw new VaultError(403, "WRONG_EXECUTOR", "Caller is not the manifest executor");
    }
    if (!hasExactEntitlement(claims, row.entitlement)) {
      throw new VaultError(403, "MISSING_ENTITLEMENT", "Caller lacks the exact Tide-granted entitlement for this manifest");
    }
    if (row.state === "EXECUTED") throw new VaultError(409, "CONSUMED", "Request already executed");
    if (now.getTime() >= Date.parse(manifest.expiresAt)) throw new VaultError(410, "EXPIRED", "Request expired");

    const purged: Array<{ objectId: string; version: number }> = [];
    for (const target of manifest.objects) {
      const obj = db.prepare("SELECT object_id, version, name, size, sha256, state, content FROM objects WHERE object_id = ? AND version = ?")
        .get(target.objectId, target.version) as ObjectRow | undefined;
      if (!obj || obj.state !== "AVAILABLE" || !obj.content) throw new VaultError(409, "TARGET_CHANGED", "Target no longer available");
      if (sha256Hex(new Uint8Array(obj.content)) !== target.sha256) throw new VaultError(409, "TARGET_CHANGED", "Target bytes changed since filing");
      const res = db.prepare("UPDATE objects SET content = NULL, state = 'PURGED' WHERE object_id = ? AND version = ? AND state = 'AVAILABLE'")
        .run(target.objectId, target.version);
      if (Number(res.changes) !== 1) throw new VaultError(409, "TARGET_CHANGED", "Concurrent change to target");
      purged.push({ objectId: target.objectId, version: target.version });
    }
    const done = db.prepare("UPDATE requests SET state = 'EXECUTED', executed_at = ? WHERE request_id = ? AND state = 'FILED'")
      .run(now.toISOString(), requestId);
    if (Number(done.changes) !== 1) throw new VaultError(409, "CONSUMED", "Request already executed");
    return { request: getRequest(db, requestId, now), purged };
  });
}
