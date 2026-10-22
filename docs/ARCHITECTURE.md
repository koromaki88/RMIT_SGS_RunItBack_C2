# Architecture and API

## Purpose and scope

Dual-Control Recovery Vault explores delegated archive maintenance without standing
unilateral deletion authority. It has one company, one recovery export with two synthetic
versions, one version per purge request, and a 30-minute approval/execution window.
It does not implement uploads, restore, encryption, multi-tenancy or immutable storage.

One trusted Next.js Node process owns SQLite BLOB storage. A purge removes a BLOB from
the active archive and records consumption in the **same transaction**. It is not secure
erasure of physical pages, disk snapshots or backups. See [security notes](../SECURITY.md).

## Code map

| Path | Responsibility |
|---|---|
| `src/app/page.tsx`, `src/components/` | Archive, request review, governance observations and actions |
| `src/app/providers.tsx` | Select explicit runtime mode and mount its identity provider |
| `src/components/merge-seam.ts` | Shared client bindings to real or simulated identity/governance |
| `src/lib/simulation/` | Fixed demo actors, cookie sessions, persisted votes and role snapshots |
| `src/lib/auth/` | Real JWT verification, pinned issuer/client/audience and DPoP validation |
| `src/lib/tide/governance-client.ts` | Browser-to-Tide role proposals and enclave approval flow |
| `src/lib/vault/contract.ts` | Shared types; authoritative field names |
| `src/lib/vault/core.ts` | Canonical manifests, SQLite, exact entitlement checks and purge transaction |
| `src/lib/vault/http.ts`, `src/app/api/vault/` | Bounded input, identity/role gates and HTTP responses |
| `scripts/test-simulation.mjs` | Isolated HTTP workflow and mode-separation checks |
| `scripts/demo-planc.mjs` | Terminal illustration of the core with unsigned synthetic claims |

## Request lifecycle

1. A member downloads actual archive bytes and files `{objectId, version, reason}`.
2. The server freezes a manifest: request UUID, operation, vault, exact version/digest,
   requester issuer/subject, execution recipient/client, timestamps and reason.
3. `canonicalizeManifest` validates exact keys, recursively sorts object keys, orders targets
   by object ID/version, preserves other array order and serialises UTF-8 JSON. `manifestHash`
   computes SHA-256. Reason is trimmed NFC, 1–200 Unicode code points, without controls.
4. The operation entitlement is the exact realm role `vault-purge:<manifestHash>`.
5. Governance grants that role to the frozen recipient. In simulation, two distinct fixed
   trustees count once each. In intended real mode, Tide IGA governs role creation/grant,
   potentially as separate dependent changes. Its actual signed threshold needs verification.
6. The recipient obtains fresh claims. Counts and stored change-request links are not
   execution authority; the backend requires the exact realm-role entitlement.
7. Inside `BEGIN IMMEDIATE`, execution re-hashes the stored manifest, checks identity,
   entitlement, state, expiry and current target bytes, nulls the BLOB, marks the version
   PURGED and the request EXECUTED, then commits. Failure rolls back both effects.

App request states are `FILED`, `EXPIRED` or `EXECUTED`. Governance observations are separate
(`PENDING`, `APPROVED`, `DENIED`, `CANCELLED`, `UNKNOWN`). A filed app request returning 202
does not mean Tide approved it. Missing governance counts/thresholds stay unknown.

## Identity modes and data

| | Simulation | Real Tide |
|---|---|---|
| Launch | `npm run simulate` | `npm start` |
| Identity | Fixed demo selector and opaque HttpOnly, SameSite=Strict session cookie | Tide-issued EdDSA JWT and bound ES256/P-256 DPoP proof |
| Governance | Ordinary server-side SQLite votes, two distinct actors | Intended Tide IGA/enclave flow; live proof outstanding |
| Storage | `data/simulation/vault.sqlite` and `governance.sqlite` | `data/vault.sqlite` by default |
| Configuration | No adapter required; optional `SIMULATION_DATA_DIR` | Genuine server/browser adapters; see [Tide guide](TIDE.md) |

Real mode never accepts simulation cookies or automatically falls back. Simulation routes
return 404 in real mode. Simulation writes require the allowed localhost host/origin;
the launchers bind port 3000 to loopback. Initial seed is idempotent and never resurrects
purged versions. Databases, adapters and private configuration are ignored by Git.

## API reference

All `/api/vault` routes require the selected mode's authenticated identity. In real mode,
both JWT and DPoP verification are required. Successful responses are `no-store`.

| Method/path | Body | Success |
|---|---|---|
| `GET /api/vault/objects` | — | `200 {objects}` |
| `GET /api/vault/objects/<id>/versions/<n>` | — | `200` exact downloadable bytes; `404` absent/purged |
| `GET /api/vault/requests` | — | `200 {requests}` |
| `POST /api/vault/requests` | `{objectId, version, reason}` | `202 {request}`; no bytes removed |
| `GET /api/vault/requests/<id>` | — | `200 {request}` |
| `PUT /api/vault/requests/<id>/governance` | `{links: [{changeRequestId, actionType}]}` | `200 {request}`; trustee-only observation metadata |
| `POST /api/vault/requests/<id>/execute` | `{}` | `200 {request, purged: [{objectId, version}]}` |

JSON mutations use `Content-Type: application/json`; vault bodies are bounded to 4096 bytes.
Unknown mutation fields are rejected. Recipient, audience, expiry, digest, role and approval
counts are not client-selected authority. Authenticated demo-company members share read access.

Errors use `{error: {code, message}}`: 400 invalid input, 401 missing/invalid identity or proof,
403 insufficient authority, 404 unknown object/request, 409 consumed/conflicting target,
410 expired, 413 oversized input, 503 unavailable storage/configuration.

`GET /api/runtime` reports `simulation` or `tide`. `/api/simulation` is the local-only
demo session/governance control surface, not a production identity API.
