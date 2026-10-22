# Three-hour delivery plan

## 1. Clock and ownership

**Three hours is a hard total budget, not a guarantee of feasibility.** Time already spent
on cleanup and handoff must be subtracted. Establish the actual submission deadline/timezone
now; label T+ times relative to the team's real start, never extend the deadline because a
chat session began late. If less time remains, bring gates forward and cut features.

Use three parallel sessions in this same checkout. No worktree merges are needed in this
timebox because file ownership is explicit. If separate machines are used instead, designate
one integration branch/operator; never transfer private adapters/credentials via public Git.

| Owner | Exclusive files / responsibility |
|---|---|
| Agent 1: identity + governance | `package.json`, lockfile, `tsconfig.json`, `next-env.d.ts`, `next.config.ts`, `.env.example`, `.gitignore`, `src/lib/auth/**`, `src/lib/tide/**`, `src/app/providers.tsx`, bootstrap/diagnostic scripts, private adapter, server lifecycle, `docs/status/agent-1.md`, `docs/evidence/governance.md` |
| Agent 2: backend | `src/lib/vault/**`, `src/app/api/vault/**`, `tests/vault/**`, `scripts/seed-vault.ts`, ignored vault SQLite, `docs/status/agent-2.md`, `docs/evidence/backend.md` |
| Agent 3: frontend + submission | All other `src/app/` pages/layout/styles, `src/components/**`, UI tests, `README.md`, `docs/submission/**`, `docs/status/agent-3.md` |

Agent 1 owns the package test scripts after Agent 2/3 send their command requirements.
Agent 2 owns new contract TypeScript source; the frozen contract is already specified in
`04-contract.md`. Do not ask Agent 1 to duplicate or own that module.

Do not edit the brief, shared contract, or workload assignments independently. The human
coordinator approves cross-owner changes. Do not use shared Git staging as a communication bus.

## 2. Schedule and critical path

| Time | Agent 1 | Agent 2 | Agent 3 |
|---|---|---|---|
| T+0–10 | Get fresh realm consent/hosting and available humans; scaffold package/provider; announce exact origin/client | Publish contract types; create SQLite schema and two tiny BLOB seeds | Build page shell against contract, no product mocks enabled by default; draft video/README outline |
| T+10–30 | Bootstrap fresh realm, user linking, real login; establish trustee/approval policy path | Implement authenticated list/download/file request; deterministic manifest hash | Connect list/download/request UI to real APIs as they land; integrate provider |
| T+30–45 | Prove live scoped grant, first approval blocked, second independent approval works; share token/audience/role evidence | Implement exact entitlement gate and transactional one-time purge, initially fail-closed | Add real governance controls around Agent 1's adapter; show unknown/blocked honestly |
| **T+45 gate** | **PASS with evidence, or BLOCKED with exact reason** | No relaxed auth fallback | No simulated approval-success UI |
| T+45–90 | Finish real browser governance adapter; fix the proven path only | Complete tamper/replay/expiry/transaction tests | Finish two views and live error/refresh states; finish setup instructions |
| **T+90** | One integrated live request from filing through execution | Two-file/digest and consumption evidence ready | No placeholders; coherent demo route |
| T+90–120 | Verify self-grant/threshold bypass cases; final build | Fix correctness failures, restart/concurrency tests | Rehearse with real humans; gather actual outcomes and limitations |
| **T+120 freeze** | No dependency/origin/realm changes except a blocker fix | No new backend features | No redesign; record first usable video take |
| T+120–135 | Final diagnostics, secret review, integration fixes | Redacted evidence and test results | Prepare final overview, demo file, screenshots/captions |
| **T+135–180** | Support recording/push checks | Support final verification | Human-led recording, MP4 size check, public repo and form submission |

Aim to record by T+150 and submit by T+165, retaining a buffer. If the hard deadline is
earlier, shorten implementation rather than recording/submission buffers.

## 3. Humans are on the critical path

The human coordinator must be available immediately for:

- Licence-management email, explicit acceptance of https://tide.org/legal, and hosting choice.
- First-admin enrolment and additional trustee linking in their browsers/password managers.
- At least two independent eligible approvals with a live threshold >= 2; target 2-of-3.
- Testing the actual browser app, recording, publishing, and form submission.

Agents must never collect passwords in chat, invent identities, or manufacture approvals.
No trustee availability means the full claim is blocked. Do not discover that at T+120.

## 4. Feasibility gate and contingency

Agent 1 posts one of the following by T+45 in `docs/status/agent-1.md` and tells both peers:

- **PASS:** exact issuer/client/audience, real role namespace, signed in-force threshold,
  relevant CR IDs, under-threshold failure and distinct second-approval success, plus known gaps.
- **BLOCKED:** exact failing operation, evidence/error, human dependency, and whether a bounded
  retry before T+60 is justified. Do not merely say “Tide is down.”

Treat an unapproved grant accepted by the executor, a unilateral self-grant route, inability
to bind the role to a manifest/recipient, or absent independent quorum as a security blocker.
Do not use a custom-contract deployment as a deadline workaround.

If blocked: keep destruction disabled, preserve working archive/auth functionality, and
prepare an explicitly partial submission. Separate product intent from implemented result.
There is no approved fallback where application `approvalCount` pretends to be Tide authority.

## 5. Integration contract and handoffs

All peers read `04-contract.md`. In particular:

- Public origin stays `http://localhost:3000`; identity service default is local port 8080
  only after human hosting confirmation. No agent changes the origin to debug a problem.
- Realm roles carry exact `vault-purge:<hash>` entitlement; no wildcard/reusable purge role.
- Agent 1 supplies the protected API verifier and browser governance adapter.
- Agent 2 supplies frozen manifest/hash, persistent APIs, and transactional execution.
- Agent 3 supplies the human review screen and calls those real interfaces.
- App request state and real Tide CR state are distinct; neither UI counts nor stored links
  are execution permission. A signed token is checked again at execution.

Milestone messages should be short: `READY <export/endpoint>`, `BLOCKED <cause>`, or
`CHANGE REQUEST <contract field + reason>`. Update your own status file on meaningful progress,
not in tight polling loops. The human coordinator relays messages if sessions cannot see each other.

## 6. Repository baseline

The checkout retains auth/config/relay building blocks and the new project plan only.
No `package.json`, app pages, adapter, profiles, dependency tree, seed, or running identity
service exists yet. Agent 1 supplies a new runnable foundation. The retired environment
is not a hidden dependency and must not be started without explicit user authorisation.

No agent should reset Git, discard another session's files, or commit/push without the
human's request. Report staged/untracked files accurately; the existing auth helpers and
brief already have Git history. Data, adapters, sessions, signatures with sensitive context,
licence configuration, and passwords must stay out of public commits/video.
