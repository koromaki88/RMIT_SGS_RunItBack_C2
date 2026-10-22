# Agent 3 — product UI, demo integration, and submission preparation

**Copy-ready assignment:** You are Agent 3 of three concurrent agents. Own the user experience
and submission materials. Read root `AGENTS.md`, `00-coordination.md`, `04-contract.md`, and the
product brief first. The public claim must follow actual test evidence, not the planned story.

## Objective

Make the useful possibility obvious: a company can delegate archive maintenance without
allowing one compromised account to erase recovery copies alone. Two small screens, a truthful
real governance interaction, and a submission recorded before the hard deadline are enough.

## Exclusive ownership

- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/auth/redirect/page.tsx`, other page routes,
  styles, `src/components/**`, UI tests. Agent 1 owns `src/app/providers.tsx`; Agent 2 owns API routes.
- `README.md`, `docs/submission/**`, `docs/status/agent-3.md`.
- Submission video preparation/output, with the human's recording/publishing permission.

Do not edit dependencies, lockfile, auth, backend routes/types, realm configuration or shared
contract. No separate installer/server process. Ask Agent 1 for lifecycle/build changes.

## T+0–10: minimal shell and submission outline

1. Create accessible Next layout/page/callback consuming Agent 1's provider export. No profiles,
   custom logo generation, library-heavy styling, elaborate landing page, or retired source.
2. Use a simple header “Dual-Control Recovery Vault”, synthetic-company label, auth status and
   sign-in/out. Do not infer a real display name/email or confuse trustee labels with identity proof.
3. Build Archive and Requests sections in one page or two simple routes. Read contract types from
   Agent 2's module once available. No independently renamed fields or API aliases.
4. Draft the five judging-prompt README overview and two-minute shot list immediately. Mark
   implementation claims pending; reserve time for the real results to replace them.

UI fixtures may help isolated component development, but no fixture toggle should ship in the
runtime demo. Render pending setup/API failure rather than a fake archive or fabricated approvals.

## T+10–45: connect real archive and review flow

- Use absolute-URL SDK `secureFetch` for all protected calls, not plain Bearer fetch.
- List actual file/version/size/digest/state from Agent 2. Download via authenticated request;
  revoke any created browser object URL after use.
- File one purge request for an available version with a 1–200-character reason. Show app `202`
  as “Request filed; no bytes removed,” not “Tide approved.” Recipient/expiry are server-assigned.
- Show frozen manifest scope, intended recipient, expiry, entitlement hash and real CR IDs.
- Integrate Agent 1's `proposePurgeGrant`, `readGovernance`, `approveGovernance`; handle role-creation
  dependencies as real stages. Do not say one app request is one Tide request when there are several.
- Show unknown count/threshold as unknown. A popup closing is not approval commitment.
- Individual trustees use their own sessions/browser profiles. No shared admin token, password
  prompt in the app, or invented “switch to trustee” control that changes authority locally.

At T+45 read Agent 1's PASS/BLOCKED. If BLOCKED, display execution unavailable with an honest
reason. Do not imitate two successful signatures to make recording look complete.

## T+45–90: finish the useful interaction

- After one actual approval: “One approval recorded; the recovery version is still available.”
  Base the threshold/status on real observations, never assume 2-of-3 from a configuration label.
- After the grant commits: guide the recipient through actual refresh/re-login; do not set a
  local approved role or assume token claims changed instantly. Agent 1 supplies the tested flow.
- “Execute approved purge” calls the real backend; the backend decides, even if UI enables it.
- Handle `401`, `403`, `409`, `410`, `503`, network failure, and delayed role propagation clearly.
- On success, re-fetch actual state and demonstrate the other version remains. Replayed/consumed
  execution should report refusal. Avoid issuing an unwanted extra purge merely for animation.
- No general delete, purge-all, uploads, restore, re-key, notifications, AI, or fancy audit dashboard.

## T+90–120: real rehearsal and evidence-driven wording

Rehearse with Agent 1/2 and real humans. Keep a short checklist in your status file:
login, real download, request, failed one-account execution, first approval insufficient,
second distinct approval, recipient refresh, exact execution, other version intact, replay refused.

Do not capture credentials, tokens, action-token/session URLs, personal emails, or bootstrap
secrets. State that files are synthetic. In a manual-account rehearsal, distinguish multiple
accounts controlled by one person from genuinely independent trustees.

At T+120 freeze UI except blocking fixes. Do not spend the submission buffer redesigning it.

## T+120–180: recording and submission are first-class work

Target first usable take by T+150; publish/submit by T+165, leaving margin. The human owns
final Git publishing and form submission unless explicitly delegated. Do not claim it is submitted
merely because a Markdown file or local video exists.

### Two-minute shot list

1. **0–15s:** delegated maintenance without unilateral destruction; show an actual recovery file.
2. **15–45s:** file exact purge, direct execute refused, same file still downloadable.
3. **45–65s:** trustee A's real approval is insufficient; repeating that identity does not help.
4. **65–95s:** trustee B independently approves; exact grant commits, recipient gets fresh claims.
5. **95–110s:** exact version purged once; other version remains; replay refused.
6. **110–120s:** state tested boundary and exclusions, not “ransomware-proof.”

If live delays make this sequence too long, prepare approved test requests ahead of time and
cut honestly between real stages; do not present editing as a live instantaneous process.

### README and packaging checklist

- At top: one-sentence product description plus answers to vision/originality, trust constraint,
  value/impact, why Tide matters, and what the prototype demonstrates; **<=300 words** total overview.
- Separate setup commands from the overview. Agent 1 provides exact working commands, Node
  version, fresh configuration/licensing requirements and SSH origin instructions.
- Explain what is real, what is synthetic, the trusted backend/host boundary, logical deletion,
  and which bypasses remain untested. Do not describe planned features as implemented.
- Include the TideCloak attribution/badge from the official template if practical.
- Two-minute `.mp4` stored in repo, **under 100 MB**; inspect duration/size using available tools.
- Public repository, code, and video; inspect actual intended staged diff for secrets. Agents
  do not stage, commit, or push without the human's request.
- Human submits repository link via https://forms.gle/HRHYjnqB86j1LFS97 and confirms completion.

## Definition of done

Two clear real-data views, no fake approval states, error/unknown cases handled, exact tested
promise reflected in README/video, and a ready-to-submit package within the real deadline.
If authority proof is blocked, prepare a clearly partial demonstration with execution disabled
and disclose the missing capability. Never claim the challenge's full protection was achieved.
