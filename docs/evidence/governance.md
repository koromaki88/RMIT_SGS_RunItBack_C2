# Agent 1 evidence — fresh recovery-vault environment

## Current plan/goal review — 22 October 2026

Reviewed the feature working tree against the project brief, coordination plan and frozen
contract, including the later user/organiser authorisation to simulate sign-in, roles and
access checks during the outage. This is a code review plus local test evidence, not an
independent security audit or a proof of Tide protection. Agent 2's pending final changes
are not included; their backend files were read but not edited in this pass.

### Goal alignment

| Original requirement | Current evidence / boundary |
|---|---|
| One compromised account cannot independently destroy recovery copies | Intended live guarantee is **unverified**. Simulation enforces distinct actor IDs, but anyone using its selector controls all demo actors. Never equate that with independent people. |
| Two real downloadable synthetic versions | SQLite stores actual BLOBs; HTTP tests verify original and surviving digests. |
| Frozen exact operation, recipient, client, expiry | Canonical manifest/hash and server-assigned identity remain; client cannot submit authority or expiry overrides. |
| No deletion on filing / first approval / repeat vote | Backend and simulation HTTP tests pass. |
| Exact recipient entitlement; one transaction and durable consumption | Existing execution tests cover identity/scope, tamper/expiry, rollback, conflict and restart; HTTP test covers simulated claims and surviving bytes. |
| Live Tide login, signed threshold >=2, independent approvals and no unilateral self-grant | **Blocked**, not replaced by simulation evidence. Licence watcher ended after 27 failed attempts; no activation confirmed. |
| Narrow scope: two views, one version per request, trusted host | Still appropriate. No need for uploads, encryption, separate executor, Redis or custom contracts within this deadline. |
| Honest runnable submission and video | **Needs Agent 3/human follow-up**: README and shot list still describe earlier live-only plans/placeholders. |

### Fixed: DPoP replay-cache lifetime

`src/lib/auth/verifyDpop.ts` previously retained replay entries until receipt time + skew.
A proof timestamped 59 seconds ahead is accepted with a 60-second skew, but remains valid
after that cache entry expires. A new regression in `src/lib/auth/auth.test.ts` accepted
the proof at t=0 and replayed it at t=61 seconds: the test failed before the fix (replay
incorrectly accepted). Retention now extends to `max(receipt time, proof iat) + skew`.
The same test passes after the fix. This closes a proof-replay gap; it was not evidence
of double purge, because durable execution consumption is a separate gate.

### Prioritised remaining findings / handoffs

Integration follow-up: the subsequent Agent 2/3 merge corrected the README/setup and
simulation shot list described in finding 2. That item is resolved for the current
working tree; real Tide evidence and the other live/browser checks remain outstanding.

1. **High — live governance approval target binding (Agent 1; before enabling live use).**
   `src/lib/tide/governance-client.ts:80-105` correlates replay rows by substring, rather
   than exact schema/field equality. `approveGovernance` later accepts a CR ID without
   the expected frozen operation; UI-linked metadata can be replaced by a trustee.
   A misleading link can therefore send a human toward an unrelated pending CR.
   The enclave remains an approval boundary and links alone cannot execute a purge,
   but this is not a sufficiently trustworthy operation-review workflow. Validate the
   exact supported action, realm role, recipient and rows against the frozen request
   immediately before prompting; reject unrelated/ambiguous or edited CRs. Use actual
   live payload/schema evidence rather than guessing it during the outage.
   Tide MCP's current `iga-change-requests-api` confirms our `/approve` two-phase lane
   and `APPROVED = committed/applied`; no endpoint migration is needed on this evidence.

2. **High — submission claims and runnable setup (Agent 3/human; before publishing).**
   `README.md:3-7,16-27` presents the core live trust guarantee as achieved; setup at
   lines 35-48 is still placeholder. `docs/submission/shot-list.md:7-20` still assumes
   real enrolment, independent signers and live tokens. Put the outage/simulation
   disclosure beside the headline; distinguish intended Tide protection from tested
   application behaviour. Use the working commands and limits in `docs/SIMULATION.md`.
   Keep the <=300-word judging overview, setup separately, and actual MP4/submission
   requirements. Do not publish with placeholders or film simulated actors as real trustees.

3. **Medium — browser-state correctness/coverage (Agent 3 + integration).**
   `src/app/page.tsx:25-62` has no cancellation/generation guard: overlapping refreshes
   can replace newer data with older responses. `requests-section.tsx:128-135,357-560`
   uses one busy string while other action buttons remain enabled; overlapping actions
   can prematurely clear it. Its clock refreshes relative time but not the server's
   request-state snapshot, leaving expired FILED actions visible until reload.
   These do not bypass backend checks, but can confuse the rehearsal. Prefer narrow
   stale-response guards and consistent mutation locking over new state libraries.
   The HTTP simulation script does not exercise DOM behaviour or the governance-link
   PUT route; do one actual browser walkthrough after final integration.

4. **Medium — recoverable configuration fetch (Agent 1; follow-up).**
   `src/lib/simulation/client.tsx:6-11` caches a rejected runtime-mode Promise forever;
   the provider's Retry button cannot recover from that initial network failure without
   a full reload. Clear a rejected cache and validate the mode explicitly when fixing;
   never make failure default to simulation.

5. **Low — local simulation growth/clarity (Agent 1; not a purge bypass).**
   `src/lib/simulation/server.ts:61-75` scans accumulated grants and retains expired
   sessions; switching actors leaves the previous session alive. Expired/consumed
   entitlements can still appear in fresh claims (the backend correctly refuses their
   execution). Prune expired sessions and consider filtering displayed active grants
   if rehearsals grow. Never delete request consumption/history just for tidiness.

6. **Low — documentation/module organisation (coordinate after merge).**
   `src/components/merge-seam.ts:1` and `client-api.ts:1-4` still claim there is no
   simulation/plain fetch path. `docs/evidence/code-review.md` is an earlier snapshot,
   not current simulator status. Keep historical evidence labelled; link current
   instructions rather than copying conflicting setup text. Eventually separate the
   runtime-mode loader from the simulation React provider and keep shared identity
   constants lightweight. Do not rename the seam or change shared contracts mid-merge.

### Optimisation judgment

- No performance benchmark was run; there is no demonstrated throughput problem to justify
  a new cache/database/worker architecture. Synchronous SQLite and digesting two tiny BLOBs
  are deliberate MVP tradeoffs, not reasons to break transactional safety.
- Unbounded request lists, linear in-memory replay-cache cleanup and accumulating operation
  roles need limits/cleanup for scale, not a deadline refactor. Replay storage also remains
  process-local and is lost on restart; durable operation consumption is not lost.
- Keep ignored data/adapters/private setup state out of Git. Tracked-path inspection found
  only public static relay/SSO assets under the checked private/public paths, not database,
  `.setup` or local adapter files. This was not a complete historical secret scan.

### Validation for this pass

- New future-skew DPoP regression: failed before fix; passed afterwards.
- `npm test`: **34 passed**.
- `npm run build`: compilation, TypeScript and route generation passed.
- `npm run test:simulation`: full existing HTTP lifecycle/restart/real-mode separation passed.
- `npm audit --omit=dev --json`: **0 known production dependency vulnerabilities** at check time;
  this is not proof of absence of implementation bugs.
- No live Tide call/approval, realm reset, dependency upgrade, staging, commit or push.

---

## Historical fresh-realm setup evidence

## BLOCKED: fresh vendor licensing, 22 October 2026

No live quorum or operation-specific entitlement proof exists yet. No adapter or mock
credentials were substituted. The retired environment was not restored.

### Observed setup

- User explicitly confirmed fresh licence email/Terms and local Docker.
- New container `recovery-vault-tidecloak` started on loopback port 8080.
- Realm `recovery-vault` and client `recovery-vault-client` created; intended browser origin
  is `http://localhost:3000`, with an explicit client audience mapper in the initial template.
- Initial `setUpTideRealm` failed during vendor wallet finalisation:

```text
TIDE-IDPEXT-VENDOR-KEYGEN_FAILED
The vendor key was created but the license could not be set up.
[Midgard] FinalizeWallet failed:
HttpRequestException: Response status code does not indicate success: 500
```

- A read-only `getLicenseDetails` call timed out. A documented `CreateTideVendorKey` lifecycle
  retry also returned HTTP 500 with `TIDE-IDPEXT-VENDOR-KEYGEN_FAILED`.
- Bootstrap stopped before enabling IGA, creating users, invitations, or adapter export.
- Doctor: realm exists, no adapter, IGA not enabled, no pending governance requests at check time.

### Local code checks

`npm test`: eight synthetic-key auth test groups passed. The tests exercise the real protected
handler and token/proof verifier with isolated keys, not a real enrolled account. Negative
cases include wrong/missing audience, issuer/client/identity/time claims, untrusted signatures,
unbound/Bearer requests, wrong proof URL/method/token hash/key, stale timestamps, and replay.

The browser governance adapter is implemented but unverified against a live governed role grant.
No signed threshold >=2, real operation role, recipient token, or live purge result is claimed.

### Single-person rehearsal disclosure

The human plans to create three distinct accounts themselves. Successful distinct-account
mechanics would not prove independence between real people. Do not label that rehearsal an
organisational separation-of-duties deployment.

### Needed before PASS

Successful licensing, legitimate browser linking, signed live threshold inspection, first-account
insufficiency, second distinct-account commitment, actual expected audience/role claims in the
recipient token, exact executor integration, and relevant unilateral bypass tests. Until then,
runtime execution must remain fail-closed; application counts or recorded status are not authority.
