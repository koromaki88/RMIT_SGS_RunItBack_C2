# Agent 1 — fresh foundation, Tide governance, technical integration

**Copy-ready assignment:** You are Agent 1 of three concurrent agents. You own identity,
governance, root dependency/config files, and the final technical integration. Read root
`AGENTS.md`, `00-coordination.md`, `04-contract.md`, and the product brief first.

## Objective

Provide a minimal real TideCloak foundation and prove that one account cannot issue the
exact operation-specific purge entitlement while independent quorum can. This is the
critical-path experiment, not an invitation to spend three hours polishing setup.

The checkout is intentionally not runnable yet. It has generic auth/config/relay helpers,
no package manifest/app/dependencies/adapter/database, and no running identity service.
Do not restore or start retired services. Do not fabricate a fresh adapter or fresh login proof.

## Exclusive ownership

- Root package/lockfile, TypeScript/Next config, environment example, ignore rules.
- `src/lib/auth/**`, `src/lib/tide/**`, `src/app/providers.tsx`.
- New bootstrap/diagnostic scripts except Agent 2's `scripts/seed-vault.ts`.
- Private local adapter/configuration; permitted fresh realm setup with user consent.
- Only you run installs, builds, app start/stop, and change dependencies or origins.
- `docs/status/agent-1.md`, `docs/evidence/governance.md`.

Do not edit Agent 2's vault types/routes/store or Agent 3's pages/styles/README. Send exact
interface/export changes to both peers. No commits, pushes, resets, or shared staging changes.

## Immediate human dependencies — first message, not last hour

Ask the human for (a) licence-management email and explicit agreement to
https://tide.org/legal, (b) local Docker vs hosted TideCloak, and (c) availability of three
trustee accounts/two independent signers. Ask before provisioning. Previous consent and
accounts do not authorise silently restoring a retired realm or accepting new Terms.

Proposed fresh names: `recovery-vault` / `recovery-vault-client`; browser origin localhost:3000.
If local Docker is chosen, keep it loopback-only and use the working Docker socket explicitly.
Fetch/use official Tide setup guidance/templates; keep fail-fast, no-wipe safeguards. Do not
hardcode master credentials or recreate an image/DPoP relay from memory.

The user must enter personal credentials in their browser and sign actual approvals.
Explain SSH forwarding of 8080/3000 once. Do not request passwords in chat.

## T+0–10: unblock peers

1. Create minimal Next.js App Router package, tsconfig, provider, scripts. Reuse retained generic
   assets/helpers after review; no profiles/product pages/old branding. Agent 3 owns layout/pages.
2. Pin installed-compatible versions; known foundation versions were Next 16.4.2,
   `@tidecloak/nextjs` 0.14.40, React wrapper 0.14.33, JS SDK 0.14.41. They are observations,
   not a reason to bypass current official compatibility checks. Node VM is 26; use Node SQLite.
3. Add one test runner usable by Agent 2 (e.g. `tsx --test`); announce its command and package
   availability. Agent 2/3 do not independently install packages or edit the lockfile.
4. Announce actual provider export and the `withAuth`/claim-check contract. Agent 3 can build
   the shell while real configuration awaits enrolment; show unavailable setup honestly.

## T+10–45: prove governance, not just login

1. Legitimately bootstrap fresh Tide service/realm, IGA in Tide mode, DPoP client, real adapter.
   Follow the current official bootstrap ordering: governed configuration before the admin-role
   flip where possible. Additional post-flip changes need real approval, not a master bypass.
2. Ensure the fresh client's actual access token contains its own intended audience. The contract
   requires exact issuer, `azp`, `aud`, exp/iat/sub, and EdDSA verification against embedded keys.
   Configure/read back the real audience mapper through the correct path, not a verifier downgrade.
3. Link available trustee identities. Inspect the signed live admin policy and set/regenerate
   its threshold legitimately. Target 2-of-3. Two/three linked accounts alone are not proof.
4. Use a harmless manifest from Agent 2 (or a clearly non-destructive throwaway manifest)
   to propose creation and grant of exact **realm** role `vault-purge:<manifestHash>` to its recipient.
5. Capture actual role-creation/grant CR UUIDs, dependencies, intended user/role and approval scope.
   Use `/iga/change-requests/<id>/approve`, real enclave signing, each human's own browser token.
6. Prove zero/one independent approval cannot issue a usable grant, the same identity cannot
   count twice, and a distinct eligible second approval commits the grant. Inspect the recipient's
   refreshed real signed token and exact `realm_access.roles` claim.
7. Inspect alternate self-grant/composite/group/mapper/scope/threshold-change routes relevant to
   this entitlement. Do not generalise “IGA enabled” into proof every route is governed.
8. Verify trustees can review the frozen scope and what the enclave card really displays. Do not
   say Tide signs every manifest field merely because the role's hash binds them for our backend.

**Gate by T+45:** tell both peers PASS/BLOCKED with precise evidence, threshold and scope. If
blocked, keep execution fail-closed; ask the human immediately. Do not spend the remaining
budget repeatedly reconnecting, deploying a custom contract, or relabelling fake app approvals.

## T+45–90: browser adapter and hardened foundation

- Implement the three exports in `04-contract.md` in `governance-client.ts`.
- Use absolute-URL SDK `secureFetch`; never proxy approvals through a different identity.
- Handle role-create-before-grant dependencies and retries idempotently; return actual CR IDs.
- Expose unknown/failing observation honestly. Read list `authorizationCount`, not guessed values.
- Token refresh may lag. Provide a tested SDK refresh flow or explicit re-login instruction,
  not a fabricated locally modified token. No runtime master password or signing shortcuts.
- Review retained `verifyTideJWT` to enforce audience, expected algorithm, required time/identity
  claims, client and issuer. Keep strict DPoP. Pin public URL reconstruction; do not trust caller
  forwarded headers to select the proof target. Single process means process-local replay cache
  is explicitly bounded, not a multi-instance claim.
- Run Tide doctor after auth changes and against the served relay; apply valid fixes yourself.
- Record test evidence without tokens, signed session URLs, passwords, or personal credentials.

## T+90–135: integration ownership

- Run one install/build/server lifecycle; ask peers to stop edits during the final build.
- Walk the real app with the human: download → request → first approval rejected for execution →
  second approval committed → recipient refresh → exact purge → replay rejected.
- Verify one admin cannot obtain equivalent authority through another relevant path; document
  untested routes. Do not add a broad app-admin bypass to get the demo unstuck.
- Give Agent 3 exact working setup commands and factual security limits for the README/video.
- Freeze dependency, client/origin, schema and auth interfaces at T+120 unless fixing a blocker.

## Definition of done

- Legitimate fresh login and real live quorum/role-claim evidence, not synthetic test evidence alone.
- Browser adapter integrated with Agent 3; Agent 2 verifier receives the exact real role/claims.
- Build/served-relay checks pass; the core end-to-end demonstration actually works.
- Status includes: actual origin/client/role namespace, threshold, relevant IDs, observed results,
  exact blocker if any, remaining uncertainties, and commands. Never put secrets in that file.
- No claim of passwordlessness, ransomware-proof storage, immutable audit, or host-compromise resistance.

If the core proof is unavailable, “done” means an honestly reported blocker and no unsafe purge,
not an artificial success screen. The human decides whether to submit the partial prototype.
