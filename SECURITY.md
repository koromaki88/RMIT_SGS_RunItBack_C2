# Security boundary and readiness

**This is a local hackathon prototype, not a production backup system.** Following the
organisers' outage guidance, the working demo simulates sign-in, roles and governance.
It does not prove that one compromised real administrator cannot manufacture authority.

## What the application enforces

- One frozen manifest binds exact target bytes, recipient, client, reason and 30-minute expiry.
- Execution requires the exact `realm_access.roles` entry `vault-purge:<manifestHash>`.
  Generic admin/trustee roles, client roles, wildcards and linked governance metadata do not count.
- Deletion and request consumption commit together in SQLite. Restarting does not restore
  purged bytes or make an executed request reusable.
- Real mode verifies pinned JWT issuer/client/audience, signature, subject and time claims,
  plus DPoP key binding, method/URL/token hash, timestamp and replay identifier.
- Explicit simulation mode has separate identity/data. It never substitutes for a failed
  real login, and its cookies cannot authorise real-mode APIs.

## What it does not protect

- Anyone using the local simulator can select all actors. Distinct actor IDs are not
  independent people, strong authentication, ORK identities or cryptographic governance.
- The backend, host, clock and SQLite are trusted. Root/server-code execution, storage
  compromise, malicious quorum and denial of service are outside the demonstrated boundary.
- SQLite stores plaintext synthetic BLOBs. Logical deletion is not physical secure erasure.
  Tide does not make this disk immutable or prevent ransomware encrypting unrelated files.
- DPoP is not protection from a compromised browser that can use its binding key.
- The replay cache is process-local and memory-only; restart or multiple processes cannot
  preserve proof replay history. Durable purge consumption is a separate SQLite check.
- There is no production rate limiting, multi-tenant isolation, complete immutable audit,
  antivirus, upload scanning or instantaneous token revocation guarantee.

## Known gaps before live use

1. **Governance operation binding:** live replay rows are correlated using substring matching.
   Approval receives a linked change-request ID, not a validated frozen-operation object.
   Validate exact role/action/recipient/rows immediately before a human approval, and reject
   unrelated, ambiguous or edited changes. A permitted trustee can replace observation links;
   that must not steer another trustee into approving an unrelated operation.
2. **Live policy evidence:** no successful licence activation, enrolled sign-in, signed threshold
   >=2, independent approval, scoped role issuance or authenticated Tide purge has been verified.
   Alternative self-grant/configuration paths still need testing. See [Tide readiness](docs/TIDE.md).
3. **Browser state:** overlapping refresh/action responses can show stale snapshots. Expiry
   labels can update while request-state controls remain stale until reload. The backend
   remains authoritative, but manual browser checks and stale-response guards are outstanding.
4. **Local recovery/scale:** the runtime-mode loader caches failed fetches until a page reload;
   expired simulation sessions/grants accumulate. Lists and in-memory replay cleanup are not
   designed for high volume. Do not clear consumption records to address growth.

## Test evidence

At the documentation refresh on 22 October 2026:

- 34 auth/UI-logic/vault tests passed, including a regression for future-skewed DPoP proof
  replay after the old receipt-time cache deadline. Retention now covers the full proof window.
- Production build and TypeScript passed.
- HTTP simulation checked missing identity/origin, member refusal, distinct/repeated votes,
  stale claims, recipient checks, exact purge, surviving digest, replay, restart and real-mode separation.
- The terminal demonstration completed with expected outcomes; it calls the core directly
  with unsigned synthetic claims and is not an assertion-based HTTP/auth test.
- `npm audit --omit=dev` reported no known production dependency vulnerabilities at check time.

These checks are not a live Tide assessment, browser accessibility audit, performance
benchmark or complete historical secret scan. Re-run tests after changes; see the
[commands in the README](README.md#commands).

## Handling private state and reports

Keep `.env*` secrets, `.setup/`, `data/`, adapters, cookies, tokens, invitation URLs and approval
models out of commits, recordings and bug reports. Never put bootstrap passwords in browser code.
When reporting a problem, provide the command, mode, Node version, expected/actual behaviour and
redacted status/error code. Report security-sensitive details privately to the repository owner;
do not publish usable credentials or exploit material in a public issue.
