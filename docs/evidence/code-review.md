# Integration review and offline-development boundary

> Historical pre-simulator review. The simulator below was subsequently implemented with
> organiser/user authorisation; current operation and boundaries are in `../SIMULATION.md`.
> The latest plan/goal review and remaining handoffs are in `governance.md`.

## Agent 3 update integrated

Integrated incremental changes from `e76163f` through `6039566` on
`origin/agent3-ui-submission` into the current feature working tree. Preserved real auth,
SDK governance adapters, mounted provider, and earlier integration fixes. No commit/push.

## Findings fixed

1. **Incorrect import:** redesigned archive imported `copyText` from client-api rather than
   display-utils. Fixed; production compilation and TypeScript now succeed.
2. **Premature governance claims:** UI said two dependent requests existed even when the adapter
   returned one/zero. It now reports the actual returned link count and explains dependencies.
3. **Premature survival claim:** execution success asserted the other version was downloadable
   before observing refresh/download. It now reports confirmed targets and asks for verification.
4. **Unverified live quorum claim:** empty-state copy promised two independent approvals despite
   live setup being blocked. It now states the intended policy and verification gap.
5. **Unbounded input buffering:** JSON helper read the whole body before checking actual size.
   It now enforces the byte bound while streaming, cancels oversize input, and requires JSON.
6. **Completed CR approval control:** approve is disabled unless the observation is PENDING.
   Actual authorization remains the upstream/backend responsibility.

## Validation

- `npm test`: **33 passed**, including new HTTP body-bound and exact-client trustee tests.
- `npm run build`: successful compilation, TypeScript, route generation.
- Runtime real mode still blocks at missing genuine adapter; no fake session has been installed.

## Remaining blockers / concerns

- **Critical, unverified:** actual Tide licence, enrolment, signed threshold >=2, exact role grant,
  token propagation, and unilateral grant/configuration bypass tests. No local test proves these.
- Browser governance correlation currently examines actual action/entity/replay rows but still
  uses string containment within replay rows for the role. Live schema-based correlation should
  replace this heuristic once the exact server response is available. Never silently approve a
  guessed/unrelated CR; human review of exact scope remains necessary.
- Governance-link metadata can be overwritten by a permitted trustee; links/counts must remain
  non-authoritative. Purge correctly relies on verified entitlement rather than those links.
- No full Playwright/browser round trip was executed. Component logic tests are not visual or
  accessibility/browser tests. Live authenticated download and approval popups remain untested.
- Single-process replay cache, trusted backend/host, plaintext SQLite, logical rather than
  forensic deletion, no production rate limiting, and token revocation windows remain disclosed limits.
- Approval observations are snapshots. Refresh before making decisions; another account or time
  passing does not automatically guarantee the screen reflects fresh upstream state.

## Recommended offline simulator (not implemented by this review)

The user explicitly proposed simulated behaviour during the external outage. This changes the
earlier plan's prohibition on runtime simulation only for an **explicitly separate development
harness**, not for real Tide mode or public security claims.

Implement a separate loopback-only harness with:

1. Independent local test issuer/client, ephemeral signing keys and test-only public adapter.
   Keep issuer/key/data distinct from real recovery-vault. Never accept simulator keys under the
   real issuer or add an auth-disable/special-header bypass to real mode.
2. Three visibly simulated actors, local counted approvals (distinct actors, no repeat votes),
   pending/applied/denied transitions and intentionally delayed token/role propagation.
3. Real JWT signatures and real generated DPoP proofs using local keys, exercising the same
   strict verifier and real backend routes. Clearly state these signatures are NOT Tide/ORK proofs.
4. Separate disposable SQLite path and seeded synthetic BLOBs; no access to real operator env,
   real adapter, licence endpoints or real archive database. Simulator reset only affects that data.
5. A persistent highly visible “LOCAL SIMULATION — NO TIDE GOVERNANCE VERIFIED” banner on every
   page and in exported evidence. No automatic fallback from a failed real login to simulation.
6. Explicit separate launch command/port/build configuration. Real mode must reject simulator
   tokens. The production launcher must not mount simulator endpoints or actor-selection controls.
7. Browser tests for file → one approval insufficient → repeated same actor insufficient →
   second simulated actor → scoped grant → exact purge → survival/replay/expiry/tamper checks.

Prefer exercising the real backend with simulated external identity/governance over merely
rendering fake success responses in the UI. It tests our integration and transaction logic,
but cannot validate real enclave signing, ORK behaviour, IGA policy enforcement or resistance
to a real administrator's self-grant. Retest all of those on Tide when service returns.
