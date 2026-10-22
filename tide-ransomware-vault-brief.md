# Project brief and implementation plan: Dual-Control Recovery Vault

**Working title:** Dual-Control Recovery Vault  
**Original concept:** Ransomware-Resilient Vault  
**Revised:** 22 October 2026  
**Status:** Reviewed design and implementation plan; vault functionality is not implemented.

> **Core insight, retained:** One compromised account should not be enough to destroy an
> organisation's recovery options.
>
> **Prototype promise:** An attacker controlling one application-administrator account cannot
> permanently purge a specified recovery set through the protected service without the required
> independent Tide-governed approvals. Routine administration does not confer unilateral purge authority.
>
> **Important boundary:** This is not antivirus, a passwordless-login claim, immutable storage,
> or protection against root access to every host and storage system. The proposed operation-bound
> authorisation design must pass a live feasibility test before we advertise the promise as implemented.

## 1. The useful possibility

A small company can delegate everyday archive administration without giving one employee,
administrator, or stolen account the power to erase its recovery copies alone.

**Demo setting, proposed:** Harbourline Freight, a fictional logistics company. Use small,
synthetic dispatch manifests, supplier invoices, and operational exports. No real payroll,
medical information, credentials, or customer data.

The operator needs to manage the archive. Three trustees jointly control permanent destruction.
The product lets the company distribute maintenance work without concentrating irreversible
authority in that operator's account.

**Working tagline:** “One compromised login must not erase your way back.”

### Why this fits the challenge

The possibility is delegated archive management without unilateral destruction authority,
not simply a ransomware dashboard. The official Dual-Control Expense Desk and Guild Treasury
examples similarly protect who may acquire consequential authority; Matter Room separates
administration from authority over data.

The visible story is: maintain archive → request purge → one account cannot complete it →
independent approval permits the exact intended operation. Spend demo time on that outcome,
not on login mechanics or a general-purpose access-control panel.

Ordinary login plus an application-admin flag would let that administrator execute the purge.
Our proposed difference is an operation-specific entitlement whose issuance requires real Tide
governance, plus a service that refuses execution without that entitlement.

## 2. What changes from the original brief

| Original assumption | Refined requirement |
|---|---|
| “Survives a fully-compromised administrator” | Specify a compromised application/Tide realm-admin account; exclude root/storage/operator compromise unless an independently enforced boundary is actually built and tested. |
| “No password exists to phish” | Our Tide setup uses username/password authentication. Describe threshold-backed verification, not passwordlessness or immunity to phishing. |
| “A stolen session is worthless” | Demonstrate that the token string alone fails replay without its bound DPoP key/proof. A compromised legitimate browser may still act as its user. |
| Every file deletion automatically becomes a Tide IGA request | IGA captures supported identity/configuration changes. A document purge is our application operation, not an invented Tide action type. |
| Permanent trustee/purge role authorises deletion | A reusable purge role could leave a later-compromised holder with unilateral destructive authority. Use operation-bound, expiring, single-use authority instead. |
| Quorum calculated from administrator count in React | Read the live signed policy and prove the threshold through under-threshold and successful tests. |
| Requester never counts as an approver | Not assumed. MVP proposes two distinct eligible approvals out of three; the requester may supply one. Maker–checker exclusion is deferred. |
| Governance panel is an immutable audit log | Show request history and verifiable evidence where available. Do not claim an immutable or complete log. |
| Mock entries demonstrate actual recovery resilience | Synthetic data is fine; use small actual files and persistent state to demonstrate a real protected purge. A mock-only result must be labelled a simulation. |

The implementation history is also corrected: we have a working TideCloak authentication
foundation and an Incident Evidence Room scaffold, **not** an existing Dual-Control Expense Desk.

## 3. Threat model and honest claims

### In scope

- An attacker controls one member, operator, or trustee account, possibly including a usable
  browser session. Do not rely solely on token-replay protection to defeat this attacker.
- They call APIs directly, forge UI approval counts, repeat requests, and substitute target objects.
- One privileged account attempts to grant itself execution authority, add trustees, lower the
  threshold, or change the claims used to authorise execution.
- A captured token string is replayed without its bound proof/key.
- The application database contains misleading “approved” state; the executor must not treat
  that state alone as permission to delete.

### Trusted components / outside the MVP claim

- The executor's code, pinned identity-verification configuration, clock, and persistent database.
- Its host/container isolation and the actual storage backing the recovery files.
- The browser while it displays data and asks a human to approve an operation.
- The independence of the required trustees; colluding or jointly compromised quorum members
  can authorise an operation.
- Bootstrap/master credentials and infrastructure root access. These are not ordinary runtime
  administrator accounts and must not be accessible to the application.

### Explicit exclusions

- No prevention of phishing itself, endpoint infection, arbitrary lateral movement, or exfiltration
  of data the compromised account is already allowed to read.
- No guarantee that the service remains online under denial of service or host destruction.
- No guarantee against direct storage deletion by its root/provider administrator. Independent
  retention/WORM storage would be a separate integration, not something Tide supplies automatically.
- No regulatory-compliance claim, legal recoverability certification, or production ransomware claim.
- No erasure of plaintext or backups someone already copied.

Separate the Tide ORK cryptographic threshold, the administrative approval threshold, and the
number of business trustees. They are different quantities.

## 4. Tide capability review

Evidence labels below distinguish documentation from our actual tests.

| Capability | Evidence / status | Application use |
|---|---|---|
| Tide login and real adapter | Existing realm enrolment and repeat console login succeeded | Reuse identity foundation; still test fresh app sessions as each trustee. |
| Server JWT + DPoP verification | Eight isolated synthetic-token tests passed; runtime relay checks passed | Validate signatures, identity/client claims, binding, method/URL/token hash, expiry, and replay. Not a substitute for live multi-user tests. |
| IGA governance of supported changes | Documented; existing realm has captured real attribute changes | Govern the specific role grants and configuration transitions on which purge authority depends. |
| MultiAdmin enclave approval | Documented two-phase `/approve` ceremony | Each eligible trustee signs using their own browser session. Not yet live-tested as 2-of-3 in our deployment. |
| In-force multi-admin quorum | Last bootstrap evidence showed threshold 1 | Requires additional linked admins, policy regeneration as appropriate, read-back, and live tests. Never label current setup “2 of 3.” |
| Arbitrary `PURGE_BACKUP` IGA operation | Not established | Do not invent such an endpoint/action type or relabel an unrelated governance request as a file-purge signature. |
| Direct operation signatures via Forseti | Policy-governed-signing scenario documented | Optional alternative, not assumed available. A custom contract is deployed by Tide's team, not by us. |
| `RelationshipAttestation:1` | Built-in encryption/decryption pattern, network availability not tested here | Not an arbitrary signing/deletion contract. Not required for the first availability-focused MVP. |
| Immutable storage / audit history | Not provided by these auth/governance checks | Storage isolation and durable execution records are application responsibilities; avoid “immutable” wording. |

**Documentation reconciliation:** The broad governance scenario contains older advice about
threshold calculation and proxying approvals. Prefer the focused current
`iga-change-requests-api` canon: inspect the signed policy and send approvals directly with
each human's own identity. “IGA enabled” does not prove that every administrative path is governed.

## 5. Scope: one protected destructive operation

### Required MVP

1. View a seeded archive of small, actual synthetic files and explicit object versions.
2. Read/download a permitted file; retain its digest so survival can be demonstrated.
3. Submit a request to **permanently purge an explicit set of versions**.
4. Review the exact scope, reason, proposed executor, and expiry.
5. Collect a real, verified Tide-governed threshold of approvals for operation-bound authority.
6. Execute the purge once, only against the authorised versions.
7. Show that a one-account attack did not remove the recovery file and that it remains downloadable.
8. Show a legitimate independent approval path and its resulting execution record.

### Deliberately deferred

- General upload UI, soft deletion, empty-all-trash, retention-policy editing, re-keying,
  mass restoration, scheduled backup jobs, and changing encryption keys.
- End-to-end file encryption: confidentiality is a separate promise from recoverability.
- Maker–checker exclusion, custom trustee-role policies, identity recovery workflows,
  notifications, a ransomware simulator, and an “attack replay” page.
- Multi-tenancy, production cloud backup connectors, and multiple executor instances.

If time remains, add append-only upload of new synthetic versions. Do not implement overwrite
or replacement of existing recovery versions as an ungoverned shortcut around protected purge.

## 6. Proposed implementation: operation-bound authority using governed role grants

**This is an engineering proposal built from documented primitives, not an officially verified
Tide recipe. Phase 1 is a blocking proof-of-capability experiment.**

Why investigate this first: Tide already governs role grants and signs identity/permission
claims. We may bind a grant narrowly enough to authorise one purge without deploying a custom
signing contract. This is different from asking Tide to sign arbitrary file-deletion commands.

### 6.1 Immutable purge manifest

The executor, not the UI, creates and stores a manifest containing:

```json
{
  "schema": "vault-purge-v1",
  "requestId": "random-unique-id",
  "operation": "PURGE_VERSIONS",
  "vaultId": "harbourline-demo",
  "objects": [
    { "objectId": "opaque-id", "version": 1, "sha256": "digest-of-exact-file" }
  ],
  "requester": { "issuer": "pinned-tide-issuer", "subject": "verified-subject" },
  "executorSubject": "intended-caller-subject",
  "executorAudience": "configured-executor-audience",
  "createdAt": "UTC timestamp",
  "expiresAt": "bounded UTC timestamp",
  "reason": "Human-readable reason"
}
```

Define one canonical serialization: fixed schema, normalized timestamps, sorted unique
object/version tuples, explicit field types, and no unknown fields. Test hash determinism.
Hash the complete canonical manifest with SHA-256. A changed target, digest, expiry, reason,
recipient, or operation creates a new request and requires a new entitlement.

Candidate entitlement name: `vault-purge:<manifest-sha256>`. Pin the exact client-role namespace
or exact realm-role location during the spike; never accept a matching name from any client.
The unguessable request ID is inside the hash, so a previous grant cannot authorise a new request.

The executor is the source of truth for its manifest. An app-supplied role description or UI row
must not be allowed to substitute a different meaning for the hash.

### 6.2 Proposed live flow

1. Authenticated member/operator files a request with the executor. It validates and freezes
   the manifest and returns **app-level** `202` plus its own request ID. No bytes are removed.
2. An authorised trustee uses their own browser session to propose the exact request-specific
   role and grant to the manifest's intended caller through supported Tide admin APIs.
   Role creation and role assignment may produce separate IGA requests/dependencies.
3. Persist the mapping between the manifest hash and each actual IGA request ID. Inspect the
   proposed grant's target user/client/role, not merely its description or reported status.
4. Eligible linked admins review and approve the governed changes in Tide's enclave. The
   threshold must be at least two distinct accounts and demonstrated as such.
5. Before the grant commits, a fresh execution attempt must fail. A UI “approved” flag is irrelevant.
6. After quorum commits the grant, refresh/re-authenticate the designated caller. Confirm the
   exact entitlement appears in an independently verified Tide token. Do not assume instant propagation.
7. The caller sends that token and a valid DPoP proof to the executor. The executor independently
   validates identity, the exact entitlement and its manifest, expiry, and unused execution state.
8. The executor durably reserves that operation, purges only its frozen versions, records the
   outcome, and marks it consumed. A new token cannot revive a consumed/expired request.

**What the JWT means:** it is evidence of the committed operation-specific role grant, not a
generic Tide signature over a filesystem command. The manifest-to-role binding and storage
enforcement belong to the executor. The experiment must prove that one administrator cannot
manufacture an equivalent signed entitlement through another path.

### 6.3 Checks that decide whether this design is viable

- Governed creation/grant of the exact entitlement works in the current realm and SDK.
- The actual in-force gate requires two independent approvals for every relevant change,
  including role assignment. No `ADOPT_*`/bootstrap path silently becomes a runtime shortcut.
- The token signing path rejects an unapproved role grant or forged role-producing mapper.
- One account cannot bypass the gate using group membership, composite roles, alternate role
  namespaces, client scopes/mappers, admin-role grants, policy regeneration, or disabling governance.
- The intended client/audience and role claim are signed, emitted, and independently verifiable
  at the executor. Configure any new audience/origin through the legitimate governed route.
- A trustee can understand the exact destructive scope they are approving. A raw opaque hash
  alone is insufficient informed review. Verify actual enclave rendering and independently
  compare the executor's frozen manifest; do not claim the popup signs details it does not show.
- A stale role-bearing token cannot extend a manifest's expiry or authorise another request.

If any critical check fails, do not build an attractive approval panel around a broken authority
model. Record the failing operation and ask Tide for a supported integration path.

### 6.4 Alternative: direct policy-governed operation signing

Use only if Tide confirms an available, suitable contract/model and its live approval flow.
The signed payload must bind the same manifest, recipient, expiry, and one-time operation;
the executor must verify the resulting authority and still enforce execution constraints.

Current scenario guidance says generic policy-governed signing needs a custom contract.
We may write and compile-check one, but Tide's team performs experimental deployment.
Do not upload a contract ourselves or substitute `RelationshipAttestation:1`/
`AttestationUnit:1` for an arbitrary purge contract.

**Fallback honesty:** A normal app approval queue backed only by a JSON `approvalCount` is
a simulated workflow. It is not a successful implementation of the central Tide-backed promise.
If neither authority path works within the deadline, disclose the blocker and re-scope with the team.

## 7. Execution and storage boundary

### Target topology

```text
User browser ── Tide login / personal DPoP session ── TideCloak + ORKs
      │                   └─ trustees approve actual IGA changes in enclave
      │
      └─ web UI / routing ── protected vault executor ── recovery blobs + executor DB
                            independently verifies token, DPoP, manifest, single use
```

- The web UI/application service has **no write/delete mount or storage credentials** for
  the recovery blobs or executor database.
- Only the executor owns those resources. There is no unprotected maintenance/delete endpoint,
  raw shell command API, or writable file-path parameter.
- Prefer a separate non-root container/service. Keep trusted host/root administration explicitly
  outside the application-account threat model. Two processes running as the same OS user are
  not an isolation boundary against arbitrary code execution.
- A same-origin reverse-proxy route may expose the executor while keeping browser origin
  `http://localhost:3000`. Preserve the caller's identity and proof; verify DPoP against a
  pinned public URL/path mapping rather than trusting arbitrary forwarded headers.
- Trustees' Tide approval requests go browser → TideCloak with their own tokens. The app
  must not approve as a shared service account or mint admin tokens at runtime.
- If a same-process executor is temporarily used for early development, label it a trusted-server
  prototype. Do not claim separation from a compromised web-server process.

### Storage and crash consistency

- Store real synthetic blobs with opaque identifiers and immutable version numbers. Validate
  digests at request creation and before execution; reject replaced or missing targets.
- Persist requests, consumed operations, and evidence in SQLite, not process memory.
- Atomically transition a validated request into `EXECUTING` before deletion. Concurrent or
  repeated executions must not start another destructive operation.
- Filesystem deletion and SQL commit are not one transaction. Persist intent and per-object
  progress; on crash, resume only the same already-authorised manifest or mark it `PARTIAL`.
  Never expand its scope, silently mark it successful, or retry against new versions.
- If authority expires before execution starts, refuse it. Document the policy for a crash during
  an already-started operation; a recovery worker may only finish that frozen operation.
- Use safe ID-to-path lookup, reject symlinks/traversal, and never accept caller-supplied paths.
- DPoP replay state must be shared by all workers handling the same protected resource or the
  service must be explicitly single-process. Keep manifest consumption durable across restarts.
- Revoking a role does not instantly invalidate all issued JWTs. Manifest expiry, execution
  state, and any cancellation policy are separate executor checks; document the bounded window.

Object-store retention/WORM and off-host replicas are later production integrations. They
are not prerequisites for the narrow application-account demo, but are essential before a
stronger claim about infrastructure-level ransomware recoverability.

## 8. People, roles, and quorum

| Identity | Intended authority |
|---|---|
| Member/operator | List permitted archive data, download permitted files, file purge requests. No standing purge authority. |
| Trustee A/B/C | Three separate linked people/accounts eligible under the actual Tide policy. Review supported governed changes with their own enclave sessions. |
| Per-request execution recipient | Receives only the exact operation-specific entitlement after quorum; expiry/single use are enforced by the executor. |
| Bootstrap operator | Owns private setup credentials; not an app runtime identity or a stand-in for trustee approvals. |

**Proposed MVP policy:** two distinct eligible approvals out of three trustees. A requester who
is also eligible may count as one approval; they cannot count twice. Excluding the requester
would be a separate maker–checker requirement and is not claimed.

Initially map trustees to the actual `realm-management` client role `tide-realm-admin`, as
required by the verified governance path. A display label or new `trustee` realm role does not
automatically authorise enclave approvals. A narrower custom approver policy is future work
unless its coupling and live threshold can be verified within the spike.

Adding three admins does not itself establish 2-of-3. Read the signed admin policy and commit
any required `REGEN_ADMIN_POLICY` through the legitimate existing approval path. Guard against
locking out the available trustees; document the progression before making changes.

Two independent signatures are the security property; one person holding three accounts can
exercise the mechanics in a rehearsal but is not a real separation-of-duties deployment.

## 9. Tide API integration rules

- Browser calls use SDK `secureFetch` with absolute URLs and real DPoP proofs.
- Protected app/executor APIs verify JWT signature against the pinned adapter's embedded key,
  issuer, intended client/audience, required time claims/subject, and exact role namespace.
  Then independently verify the bound DPoP proof and replay limits. Fail closed.
- A browser UI role check is only presentation, not authorization.
- Distinguish app request IDs from actual Tide CR UUIDs. App `202` means filed, not Tide-approved.
- Governance base: `/admin/realms/<realm>/iga/change-requests`.
- Approve: `POST /<id>/approve` with `{}`; handle `mode: needs-approval` by signing the returned
  model in the enclave, then POST the signed `requestModel` back. Read `committed`/status;
  an enclave popup alone is not proof the change applied.
- Approvals must preserve each human's caller identity. Never replace it with master/automation
  credentials. Prefer direct browser-to-TideCloak calls as the current canon prescribes.
- List results use `id`, `authorizationCount`, and `authorizers`; approval responses may use
  `authCount`. Do not default an unknown count to zero or derive authorization from UI numbers.
- Tide CR statuses are `PENDING`, `APPROVED`, `DENIED`, `CANCELLED` in current documentation.
  `APPROVED` means applied; app `EXPIRED` is a different state, not a fabricated Tide status.
- Re-read before deny/edit; never call them on completed requests. Current guidance warns
  these endpoints can relabel completed requests or wipe authorizations without undoing effects.
- Denial of a pending grant blocks its issuance; it does not magically revoke an already-issued
  token or undo a deletion. Do not make “deny is always harmless” a security claim.
- Strip trailing slashes before joining URLs. Do not casually change localhost ports/origins.

## 10. Product UI and minimal API/data design

### Two screens, not a four-page security dashboard

**Archive:** seeded recovery sets, versions, digests, availability, download, and “Request permanent
purge.” Clearly separate reversible UI actions from actual permanent deletion. First MVP has
no direct-delete button, soft-delete path, or misleading protection-level labels.

**Purge requests:** exact files/versions, reason, recipient, expiry, actual approval progress,
Tide CR links, and execution outcome. When one account signs: “One approval recorded; files
remain available.” Show the legitimate second approval and execution separately.

Use existing display names as self-asserted labels; security decisions use verified stable IDs.
No name, token, request count, or role selected in the browser is authoritative.

### Suggested executor endpoints

| Endpoint | Behaviour |
|---|---|
| `GET /vault-executor/objects` | Authenticated permitted metadata; no storage credentials. |
| `GET /vault-executor/objects/<id>/versions/<n>` | Permitted download; no arbitrary paths. |
| `POST /vault-executor/purge-requests` | Validate/freeze manifest, persist, return app `202`; no deletion. |
| `GET /vault-executor/purge-requests/<id>` | Read permitted status and immutable scope. |
| `POST /vault-executor/purge-requests/<id>/execute` | Require exact committed entitlement and valid caller proof; consume once. |
| `GET /vault-executor/purge-requests/<id>/evidence` | Redacted execution/evidence export, not an immutable-audit guarantee. |

Enforce request size/rate limits, expiry bounds, exact field validation, and explicit response
codes (`401` invalid authentication/proof, `403` insufficient authority, `409` state conflict,
`410` expired request, `503` unavailable dependency). Execution must never fall back to allowing
deletion when governance, token verification, or storage validation is unavailable.

### Suggested persistent records

- `objects`: opaque ID, version, storage reference, content digest, size, availability.
- `purge_requests`: frozen canonical manifest/hash, intended subject, expiry, state.
- `governance_links`: exact role/client/user and real CR IDs; observed evidence, not authority by itself.
- `executions`: unique manifest hash/request ID, reserved time, per-object progress, result.
- `events`: request/approval observations and executor decisions, clearly labelled app records.

Application lifecycle: `FILED → GOVERNANCE_PENDING → AUTHORITY_OBSERVED → EXECUTING → EXECUTED`.
`AUTHORITY_OBSERVED` is informational; revalidate the actual credential at execution.
Terminal outcomes also include `DENIED`, `EXPIRED`, `FAILED`, and `PARTIAL` as appropriate.
Do not infer that a Tide status change reverses an executor state.

## 11. Detailed implementation plan

Estimates are rough focused engineering time, excluding unavailable humans/network support.
Do not interpret them as a promise. No product/realm changes are authorised by this planning
document alone; confirm the decisions in section 15 before implementation.

### Phase 0 — establish a safe baseline (30–60 minutes)

- Confirm deadline/timezone and realistic remaining hours; prioritise proof over presentation.
- Confirm repository/realm reuse, trustee availability, and the narrow threat boundary.
- Record current Git status without altering staging. Preserve unrelated team changes.
- Inspect current Docker image digest, adapter, IGA mode, signed admin threshold, pending CRs,
  available roles, and client/audience/origin configuration through read-only checks.
- The last known pending `SET_USER_ATTRIBUTE` request came from the old profile attempt.
  Inspect and classify it; do not auto-approve or delete it as “cleanup.”
- Back up before authorised governance changes; keep backups, credentials, links, and adapters private.

**Exit:** baseline recorded; team agrees what one compromised account means.

### Phase 1 — blocking authority spike (2–4 hours, possibly longer)

- Arrange three genuine linked trustee identities using the legitimate browser/enrolment flow.
  The agent never invents personal credentials or signs on someone's behalf.
- Safely establish and inspect a live threshold of at least two for the relevant grants.
- Create one harmless synthetic purge manifest and its exact request-bound entitlement proposal.
- Exercise role creation and role-grant dependencies with real CR UUIDs and enclave approvals.
- Confirm first approval cannot grant usable authority; repeat from the same account cannot help.
- Confirm an independent second approval commits and a newly issued token contains only the
  expected, correctly scoped entitlement. Record issuer/client/audience and claim location.
- Exercise the alternative-grant/configuration bypass cases in section 13.
- Inspect the exact approval card and establish how a trustee verifies the manifest meaning.
- Do not touch actual recovery objects during this spike.

**Exit:** a short evidence record demonstrates the one-to-two approval transition and exact
operation binding. If unsupported, pause and ask Tide about section 6.4; do not quietly substitute
ordinary backend approval counts. Lack of a viable authority path is a project blocker.

### Phase 2 — build the executor and durable archive (2–4 hours)

- Add a minimal separate executor service/container with pinned verifier configuration and no
  bootstrap credentials. Mount archive/SQLite only there; keep the web app outside that mount.
- Implement canonical manifests and deterministic hashes; add strict schema tests.
- Seed small actual synthetic blobs with version/digest metadata using create-exclusive writes.
- Implement authenticated read/download and request filing without deletion authority.
- Implement exact-token entitlement checks, expiry, durable single-use reservation, and safe
  version-scoped purge with per-object crash recovery records.
- Resolve public URL/DPoP verification through the chosen route and trusted proxy configuration.

**Exit:** direct calls cannot delete without exact authority, the archive survives rejected
requests, and persistence/restart tests pass.

### Phase 3 — connect governed grants to the product (1–3 hours)

- Add a small browser-side governance adapter for the tested role creation/grant/approval flow.
- Map each request to all relevant Tide CRs, including dependencies; refresh status after actions.
- Use current `/approve` two-phase exchange and each trustee's own DPoP-bound token.
- Refresh the execution recipient's session after commit; handle delayed claims honestly.
- Link the frozen manifest review to the real governed grant. Never present unrelated CRs as purge approval.
- Keep execution unavailable on unknown/failed state, expired manifest, or absent entitlement.
- Request-specific role cleanup is maintenance only, through governed operations; expiry and
  consumption must work even if cleanup is delayed or no cleanup job runs.

**Exit:** end-to-end protected purge works without admin credentials or simulated signatures.

### Phase 4 — build the two-screen product (1–2 hours)

- Replace incident-specific copy with the chosen recovery-vault story; rebrand only with approval.
- Retain working auth/profile components and accessibility; do not rebuild login.
- Add Archive and Purge Requests views with accurate real state and useful error messages.
- Show a recoverable file/download before and after the blocked one-account attempt.
- Show actual two-person authority issuance and resulting purge separately.

**Exit:** someone unfamiliar with Tide understands the delegated-maintenance benefit in one minute.

### Phase 5 — adversarial tests and evidence (1–3 hours)

- Run the full matrix below against the real integration, not only mocks.
- Run build/type checks, unit/integration tests, Tide doctor, and served-relay checks.
- Verify file digests before/after failed attacks, persisted single-use state after restart,
  and correct partial-failure behaviour.
- Record known exclusions and failures. Do not write “secure” or “immutable” as a substitute
  for identifying which test passed.

**Exit:** the core claim has repeatable evidence; incomplete areas are disclosed.

### Phase 6 — package the submission (45–90 minutes)

- Write the five-prompt project overview within 300 words, with setup separate.
- Record a two-minute MP4 under 100 MB, place it in the public repository, and submit its link
  through the official form before the applicable deadline.
- Remove secrets/session URLs from screenshots and videos; inspect the actual staged diff.
- Do not commit/push on the user's behalf without explicit instruction.

**Rough total:** approximately 9–19 hours if the authority spike succeeds; external contract
deployment, unavailable trustees, or networking issues can exceed that. If time is shorter,
omit upload, custom history export, and visual polish—not the independent approval or executor checks.

## 12. Suggested code organisation

```text
RMIT_SGS_RunItBack_C2/
  src/app/vault/                         archive view
  src/app/purge-requests/                request/review view
  src/lib/tide/governance-client.ts      browser-only tested CR/approval integration
  src/lib/vault/manifest.ts              shared pure schema/canonicalisation/hash
  src/lib/auth/                         existing JWT/DPoP foundation, reviewed/reused
  services/vault-executor/
    src/auth.ts                         pinned claims/DPoP/entitlement validation
    src/store.ts                        durable requests and single-use execution
    src/storage.ts                      safe version-specific blob operations
    src/server.ts                       minimal protected API
  tests/vault/                          unit, integration, crash/concurrency tests
  docs/security-boundary.md              exact attacker model and exclusions
  docs/demo-evidence.md                  reproducible positive/negative results
```

Structure is proposed, not a requirement to create every file immediately. Reuse or extract the
existing verifier rather than maintaining divergent copies. Shared replay state and Node/runtime
compatibility must be resolved before serving the same resource from multiple workers.

The current app is in this Git checkout. Its TideCloak container still binds its database from
`../incident-evidence-room/data/`; credentials/backups remain outside the checkout. Do not delete
or rename that source directory as part of product work. Preserve unrelated Git staging/work.

## 13. Acceptance and bypass test matrix

| Test | Required result |
|---|---|
| File an ordinary purge request | App `202`, durable frozen manifest, no change to file bytes. |
| Member/operator calls execute directly | `403`; actual file remains downloadable with the same digest. |
| One trustee approves | Relevant grant not usable; execute still fails. |
| Same trustee approves repeatedly / via two tabs | No extra independent vote or destructive authority. |
| Second independent eligible trustee approves | Exact relevant grant commits; designated caller can obtain valid scoped authority. |
| Exact valid authority executes | Only frozen target versions removed once; durable result recorded. |
| Reuse token/proof or request after execution | DPoP replay and/or operation consumption rejects it; no second deletion. |
| Fresh DPoP proof with old operation entitlement | Cannot execute a consumed or expired request. |
| Change object list, version, digest, recipient, expiry, reason, or request ID | Hash/entitlement mismatch; new request/approval required. |
| Delete another version with same filename | Rejected; filenames do not define authority. |
| Wrong issuer/client/audience/subject or wrong role namespace | Rejected even when a role string looks similar. |
| Missing token, invalid signature, Bearer replay, absent/wrong proof | `401`; no storage side effects. |
| Fake approvalCount/status in browser or app database | Does not create a signed entitlement or bypass executor verification. |
| One admin grants itself the operation role directly | Cannot obtain executable authority without independent approval. |
| Alternate group/composite role/client mapper/scope grant | Cannot manufacture an accepted operation entitlement unilaterally. |
| Add trustee, lower threshold, disable IGA, change authorising client/policy | Relevant bypass attempt fails under live governance; document exact operations tested. |
| UI/app service tries raw storage deletion | No write mount/credential; explicitly distinguish this from trusted host/root deletion. |
| Restart executor; repeat completed request | Consumed state survives; no new action. |
| Concurrent execution attempts | One durable reservation; exact operation runs at most once, with documented recovery semantics. |
| Crash mid-purge / missing file / storage error | Durable `PARTIAL`/failure/progress, never false complete success or broadened targets. |
| Network/governance unavailable | No new authority issued; executor never falls back to a master credential or permissive path. |
| Previously issued valid authority during outage | Behaviour explicitly documented: validity is bounded by signed-token and manifest expiry; not described as instant online revocation. |

Do not demonstrate a benign endpoint and generalise its result to every destructive/configuration
surface. A root-level raw delete is an acknowledged limit, not a test we should run against the
working realm or useful user data.

## 14. Two-minute demo and security wording

### Proposed sequence

- **0–15s:** “Harbourline delegates archive maintenance, but one compromised account must not
  erase its recovery copies.” Show one actual synthetic file available for download.
- **15–40s:** Operator requests permanent purge. Nothing disappears; direct execution is refused.
- **40–65s:** Trustee A signs the actual governed grant. Show the live threshold is not met and
  the same recovery file remains intact. Repeating that account's approval does not help.
- **65–95s:** Trustee B independently reviews and signs. Show committed authority and the exact
  manifest/recipient—not merely a green application badge.
- **95–110s:** Intended caller executes once. Only the approved version is purged; another
  recovery version remains. Reuse is rejected.
- **110–120s:** State what changed and the boundary: protected service-account authority,
  not protection against storage root access or a malicious authorised quorum.

Optional short inset: a real token-string replay returns `401`; no passwords/tokens appear on
screen. Do not spend 20 seconds claiming passwordless login or running actual malware.

### Approved phrasing after tests pass

“The prototype uses real Tide-governed approvals to issue narrowly scoped purge authority.
One compromised application-admin account cannot obtain that authority alone. The executor
restricts it to the approved versions, recipient, expiry, and one execution.”

### Do not claim

“Ransomware-proof,” “no passwords to phish,” “any stolen session is useless,” “an immutable
audit log,” “Tide protects the disk from deletion,” or “any administrator can never destroy data.”

## 15. Decisions to confirm before building

Already selected: keep the friend's core insight and proceed with the recovery-vault direction.
Do not re-open product selection or require answers to twelve generic setup questions.

Confirm only these execution decisions:

1. Deadline/timezone and realistic engineering hours. If phase 1 cannot fit, disclose that early.
2. Reuse `RMIT_SGS_RunItBack_C2` and the existing realm as proposed, or create an explicitly
   authorised fresh realm? Reuse avoids another licence/bootstrap but needs governed config changes.
3. Can three linked trustees participate, with at least two independently available for the demo?
4. Accept one operation—permanent purge of selected synthetic versions—and the stated
   application-account threat boundary? Is Harbourline Freight an acceptable demo persona?
5. Can we run a separate executor/container, and may the existing incident branding be replaced
   once the authority spike passes?

If a fresh realm is chosen, ask for its licence email and explicit acceptance of
https://tide.org/legal before provisioning, then resolve local Docker vs hosted Skycloak.
Never infer new Terms acceptance or network identity credentials. Existing consent is not
permission to silently reset the current realm.

When an ORK/login/API issue occurs, call Tide doctor first and run its diagnostics. Surface
external blockers promptly; use bounded retries informed by errors, not indefinite automatic
10–15-minute retry loops that hide a failed dependency.

## 16. Evidence, references, and unresolved questions

Reviewed 22 October 2026:

- Official challenge and sample ideas: https://tide.org/unlocked/ and
  https://tide.org/unlocked/config.js. Small working prototype; Tide integration required;
  mocked external systems allowed; avoid making the product mainly a security/admin dashboard.
- Tide MCP `tide_choose_scenario`: arbitrary protected signing routes to `policy-governed-signing`;
  no built-in arbitrary signing contract was identified by that response.
- Tide MCP `tide_scenario("policy-governed-signing")`: direct signing needs a suitable contract;
  `RelationshipAttestation:1` is encryption/decryption-only; custom deployment goes to Tide's team.
- Tide MCP `tide_scenario("iga-admin-governance")`: role/governance workflows; read alongside
  the focused canon because some generic snippets are older/inconsistent.
- Tide MCP `tide_canon("iga-change-requests-api", "Threshold")`: signed in-force admin policy,
  `REGEN_ADMIN_POLICY`, and the FirstAdmin/MultiAdmin distinction.
- Tide MCP `tide_canon("iga-change-requests-api", "Change-request lifecycle")`: current
  `/approve` two-phase flow, actual list fields/statuses, caller identity, and deny/edit caveats.
- Existing local evidence: successful enrolment/repeat login; isolated auth tests recorded at
  `/tmp/opencode/tide-auth-base-test/TEST-RESULTS.md`; migration boundary in `docs/MIGRATION.md`.

**Still unverified:** operation-bound role-grant design, actual two-person grant issuance,
exact enclave review semantics, token/audience/claim path, alternate grant/configuration bypasses,
executor integration, and crash-safe destructive execution. A scenario recommendation is not
runtime verification. No vault-security acceptance test has passed merely by writing this plan.

**Go/no-go rule:** Preserve the core insight, but do not ship the central claim until real
independent Tide authorisation and the exact executor enforcement path both pass their tests.
