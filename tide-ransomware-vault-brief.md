# Project brief: Dual-Control Recovery Vault

**Core insight:** One compromised account should not be enough to destroy an organisation's recovery options.  
**Mode:** Three-hour hackathon MVP, three parallel agents.  
**Status:** Fresh implementation starts here; retained auth helpers are not a running app.  
**Execution plan:** [Coordination](docs/implementation/00-coordination.md),
[Agent 1](docs/implementation/01-agent-auth-governance.md),
[Agent 2](docs/implementation/02-agent-vault-backend.md),
[Agent 3](docs/implementation/03-agent-ui-submission.md),
[shared contract](docs/implementation/04-contract.md).

## 1. Product and challenge fit

A fictional small logistics company delegates archive maintenance without giving one
operator the power to eliminate recovery copies. The operator requests destruction;
independent trustees must authorise that specific operation before the service will execute it.

**Tagline:** “One compromised login must not erase your way back.”

The useful possibility is delegated maintenance without unilateral destructive authority,
not a generic security dashboard. This is comparable to the official Dual-Control Expense
Desk and Guild Treasury examples: permission to acquire consequential authority must not
be manufactured by one administrator.

The public claim, only after live tests pass:

> One compromised application-admin account cannot independently obtain authority to purge
> the selected recovery version. Tide governs issuance of operation-specific authority;
> our trusted backend enforces its exact scope, expiry, recipient, and single execution.

## 2. Three-hour scope — replaces the earlier multi-day plan

### Must demonstrate

1. Real Tide sign-in against a fresh, legitimately bootstrapped realm/client.
2. Two small, real synthetic archive versions with downloadable bytes and SHA-256 digests.
3. File one purge request: return app `202`, freeze exact target/recipient/expiry, delete nothing.
4. One eligible account's approval is insufficient; repeating it cannot add an independent vote.
5. A second independent eligible account supplies the missing approval under the actual live policy.
6. A new, verified Tide token carries the exact operation entitlement only after commitment.
7. The backend removes only the authorised archive version, once; another version survives.
8. An unauthorised request, changed target, expired request, and replay cannot bypass the gate.

### Explicitly cut

- Uploads, soft-delete/trash, mass purge, re-keying, restore workflows, schedules, AI, notifications.
- Workspace profiles, custom artwork, complex landing pages, dashboards, and multi-tenancy.
- End-to-end document encryption: the MVP concerns destruction authority, not content secrecy.
- Maker–checker exclusion: two distinct eligible signers are required; the proposer may count as one.
- Custom Forseti contract deployment, cloud backup connectors, and immutable-storage integration.
- Separate executor container and claims of resistance to web-server code execution. The deadline
  MVP uses one trusted Next.js server process and a transactional SQLite archive.

The separate-executor architecture, filesystem partial-failure recovery, and broad production
hardening are future work, not tasks to squeeze into the last hour.

## 3. Threat boundary and corrections

**Attacker:** one member/operator/trustee account, including a usable browser session, calling
APIs directly or trying to acquire more authority. A token-string replay is an additional test,
not our only attacker model.

**Trusted:** backend code and pinned verifier configuration, SQLite/host, browser approval UI,
clock, and independence of the required trustees. Root, bootstrap credentials, arbitrary server
code execution, storage-provider compromise, malicious quorum, and denial of service are outside
the tested claim. One person controlling all demonstration accounts is not real organisational
separation of duties; disclose if it is used for rehearsal.

- Tide password verification is threshold-backed; our flow is not inherently passwordless.
- DPoP rejects a token string without its bound proof/key; a compromised browser can still act.
- Tide does not make SQLite or disk immutable and does not stop ransomware encrypting unrelated files.
- Application history is not an immutable or complete audit log.
- A role name `trustee` alone does not authorise a Tide enclave approval.
- A generic `approved: true` row or UI count must never authorise purge.
- SQLite deletion removes a version from the active archive. It is not secure erasure of database
  pages, replicas, or backups. Do not claim irreversible destruction of all physical copies.

## 4. Tide mechanism: proposed, not yet verified

IGA governs supported identity/configuration changes; it does not automatically understand
`PURGE_BACKUP`. We will first test a narrowly scoped use of its documented role-grant workflow:

1. The backend creates a canonical immutable manifest binding a random request ID, exact object
   version/digest, requester and execution recipient, configured client, timestamps, and reason.
2. Compute SHA-256; the candidate **realm role** is `vault-purge:<manifestHash>`.
3. Trustee proposes creating that role and granting it to the exact recipient through real Tide
   administrative APIs. These may be separate dependent IGA change requests.
4. Eligible trustees approve with their own DPoP-bound browser identities and real enclave signatures.
5. Inspect the live signed policy. Target 2-of-3, but never derive it from account count or fake it
   in React. The previous environment does not establish any threshold for this fresh realm.
6. After commitment, refresh/re-authenticate the recipient. A real signed token must include the
   exact role in `realm_access.roles`; other clients' roles and reusable `purger` roles do not count.
7. The backend independently verifies JWT, DPoP, exact role, recipient, manifest, expiry, and state
   before one transactional execution.

The token attests a committed operation-specific role grant, not an arbitrary filesystem-command
signature from Tide. Manifest binding and storage enforcement are application responsibilities.

### Blocking proof by minute 45

Agent 1 must prove that this precise grant needs independent approvals and that one administrator
cannot produce an accepted equivalent entitlement through an alternate permission path. Establish
how the trustee verifies the manifest behind the hash and what the enclave actually displays.

For quorum changes, use the signed in-force admin policy and required `REGEN_ADMIN_POLICY` flow.
The fallback `floor(admins × 0.7)` formula and “IGA enabled” are not proof of a live 2-of-3 gate.

No available second signer, unsupported role-grant behaviour, ambiguous claims, an ungoverned
self-grant, or inability to establish a live threshold is a blocker. Report it immediately.
Do not silently replace this with application-only voting or demo tokens. A custom signing
contract is not a three-hour fallback: experimental deployment requires Tide's team.

If blocked, keep execution disabled and submit only a clearly labelled partial prototype with
real implemented capabilities. That is honest, but does not fulfil the full core demo promise.

## 5. Transactional archive — deliberate deadline simplification

Store two small synthetic document byte arrays as SQLite BLOBs alongside metadata and request
records. Serve those exact bytes for download; do not just display invented filenames/sizes.
Agent 2 owns the canonical manifest and hash implementation specified in the shared contract.

For execution: validate the real credential and proof, begin an immediate SQLite transaction,
re-read the frozen request, check expiry/recipient/role/state and target digest, delete exactly
that BLOB row, and mark the request executed in the same transaction. Commit or roll back both.
This avoids pretending filesystem deletion and a separate SQL update are atomic.

Use a single process with the retained process-local DPoP replay cache; preserve operation
consumption in SQLite across restarts. A multi-worker/serverless deployment needs a shared replay
store. No raw-path deletion, overwrite, arbitrary SQL, reset, or unauthenticated seed endpoint.

## 6. Real Tide integration requirements

- Fresh realm setup requires the human's licence email and explicit agreement to
  https://tide.org/legal, then hosting choice, before provisioning. Never recycle past consent.
- The user/team enters personal credentials and signs approvals; agents do not impersonate them.
- Pin expected issuer/client/audience and embedded adapter keys; require expiry and subject.
  Fail closed on unknown identity/configuration. Do not introduce remote-JWKS/master-secret fallbacks.
- SDK `secureFetch` uses absolute URLs and DPoP; verify the proof server-side, not only in React.
- Browser approvals go directly to TideCloak with each person's own token, never a shared service
  identity. Use current `/iga/change-requests/<id>/approve`, handle `needs-approval`, sign the returned
  model, POST it back, and inspect actual commitment. Do not replace signed models with app data.
- Distinguish app request IDs, real CR UUIDs, and role IDs. App `202` is not Tide approval.
- List fields include `authorizationCount`/`authorizers`; approval replies may use `authCount`.
- Re-read a CR as `PENDING` before denying/editing. Denial does not undo prior commitment, issued
  tokens, or execution. Prefer omitting deny/edit controls in the deadline UI.
- Token role propagation can lag; refresh/re-authenticate, do not fake a granted role locally.
- Revocation is not instant for cached credentials. Independently enforce manifest expiry and
  durable consumption; make no instant-revocation claim.

## 7. Demo and submission

Two views: Archive and Purge Requests. No branded landing-page detour.

Two-minute narrative: benefit (15s), actual recovery file and blocked one-account execution
(30s), first real approval still insufficient (20s), second independent approval and role propagation
(30s), exact execution and replay refusal with another version intact (15s), limits (10s).

Record real results. Do not claim the entire bypass matrix passed if only selected paths were tested.
Prepare the README overview with all five judging prompts within 300 words, setup separately,
and a two-minute `.mp4` under 100 MB in the public repository. The human submits the repo link
through https://forms.gle/HRHYjnqB86j1LFS97. Publishing the repo is not submission.

## 8. Handoff and stop rules

The three workload files are copy-ready prompts with non-overlapping ownership, milestones,
and acceptance criteria. The coordination file owns the three-hour schedule; the shared contract
owns field names and endpoint shapes. Do not independently redesign them in three sessions.

The human has selected the vault direction and a clean start retaining auth helpers. No old
application, profile system, or identity container is part of this implementation. No fresh realm
has been created yet. Agents must not restore retired code/credentials to save time without consent.

Still confirm immediately: actual hard deadline/timezone (subtract cleanup/coordination already
elapsed), fresh licence/Terms/hosting, availability of three linked trustees/two independent signers,
and who will record/push/submit. These are immediate dependencies, not paperwork for the last hour.

## 9. Sources and status

- Challenge and sample ideas: https://tide.org/unlocked/ and https://tide.org/unlocked/config.js.
- Tide MCP current `iga-change-requests-api` canon: lifecycle, caller identity, signed threshold,
  `REGEN_ADMIN_POLICY`, and deny/edit caveats. Prefer it over older generic scenario snippets.
- Tide MCP `policy-governed-signing`: custom contract requirement; deployment is not self-service.
- Retained auth helpers have prior isolated synthetic-token test evidence, but fresh live login,
  multi-person governance, scoped role issuance, and transactional purge are not yet tested here.

**Never trade away the security boundary to meet the timer. Reduce claims and features instead.**
