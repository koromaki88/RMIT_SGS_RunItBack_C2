# Agent 1 — identity/governance status

## BLOCKED on external licence finalisation — no live quorum proof yet

## Combined branch integration completed locally

Latest Agent 3 incremental update through `6039566` integrated, preserving the live-mode
auth seam and earlier fixes. Additional review corrected false UI progress/survival/quorum
claims, bounded JSON input while streaming, disabled completed-CR approve controls, and fixed
a redesigned archive import. **33 tests and full production build pass.** See
`docs/evidence/code-review.md` for unresolved issues and the proposed isolated simulator boundary.
No simulator or fabricated real-mode credentials were introduced in this review.

- Imported `origin/agent2-vault-backend` and `origin/agent3-ui-submission` using squash
  integration without committing. Imported files are staged; subsequent integration fixes
  and Agent 1 work may remain unstaged/untracked. `main` and remote branches are unchanged.
- UI merge stubs replaced with actual backend contract types, SDK secureFetch/auth hook,
  provider mounting, and Agent 1 governance exports. No synthetic runtime auth or approvals.
- Fixed binary-download BodyInit typing and unknown-count UI wording. Trustee linking uses
  exact `realm-management` client role `tide-realm-admin` without an unspecified environment role.
- **31 combined auth/UI/backend tests pass; full production build and TypeScript pass.**
- App running on loopback port 3000; missing genuine adapter renders explicit setup-pending UI.
- Runtime unauthenticated list/read-request/file-request/execute checks all return 401.
- Served doctor: 10 passes, one expected failure (no real adapter after failed licensing).
- Live sign-in, governance quorum, fresh recipient claim and real authenticated purge remain BLOCKED.
- The one-minute licence watcher was left running; this integration does not create or restore a realm.

- Branch: `feat/recovery-vault-mvp`; no commits/pushes by this agent.
- Fresh realm/client: `recovery-vault` / `recovery-vault-client`.
- App origin: `http://localhost:3000`; identity origin: `http://localhost:8080`.
- User explicitly confirmed the licence email and Terms acceptance for this fresh realm,
  and chose local Docker. Private operator configuration will not be committed.
- Human will enrol three distinct accounts for a **single-person rehearsal**. This tests
  distinct-account mechanics, not independence between people; disclose that in the video.
- No previous realm/container/state is being restored.

## READY to peers

- Package/config provided. Agent 1 alone installs dependencies and runs app/build lifecycle.
- Test runner: `tsx --test`; scripts `npm test`, `npm run typecheck`, `npm run build`.
- Provider export: named `Providers` from `src/app/providers.tsx` (official strict-DPoP pattern).
- Provider loads the real generated `/tidecloak.json` at runtime and shows an explicit setup
  blocker until it exists; it does not fake login or provide empty auth context. Bootstrap
  exports the real public-client adapter to ignored `data/` and `public/` locations.
- Backend wrapper: `withAuth(handler)` from `src/lib/auth/protect.ts`.
- Expected authority remains exact realm role `vault-purge:<manifestHash>`.
- Agent 2 owns manifest/types; Agent 1 will import them rather than duplicate hash logic.
- Governance adapter exports remain as specified in `04-contract.md`.
- Dependencies installed successfully; `npm test` discovers auth and peer `tests/**/*.test.ts` files.
- Strict verifier now requires intended audience, issuer/client, exp/iat/sub, EdDSA, and pinned-origin DPoP.
- `hasRole(jwt, role)` is realm-only. `hasClientRole(jwt, client, role)` and `isTrustee(jwt)`
  are available from `src/lib/auth/tideJWT.ts`; do not search other clients for a same-named role.

## Current blocker

User-requested alternate-email retry at **08:35 UTC** supplied `koromaki88@gmail.com`
to `CreateTideVendorKey` on the same partial realm. Result remains outer HTTP 500 /
`TIDE-IDPEXT-VENDOR-KEYGEN_FAILED`, with matching upstream FinalizeWallet HTTP 403.
This does not establish whether the existing pending subscription adopted the new email;
no fresh realm was created to test that. Private operator configuration now uses the
new user-supplied address. Watcher restarted with that configuration after the manual retry.

Latest user-requested recheck: **22 October 2026, 08:09 UTC**. Lifecycle endpoint still
returns HTTP 500 / `TIDE-IDPEXT-VENDOR-KEYGEN_FAILED`. The corresponding server log now
reveals **upstream `Midgard.FinalizeWallet` HTTP 403 Forbidden**, whereas the initial
attempt returned upstream 500. Cause of the upstream rejection is unconfirmed. No reset,
new realm, or permissive fallback was performed.

Fresh `recovery-vault` realm and local container were created. Licence activation failed at
`Midgard.FinalizeWallet` with upstream HTTP 500 (`TIDE-IDPEXT-VENDOR-KEYGEN_FAILED`).
Bootstrap stopped before IGA/users/enrolment/adapter export, preserving partial state.
Doctor confirms no adapter and no enabled IGA yet. A read-only licence-details call also
timed out. One supported `CreateTideVendorKey` lifecycle retry returned HTTP 500 as well.
Do not show configured login, trustee authority, or live quorum PASS.

Eight synthetic-key authentication tests pass, including intended audience/issuer/client,
expiry/required identity claims, signature, proof binding, wrong method/URL/hash, and replay.
These do **not** establish live licensing, independent governance, or operation-grant safety.

Browser governance adapter code is present at `src/lib/tide/governance-client.ts` with the
three contracted exports. It uses real Tide models and caller identity, separates role creation
from role grants, and refuses unknown correlation/results. Live integration is NOT VERIFIED;
Agent 2's contract module and Agent 3's app/layout are still required for the full build.
The initial missing contract dependency was resolved by importing Agent 2's branch;
combined typecheck/build now pass. Bootstrap passes `bash -n`.
Private shareable support summary: `.setup/tide-licensing-support.md`.

Agent 1 is checking the supported lifecycle recovery path; no destructive rerun or retired
environment restoration. Other agents can implement against the fixed interfaces but must
keep all protected runtime paths fail-closed while actual configuration is unavailable.

## Pending / blocking gate

Fresh licensing/bootstrap, three user-enrolment actions, real signed threshold >=2,
operation-specific grant and distinct-account approval proof, real token audience/role
inspection, bypass checks, browser login and integration are **NOT VERIFIED**.
Keep execution fail-closed. Do not read this file as a PASS or as execution permission.
