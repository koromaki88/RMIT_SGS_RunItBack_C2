// Agent 2: terminal demo of the purge authority rule, for the video.
// Run: node scripts/demo-planc.mjs            (pauses between steps for recording)
//      node scripts/demo-planc.mjs --fast     (no pauses)
//
// Sign-in and the quorum-issued role are SIMULATED here by SimulatedTideCloak.
// The vault's exact entitlement, executor, hash and one-time checks use the real core.
// This bypasses the HTTP auth layer deliberately: claims below are not signed tokens.
// Uses a fresh temporary database and synthetic data; never a live Tide issuer.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  openVault, listObjects, readVersion, fileRequest, executePurge, manifestHash, entitlementFor,
  SEED_OBJECT_ID, VaultError,
} from "../src/lib/vault/core.ts";

const DELAY = process.argv.includes("--fast") ? 0 : Number(process.env.DEMO_DELAY_MS ?? 1500);
const pause = () => new Promise((r) => setTimeout(r, DELAY));
const c = (code) => (s) => `\x1b[${code}m${s}\x1b[0m`;
const bold = c(1), dim = c(2), red = c(31), green = c(32), yellow = c(33), cyan = c(36);
const short = (h) => `${h.slice(0, 12)}...`;

// ------------------------------------------------------------ simulated TideCloak (Plan C)

class SimulatedTideCloak {
  constructor({ issuer, audience, quorum }) {
    this.issuer = issuer;
    this.audience = audience;
    this.quorum = quorum;
    this.grants = new Map();     // subject -> Set of granted roles
    this.approvals = new Map();  // entitlement -> Set of trustee subjects
    this.executor = new Map();   // entitlement -> subject the role will be granted to
  }
  identity(p) {
    return { issuer: this.issuer, subject: p.sub, audience: this.audience };
  }
  token(p) {
    const granted = [...(this.grants.get(p.sub) ?? [])];
    return { iss: this.issuer, sub: p.sub, azp: this.audience, realm_access: { roles: [...p.roles, ...granted] } };
  }
  // A change request: "grant <entitlement> to <executor>", committed only by a trustee quorum.
  propose(entitlement, executorSub) {
    this.executor.set(entitlement, executorSub);
    this.approvals.set(entitlement, new Set());
  }
  approve(p, entitlement) {
    const set = this.approvals.get(entitlement);
    if (!p.trustee) return { counted: false, why: "not a trustee, approval ignored", n: set.size };
    if (set.has(p.sub)) return { counted: false, why: "same trustee again, still one vote", n: set.size };
    set.add(p.sub);
    if (set.size >= this.quorum) {
      const sub = this.executor.get(entitlement);
      if (!this.grants.has(sub)) this.grants.set(sub, new Set());
      this.grants.get(sub).add(entitlement);
      return { counted: true, why: "quorum reached, role granted", n: set.size, granted: true };
    }
    return { counted: true, why: "approval recorded", n: set.size };
  }
}

const tide = new SimulatedTideCloak({
  issuer: "urn:recovery-vault:terminal-simulation",
  audience: "terminal-simulation-client",
  quorum: 2,
});
const ALICE = { name: "Alice (archive operator)", sub: "synthetic-alice", roles: ["archive-operator"] };
const ROOT = { name: "Root admin (phished account)", sub: "synthetic-root-admin", roles: ["realm-admin", "admin", "vault-purge", "vault-purge:*"] };
const BEN = { name: "Ben (finance trustee)", sub: "synthetic-ben", roles: ["vault-trustee"], trustee: true };
const CHI = { name: "Chi (security trustee)", sub: "synthetic-chi", roles: ["vault-trustee"], trustee: true };

// ------------------------------------------------------------ helpers

const db = openVault(join(mkdtempSync(join(tmpdir(), "vault-demo-")), "vault.sqlite"));

async function step(title) {
  await pause();
  console.log(`\n${bold(cyan(title))}`);
}

function tryPurge(who, requestId) {
  const claims = tide.token(who);
  try {
    const { purged } = executePurge(db, requestId, claims);
    console.log(`  ${green("ALLOWED")}  ${who.name} purged ${purged.map((p) => `v${p.version}`).join(", ")}`);
  } catch (e) {
    if (!(e instanceof VaultError)) throw e;
    console.log(`  ${red("REFUSED")}  ${who.name}: ${e.status} ${e.code} (${e.message})`);
  }
  const roles = claims.realm_access.roles.map((r) => (r.startsWith("vault-purge:") && r.length > 30 ? `vault-purge:${short(r.slice(12))}` : r));
  console.log(dim(`           simulated claim roles: ${roles.join(", ")}`));
}

function approve(who, entitlement) {
  const r = tide.approve(who, entitlement);
  const mark = r.granted ? green("GRANTED") : r.counted ? yellow("VOTE   ") : red("IGNORED");
  console.log(`  ${mark}  ${who.name}: ${r.why} (${r.n}/${tide.quorum})`);
}

function showVault() {
  for (const o of listObjects(db)) {
    const state = o.state === "AVAILABLE" ? green(o.state) : red(o.state);
    console.log(`  ${o.objectId} v${o.version}  ${state}  sha256 ${short(o.sha256)}`);
  }
}

function file(who, version) {
  const req = fileRequest(db, { objectId: SEED_OBJECT_ID, version, reason: "Rotate stale recovery export" }, tide.identity(who));
  const hash = manifestHash(req.manifest);
  const entitlement = entitlementFor(hash);
  tide.propose(entitlement, who.sub);
  console.log(`  ${who.name} filed a purge request for v${version} (nothing deleted yet)`);
  console.log(dim(`           manifest hash ${short(hash)}  required role vault-purge:${short(hash)}`));
  return { id: req.manifest.requestId, entitlement };
}

// ------------------------------------------------------------ the story

console.log(bold("Dual-Control Recovery Vault: who can destroy a backup?"));
console.log(yellow("SIMULATED TideCloak (Tide Plan C): sign-in and the quorum-issued role are simulated."));
console.log(yellow("Real vault core, synthetic unsigned claims. No HTTP/JWT/DPoP or live Tide verification."));

await step("1. Harbourline Freight's recovery archive (synthetic data)");
showVault();

await step("2. An attacker phishes the root admin and tries to wipe backup v1");
const rootReq = file(ROOT, 1);
tryPurge(ROOT, rootReq.id);
approve(ROOT, rootReq.entitlement);
console.log(dim("           Admin roles and wildcards do not count. Only the exact, simulated quorum-issued role does."));

await step("3. Alice, the archive operator, asks to purge v1 for a legitimate reason");
const req = file(ALICE, 1);
tryPurge(ALICE, req.id);

await step("4. Simulated trustees review the operation");
approve(BEN, req.entitlement);
approve(BEN, req.entitlement);
approve(ROOT, req.entitlement);
tryPurge(ALICE, req.id);

await step("5. A second distinct simulated trustee approves");
approve(CHI, req.entitlement);
tryPurge(ALICE, req.id);

await step("6. Replay: Alice tries the same purge again");
tryPurge(ALICE, req.id);

await step("7. Alice reuses her granted role on a different backup (v2)");
const req2 = file(ALICE, 2);
tryPurge(ALICE, req2.id);
console.log(dim("           The role is bound to one manifest hash, so it cannot be reused elsewhere."));

await step("8. Final state");
showVault();
const v2 = readVersion(db, SEED_OBJECT_ID, 2);
console.log(`  v2 still downloads: ${v2.bytes.byteLength} bytes, sha256 ${short(v2.sha256)} ${green("intact")}`);

db.close();
