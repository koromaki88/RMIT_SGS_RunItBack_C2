# Agent 2 — persistent archive and exact one-time purge enforcement

**Copy-ready assignment:** You are Agent 2 of three concurrent agents. Own the vault backend
and its tests. Read root `AGENTS.md`, `00-coordination.md`, `04-contract.md`, and the brief first.

## Objective

Build a tiny actual archive whose protected purge API requires the exact real Tide entitlement,
recipient, target/digest, valid lifetime, and unused request. Persist deletion and consumption
atomically. Do not build a mock approval engine or assume Agent 1's governance spike succeeded.

## Exclusive ownership

- `src/lib/vault/**`: contract types, schema, canonicalization/hash, store, execution logic.
- `src/app/api/vault/**`: every endpoint in the frozen contract.
- `tests/vault/**`, `scripts/seed-vault.ts`, ignored `data/vault.sqlite` and related private state.
- `docs/status/agent-2.md`, `docs/evidence/backend.md`.

Do not edit root package/lockfile/auth helpers, pages/layout, or shared contract Markdown. Ask
Agent 1 for dependencies/test commands; use Node built-in SQLite to avoid an extra database stack.
Send Agent 3 READY messages when endpoints land. Never run a second app server or installer.

## T+0–10: contract and seed

1. Publish `src/lib/vault/contract.ts` exactly matching `04-contract.md` so peers can import types.
2. Implement one canonical manifest/hash function; fixed keys/types, sorted keys and objects,
   no unknown fields, valid integer versions, NFC/control-safe reason, server timestamps/UUID,
   fixed 30-minute TTL. Do not accept recipient, issuer, audience, digest, hash or role from user input.
3. Persist two tiny real synthetic BLOB versions (e.g. two CSV recovery exports) with opaque ID,
   version, name, byte size and actual SHA-256. Shared display name is Harbourline Freight.
4. Idempotent initial seed marker: restarting the server must never resurrect a purged version.
   No reset/seed HTTP route. A local explicit test fixture may reset only its own temporary database.

Send `READY contract.ts + canonical manifest rules` immediately. Agent 1 can use a harmless
manifest for its governance proof; it must not require waiting for polished routes.

## T+10–45: safe backend before authority is ready

- Implement `objects`, exact download, list/file/read requests, and informational governance links
  endpoints from the shared contract. Return real bytes and correct sizes, not seed metadata only.
- Use Agent 1's `withAuth`: verified JWT + DPoP is required on reads and writes. Do not fake it if
  the provider is not ready. Local tests may pass explicitly synthetic fixtures outside runtime.
- Filing one target version returns app `202` with a frozen manifest/hash and deletes nothing.
- Derive requester/recipient from verified identity, audience from server config, and target
  digest from the stored BLOB. Reject invalid/unknown input fields and oversized bodies.
- `PUT governance` is trustee-only through an exact verified `realm-management` client-role check;
  its links are observation data only. They never authorise execute, even if forged or reordered.
- Implement execution behind an exact entitlement check from **realm_access.roles only**.
  No wildcard, generic trustee/admin/purger role, app approval count, special request header,
  development-mode bypass, or presumed success while Agent 1 is BLOCKED.
- Keep database errors `503`, malformed requests `400/413`, auth/proof `401`, insufficient
  authority `403`. Return the shared error envelope without stack traces or tokens.

## T+45–90: transactional execution and tests

One trusted server/single SQLite database is an intentional three-hour simplification.
Do not build a filesystem executor, another container, object-store connector, or service proxy.

Within an immediate transaction:

1. Load the server-frozen request; do not trust an incoming reconstructed manifest.
2. Require FILED, not expired/consumed, exact issuer/subject/client and exact entitlement hash.
3. Verify the current target version's actual BLOB digest matches the manifest.
4. Remove exactly that BLOB from the active archive and mark its metadata PURGED.
5. Mark request EXECUTED with timestamp; commit both changes atomically.

On any error, roll back both. SQLite locking plus state/affected-row checks must prevent two
concurrent executions. A new proof/token for the same operation cannot undo consumption.
There is no PARTIAL filesystem state in this scope: all destructive effects are SQL BLOB/state
changes in the same transaction. This is logical archive deletion, not physical secure erasure.

### Minimum automated tests

- Canonical hash is stable under key-order differences and changes for every bound field.
- Request creation leaves file bytes/digest unchanged; version/unknown-field/path attacks fail.
- Missing/wrong role, caller, client or namespace cannot execute; forged links/counts do not help.
- Expiry, changed digest/target, consumed request and duplicate execution fail without side effects.
- Valid exact fixture authority removes only the selected version; second version still downloads.
- Forced SQL failure rolls back object and consumed state together; concurrency yields one success.
- Restart/open the same database: consumption persists and seed does not resurrect deleted bytes.

Synthetic keys/claims belong only to isolated tests. Never create a runtime auth-disable flag.
Do not claim backend fixture tests prove a live two-person Tide approval; that is Agent 1's proof.

## T+90–135: integrate and preserve evidence

- With Agent 1/3 and human signers, run the real token path. Record the rejected first-account
  request, intact digest/download, exact granted role, authorised execution, surviving other version,
  and replay refusal. Do not save the token or personal credentials in evidence.
- Fix contract correctness, not optional features. If the role is missing, coordinate with Agent 1;
  do not widen your predicate to any role that happens to appear in the token.
- Ask Agent 1 to run tests/build once peers' code stabilises. Do not compete over root scripts.
- Supply a short factual backend-limit paragraph to Agent 3: plaintext SQLite, trusted host/backend,
  single process, active-archive deletion rather than secure erasure.

## Definition of done

Every shared endpoint exists, routes require real authentication, purge fails closed, exact
operation scope/expiry/recipient and consumption are enforced, and tests exercise durable bytes
rather than UI flags. Status lists READY endpoints, test command/results, blockers and remaining
gaps. No claim of independent storage isolation or protection from host/root access.

If live Tide authority is blocked, leave execute inaccessible and still deliver the safe archive,
manifest API, tests, and a precise BLOCKED note. Do not swap in locally counted approvals.
