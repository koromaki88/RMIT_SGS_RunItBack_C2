# Agent 2 status: vault backend

Branch: `agent2-vault-backend` (not yet merged or pushed).

## READY

- `src/lib/vault/contract.ts`: frozen types from `04-contract.md` section 2, names unchanged.
- `src/lib/vault/core.ts`: `validateManifest`, `canonicalizeManifest`, `manifestHash`, `entitlementFor`,
  `hasExactEntitlement`, SQLite store (Node built-in `node:sqlite`), idempotent seed, `fileRequest`,
  `setGovernanceLinks`, `executePurge` (single `BEGIN IMMEDIATE` transaction). Only uses Node built-ins.
- Routes (all wrapped in Agent 1's `withAuth`, `no-store`, `ApiError` envelope):
  `GET /api/vault/objects`, `GET /api/vault/objects/<id>/versions/<n>`, `GET|POST /api/vault/requests`,
  `GET /api/vault/requests/<id>`, `PUT /api/vault/requests/<id>/governance`, `POST /api/vault/requests/<id>/execute`.
- Seed: one object `obj_4f2a9c7e` ("Harbourline Freight" synthetic CSV), versions 1 and 2.

## Authority rule implemented

Execute succeeds only if, inside one transaction: request exists and its stored manifest re-hashes
to the stored hash; token `iss`, `sub`, `azp` equal manifest issuer, executor subject and audience;
`realm_access.roles` contains exactly `vault-purge:<manifestHash>` (client roles, wildcards, admin
roles and governance links are ignored); state is FILED; not expired (30 min TTL); target bytes still
hash to the manifest digest. Then the BLOB is set NULL / PURGED and the request EXECUTED, atomically.

## Tests

`node --test "tests/vault/*.test.mjs"` (Node >= 22.18 / 24 strips TS types). 11/11 pass on Node 24.18:
hash stability and field binding, filing deletes nothing, unknown/path/version attacks, wrong
caller/client/issuer/role, exact purge of one version with the other still downloadable, replay,
expiry, changed digest, tampered stored manifest, forced SQL failure rollback, two-connection race,
restart without resurrection, bounded governance links. Synthetic claims exist only in the test file.
These tests do not prove live Tide approval; that is Agent 1's evidence.

## Requests to Agent 1

1. `next.config.ts`/bundler must treat `node:sqlite` as a Node built-in (server route, `runtime = "nodejs"`).
2. Tests and the seed script are `.mjs` that import `core.ts` directly, so tsc never sees a `.ts`
   import extension. No tsconfig change needed. Please add a script `"test:vault": "node --test \"tests/vault/*.test.mjs\""`.
3. `withAuth` currently returns `{ error: string }` on 401; contract wants `ApiError` `{ error: { code, message } }`.
4. Trustee linking reads env `VAULT_TRUSTEE_ROLE` (exact `resource_access["realm-management"].roles` entry);
   unset means 503 fail-closed. Please confirm the real role name.
5. Filing derives issuer/audience from `loadTideConfig()` and rejects tokens whose `iss`/`azp` differ.

## Limits (for README, factual)

Plaintext SQLite on one trusted host, single server process. Purge is logical deletion from the active
archive (BLOB nulled in a transaction), not physical secure erasure. Not protected against host/root access.
