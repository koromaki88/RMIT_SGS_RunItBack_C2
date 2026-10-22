// Backend tests. Run with npm test or node --test "tests/vault/*.test.mjs".
// Uses clearly synthetic claims in an isolated temporary database only; runtime code has no
// test keys, header flags or auth bypass. These tests do NOT prove live Tide approvals.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  openVault, listObjects, readVersion, fileRequest, executePurge, setGovernanceLinks, getRequest,
  manifestHash, canonicalizeManifest, entitlementFor, VaultError, SEED_OBJECT_ID, REQUEST_TTL_MS,
} from "../../src/lib/vault/core.ts";

const ISS = "https://synthetic-test.invalid/realms/recovery-vault";
const AUD = "recovery-vault-client";
const ALICE = { issuer: ISS, subject: "synthetic-alice", audience: AUD };
const T0 = new Date("2026-10-22T08:00:00.000Z");

function tempDb() {
  const dir = mkdtempSync(join(tmpdir(), "vault-test-"));
  const path = join(dir, "vault.sqlite");
  const db = openVault(path);
  const cleanup = () => {
    try { db.close(); } catch { /* already closed by the test */ }
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* Windows may hold the file briefly; temp dir only */ }
  };
  return { path, db, cleanup };
}

function claimsFor(req, roles = [req.entitlement], overrides = {}) {
  return { iss: ISS, sub: req.manifest.executorSubject, azp: AUD, realm_access: { roles }, ...overrides };
}

function expectVaultError(fn, status, code) {
  assert.throws(fn, (e) => e instanceof VaultError && e.status === status && (!code || e.code === code),
    `expected VaultError ${status}${code ? " " + code : ""}`);
}

function file(db, version = 1, now = T0) {
  return fileRequest(db, { objectId: SEED_OBJECT_ID, version, reason: "Rotate stale export" }, ALICE, now);
}

test("seed: two real synthetic versions with correct size and digest", () => {
  const { db, cleanup } = tempDb();
  try {
    const objs = listObjects(db);
    assert.equal(objs.length, 2);
    for (const o of objs) {
      const { bytes, sha256 } = readVersion(db, o.objectId, o.version);
      assert.equal(bytes.byteLength, o.size);
      assert.equal(sha256, o.sha256);
      assert.equal(o.state, "AVAILABLE");
    }
  } finally { cleanup(); }
});

test("canonical hash is stable under key order and changes for every bound field", () => {
  const { db, cleanup } = tempDb();
  try {
    const m = file(db).manifest;
    const reordered = JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(m).reverse())));
    assert.equal(manifestHash(reordered), manifestHash(m));
    assert.equal(canonicalizeManifest(reordered), canonicalizeManifest(m));
    const base = manifestHash(m);
    const variants = [
      { ...m, requestId: "00000000-0000-4000-8000-000000000000" },
      { ...m, reason: "Different reason" },
      { ...m, executorSubject: "synthetic-mallory" },
      { ...m, executorAudience: "other-client" },
      { ...m, requester: { ...m.requester, issuer: "https://other.invalid/realms/x" } },
      { ...m, objects: [{ ...m.objects[0], version: 2 }] },
      { ...m, objects: [{ ...m.objects[0], sha256: "0".repeat(64) }] },
      { ...m, createdAt: new Date(T0.getTime() + 1000).toISOString(), expiresAt: new Date(T0.getTime() + 1000 + REQUEST_TTL_MS).toISOString() },
    ];
    for (const v of variants) assert.notEqual(manifestHash(v), base);
    expectVaultError(() => manifestHash({ ...m, extra: 1 }), 400);
    expectVaultError(() => manifestHash({ ...m, expiresAt: new Date(T0.getTime() + REQUEST_TTL_MS + 1).toISOString() }), 400);
  } finally { cleanup(); }
});

test("filing deletes nothing and rejects unknown fields, bad versions and path-like ids", () => {
  const { db, cleanup } = tempDb();
  try {
    const before = readVersion(db, SEED_OBJECT_ID, 1);
    const req = file(db);
    assert.equal(req.state, "FILED");
    assert.equal(req.entitlement, entitlementFor(req.manifestHash));
    assert.equal(req.manifest.executorSubject, "synthetic-alice");
    assert.equal(req.manifest.executorAudience, AUD);
    assert.deepEqual(readVersion(db, SEED_OBJECT_ID, 1), before);
    const bad = [
      { objectId: SEED_OBJECT_ID, version: 1, reason: "x", executorSubject: "synthetic-mallory" },
      { objectId: SEED_OBJECT_ID, version: 0, reason: "x" },
      { objectId: SEED_OBJECT_ID, version: 1.5, reason: "x" },
      { objectId: SEED_OBJECT_ID, version: "1", reason: "x" },
      { objectId: "../../etc/passwd", version: 1, reason: "x" },
      { objectId: SEED_OBJECT_ID, version: 1, reason: "   " },
      { objectId: SEED_OBJECT_ID, version: 1, reason: "bad\u0000reason" },
      { objectId: SEED_OBJECT_ID, version: 1, reason: "x".repeat(201) },
      { objectId: SEED_OBJECT_ID, version: 1 },
    ];
    for (const b of bad) expectVaultError(() => fileRequest(db, b, ALICE, T0), 400);
    expectVaultError(() => fileRequest(db, { objectId: "obj_missing", version: 1, reason: "x" }, ALICE, T0), 404);
  } finally { cleanup(); }
});

test("wrong caller, client, issuer, missing or non-realm role cannot execute; links do not help", () => {
  const { db, cleanup } = tempDb();
  try {
    const req = file(db);
    setGovernanceLinks(db, req.requestId, { links: [{ changeRequestId: "cr-forged-1", actionType: "APPROVED" }] }, T0);
    const now = new Date(T0.getTime() + 60_000);
    const attempts = [
      claimsFor(req, []),
      claimsFor(req, ["vault-purge:*", "admin", "trustee"]),
      claimsFor(req, [entitlementFor("0".repeat(64))]),
      claimsFor(req, [req.entitlement], { sub: "synthetic-mallory" }),
      claimsFor(req, [req.entitlement], { azp: "other-client" }),
      claimsFor(req, [req.entitlement], { iss: "https://other.invalid/realms/x" }),
      { iss: ISS, sub: "synthetic-alice", azp: AUD, realm_access: { roles: [] }, resource_access: { [AUD]: { roles: [req.entitlement] } } },
    ];
    for (const c of attempts) expectVaultError(() => executePurge(db, req.requestId, c, now), 403);
    assert.equal(getRequest(db, req.requestId, now).state, "FILED");
    assert.equal(readVersion(db, SEED_OBJECT_ID, 1).bytes.byteLength > 0, true);
  } finally { cleanup(); }
});

test("exact authority purges only the selected version; replay and second execution fail", () => {
  const { db, cleanup } = tempDb();
  try {
    const req = file(db, 1);
    const now = new Date(T0.getTime() + 60_000);
    const v2 = readVersion(db, SEED_OBJECT_ID, 2);
    const out = executePurge(db, req.requestId, claimsFor(req), now);
    assert.deepEqual(out.purged, [{ objectId: SEED_OBJECT_ID, version: 1 }]);
    assert.equal(out.request.state, "EXECUTED");
    expectVaultError(() => readVersion(db, SEED_OBJECT_ID, 1), 404);
    assert.deepEqual(readVersion(db, SEED_OBJECT_ID, 2), v2);
    assert.equal(listObjects(db).find((o) => o.version === 1).state, "PURGED");
    expectVaultError(() => executePurge(db, req.requestId, claimsFor(req), now), 409, "CONSUMED");
    expectVaultError(() => file(db, 1, now), 409, "ALREADY_PURGED");
  } finally { cleanup(); }
});

test("expiry and changed target bytes fail without side effects", () => {
  const { path, db, cleanup } = tempDb();
  try {
    const req = file(db, 1);
    expectVaultError(() => executePurge(db, req.requestId, claimsFor(req), new Date(T0.getTime() + REQUEST_TTL_MS)), 410, "EXPIRED");
    assert.equal(getRequest(db, req.requestId, new Date(T0.getTime() + REQUEST_TTL_MS)).state, "EXPIRED");
    const req2 = file(db, 2);
    const raw = new DatabaseSync(path);
    raw.prepare("UPDATE objects SET content = ?, sha256 = ? WHERE object_id = ? AND version = 2")
      .run(new TextEncoder().encode("tampered"), "f".repeat(64), SEED_OBJECT_ID);
    raw.close();
    expectVaultError(() => executePurge(db, req2.requestId, claimsFor(req2), new Date(T0.getTime() + 1000)), 409, "TARGET_CHANGED");
    assert.equal(getRequest(db, req2.requestId, new Date(T0.getTime() + 1000)).state, "FILED");
    assert.equal(readVersion(db, SEED_OBJECT_ID, 1).bytes.byteLength > 0, true);
  } finally { cleanup(); }
});

test("tampered stored manifest cannot execute", () => {
  const { path, db, cleanup } = tempDb();
  try {
    const req = file(db, 1);
    const raw = new DatabaseSync(path);
    const m = JSON.parse(raw.prepare("SELECT manifest_json FROM requests WHERE request_id = ?").get(req.requestId).manifest_json);
    m.executorSubject = "synthetic-mallory";
    raw.prepare("UPDATE requests SET manifest_json = ? WHERE request_id = ?").run(JSON.stringify(m), req.requestId);
    raw.close();
    expectVaultError(() => executePurge(db, req.requestId, claimsFor(req, [req.entitlement], { sub: "synthetic-mallory" }), new Date(T0.getTime() + 1000)), 503, "INTEGRITY_FAILURE");
  } finally { cleanup(); }
});

test("forced SQL failure rolls back object and request state together", () => {
  const { path, db, cleanup } = tempDb();
  try {
    const req = file(db, 1);
    const raw = new DatabaseSync(path);
    raw.exec(`CREATE TRIGGER fail_consume BEFORE UPDATE OF state ON requests WHEN NEW.state = 'EXECUTED'
              BEGIN SELECT RAISE(ABORT, 'forced failure'); END;`);
    raw.close();
    expectVaultError(() => executePurge(db, req.requestId, claimsFor(req), new Date(T0.getTime() + 1000)), 503);
    assert.equal(readVersion(db, SEED_OBJECT_ID, 1).bytes.byteLength > 0, true);
    assert.equal(getRequest(db, req.requestId, new Date(T0.getTime() + 1000)).state, "FILED");
  } finally { cleanup(); }
});

test("two connections racing: exactly one execution succeeds", () => {
  const { path, db, cleanup } = tempDb();
  try {
    const req = file(db, 1);
    const other = openVault(path);
    const now = new Date(T0.getTime() + 1000);
    const results = [db, other].map((conn) => {
      try { executePurge(conn, req.requestId, claimsFor(req), now); return "ok"; }
      catch (e) { return e instanceof VaultError ? e.status : "other"; }
    });
    assert.deepEqual(results.sort(), [409, "ok"].sort());
    other.close();
  } finally { cleanup(); }
});

test("restart: consumption persists and seed does not resurrect purged bytes", () => {
  const { path, db, cleanup } = tempDb();
  try {
    const req = file(db, 1);
    executePurge(db, req.requestId, claimsFor(req), new Date(T0.getTime() + 1000));
    db.close();
    const reopened = openVault(path);
    expectVaultError(() => readVersion(reopened, SEED_OBJECT_ID, 1), 404);
    assert.equal(getRequest(reopened, req.requestId, new Date(T0.getTime() + 2000)).state, "EXECUTED");
    assert.equal(listObjects(reopened).length, 2);
    reopened.close();
  } finally { cleanup(); }
});

test("governance links are bounded observation data", () => {
  const { db, cleanup } = tempDb();
  try {
    const req = file(db, 1);
    expectVaultError(() => setGovernanceLinks(db, req.requestId, { links: [{ changeRequestId: "x", actionType: "y", approved: true }] }, T0), 400);
    expectVaultError(() => setGovernanceLinks(db, req.requestId, { links: Array(11).fill({ changeRequestId: "a", actionType: "b" }) }, T0), 400);
    expectVaultError(() => setGovernanceLinks(db, req.requestId, { links: [], approvalCount: 2 }, T0), 400);
    const r = setGovernanceLinks(db, req.requestId, { links: [{ changeRequestId: "cr-123", actionType: "ROLE_GRANT" }] }, T0);
    assert.deepEqual(r.governanceLinks, [{ changeRequestId: "cr-123", actionType: "ROLE_GRANT" }]);
    assert.equal(r.state, "FILED");
  } finally { cleanup(); }
});
