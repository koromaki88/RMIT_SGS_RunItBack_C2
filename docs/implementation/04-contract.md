# Frozen MVP contract — all three agents read first

Changes require explicit coordination. These are planned interfaces, not existing endpoints.

## 1. Runtime, identity, and authority

- One trusted Next.js App Router **Node** server process; Node >=22.13 (VM currently Node 26).
- Node's built-in SQLite stores tiny actual document BLOBs, not filesystem paths or mock entries.
- Public origin: `http://localhost:3000`; use SDK `secureFetch` with absolute URLs.
- New realm/client names proposed: `recovery-vault` / `recovery-vault-client`. Agent 1 confirms
  and freezes actual values after legitimate setup; never relabel signed adapter fields manually.
- JWT pinning: embedded adapter key, exact issuer, `azp === adapter.resource`, and `aud` includes
  that intended resource. Agent 1 configures the real audience mapper and verifies actual tokens.
  Require valid `exp`, `iat`, nonempty `sub`; apply a documented small clock skew.
- Verify DPoP key binding, proof signature/type, token hash, method, pinned public URL/path,
  timestamp, and jti replay. Never accept Bearer as a substitute for a bound proof.
- Authority claim: **`realm_access.roles` contains exactly `vault-purge:<manifestHash>`**.
  No matching role from any client, generic purger/admin role, or UI flag is equivalent.
- Executor recipient is the verified `sub` of the filing user in MVP. No UI-selected recipient.
- Manifest client is the configured real resource, never taken from request input.

Agent 1 owns `withAuth` and browser governance. Agent 2 consumes verified JWT claims and
the exact entitlement predicate; it must not implement a weaker alternate auth path.

## 2. Shared data shapes

Agent 2 publishes `src/lib/vault/contract.ts` early, matching these names:

```ts
type ArchiveObject = {
  objectId: string; version: number; name: string;
  size: number; sha256: string; state: "AVAILABLE" | "PURGED";
};
type PurgeManifest = {
  schema: "vault-purge-v1";
  requestId: string;
  operation: "PURGE_VERSIONS";
  vaultId: "harbourline-demo";
  objects: Array<{ objectId: string; version: number; sha256: string }>;
  requester: { issuer: string; subject: string };
  executorSubject: string;
  executorAudience: string;
  createdAt: string; expiresAt: string; reason: string;
};
type GovernanceLink = { changeRequestId: string; actionType: string };
type PurgeRequest = {
  requestId: string;
  manifest: PurgeManifest;
  manifestHash: string;
  entitlement: string;
  state: "FILED" | "EXECUTED" | "EXPIRED";
  governanceLinks: GovernanceLink[];
  executedAt: string | null;
};
type GovernanceObservation = {
  changeRequestId: string;
  status: "PENDING" | "APPROVED" | "DENIED" | "CANCELLED" | "UNKNOWN";
  authorizationCount: number | null; threshold: number | null;
};
type ApiError = { error: { code: string; message: string } };
```

`UNKNOWN` is an app observation, not an invented Tide CR status. Nullable counts must render
“unknown,” not zero. Never add `APPROVED` to the executable app request state: execution
authority comes from the verified credential, not a mutable application status.

### Canonical manifest

- Exactly the keys shown, with explicit types; no optional/unknown fields.
- One version per request in the deadline UI/API, although `objects` retains an array shape.
- Lowercase hex SHA-256, integer version >=1, canonical UUID request ID generated server-side.
- Server-created UTC ISO timestamps with milliseconds (`toISOString()`); TTL fixed at 30 minutes.
  All grant/approval steps must fit that TTL; expired requests require a new ID/hash/approval.
- Reason: trimmed NFC string of 1–200 characters; reject control characters.
- Canonical serialization: recursively lexicographically sort object keys, preserve array order;
  sort objects by objectId then version and reject duplicates. Use UTF-8 `JSON.stringify` output.
- Agent 2 alone implements `canonicalizeManifest` and `manifestHash`. Everyone uses its result;
  do not independently stringify/re-hash in three modules.
- Hash includes recipient, audience, expiry, reason, digest, and unique request ID. Bind all of them.

## 3. App API

All endpoints require valid user JWT + DPoP. Responses are `no-store`. No cookies-only bypass.
Agent 2 owns routes, and uses Agent 1's verifier. All input is bounded and validated.

| Method/path | Request | Success |
|---|---|---|
| `GET /api/vault/objects` | None | `200 { objects: ArchiveObject[] }` |
| `GET /api/vault/objects/<id>/versions/<n>` | None | `200` exact byte download, safe content disposition; `404` absent/purged |
| `GET /api/vault/requests` | None | `200 { requests: PurgeRequest[] }` |
| `POST /api/vault/requests` | `{ objectId, version, reason }` only | `202 { request: PurgeRequest }`; no bytes removed |
| `GET /api/vault/requests/<id>` | None | `200 { request: PurgeRequest }` |
| `PUT /api/vault/requests/<id>/governance` | `{ links: GovernanceLink[] }` | `200 { request }`; validated trustee-only observation metadata, never authority |
| `POST /api/vault/requests/<id>/execute` | Empty JSON `{}` | `200 { request, purged: [{ objectId, version }] }` |

In this one-company synthetic demo, authenticated members may view all archive/request metadata
and download available files. This is not confidentiality isolation or a multi-tenant product.
Only the manifest recipient with its exact entitlement may execute. Agent 1's verified
`resource_access["realm-management"].roles` check defines trustee-only linking; never use a
similarly named role from another client. Forged links still cannot authorise execution.

Errors: `400` invalid schema, `401` auth/proof failure, `403` insufficient authority, `404`
unknown target, `409` consumed/conflicting target/state, `410` expired, `413` oversized input,
`503` storage/configuration unavailable. Return `ApiError`; do not return raw tokens or stack traces.
Unknown mutation fields, object paths, user IDs, role names, expiry overrides, and approval
counts supplied by clients are rejected, not silently accepted as authority.

## 4. Agent 1 browser adapter

Module: `src/lib/tide/governance-client.ts` (browser-only). Export:

```ts
type SecureFetch = (url: string, init?: RequestInit) => Promise<Response>;
async function proposePurgeGrant(
  request: PurgeRequest, secureFetch: SecureFetch
): Promise<GovernanceLink[]>;
async function readGovernance(
  links: GovernanceLink[], secureFetch: SecureFetch
): Promise<GovernanceObservation[]>;
async function approveGovernance(
  changeRequestId: string, secureFetch: SecureFetch
): Promise<GovernanceObservation>;
```

These signatures are interface sketches; use valid exported TypeScript implementations.
The adapter obtains real role/user/client IDs, handles separate creation/grant dependencies,
and drives actual enclave model signing via the installed SDK. It does not invent a custom
IGA action or sign an app JSON manifest as though it were an IGA model.

If the role must commit before a grant CR can be created, `proposePurgeGrant` can be invoked
again after the creation dependency applies; return/reuse existing IDs rather than duplicating
requests. Agent 1 documents this exact stage in its status file. Agent 3 shows it honestly.
SDK token propagation may need re-login; show instructions instead of fabricating refresh success.

Agent 1 must announce by T+10 whether these interfaces need a small coordinated adjustment.
Never replace individual trustee caller identities with a server/master token.

## 5. Atomic execution and testing

Two tiny deterministic synthetic BLOB versions at seed. No reset/seed HTTP route. Seeding
is idempotent and must not recreate a purged row after restart. Agent 2 owns that invariant.

SQLite transaction: load frozen request → verify state/expiry/caller/exact entitlement → verify
the target's actual digest → delete exactly its BLOB/update metadata → record `EXECUTED` → commit.
All destructive effects and consumed state are in the same database transaction. Roll back on
failure. Prevent concurrent double execution with transaction locking and affected-row checks.

Automated tests may use clearly synthetic keys/claims only in isolated test fixtures. Runtime
must never recognise test keys, special header flags, mock approvers, or an auth-disable switch.
For live evidence: verify one-account failure, independent approval success, actual signed
claim, exact target deletion, other target survival, and replay refusal. Mark untested bypasses.
