# Three-agent deadline coordination

Read `tide-ransomware-vault-brief.md`, `docs/implementation/00-coordination.md`, and
`docs/implementation/04-contract.md` before editing. Read your assigned workload file.

- The user is assigning three agents; do not recursively spawn more agents or consume time
  creating extra architectures. No product implementation is complete at handoff.
- Work in the same checkout with strict ownership below. Do not run git checkout/reset/stash/clean,
  reformat other owners' files, or stage/commit/push unless the human explicitly asks.
- Preserve existing changes. Do not restore retired applications or credentials. The old services
  are stopped; a fresh realm needs real user consent/enrolment.
- Agent 1 alone owns dependencies, lockfile, server lifecycle, auth, Tide configuration/realm writes,
  and final technical integration. Only one installer/build/server process at a time.
- Agent 2 alone owns backend vault code/routes, pure manifest code/types, seed, and backend tests.
- Agent 3 alone owns pages/layout/components/styles, README/submission docs, and UI tests.
- Each agent owns only its named status/evidence document. Shared contract changes require an
  explicit message to both peers before they rely on the change. No unilateral field renames.
- Defaults: no mocks in runtime auth/approvals, no bootstrap credentials in runtime, no fabricated
  role claims, no auto-approving as the human, and no unsigned “approved” flag authorising purge.
- Readiness is unverified until Agent 1 records a real live proof. Keep `/execute` fail-closed.
- Have the human perform browser enrolment and independent approvals. Ask for licence email and
  explicit Terms acceptance before a new realm; never infer consent from archived configuration.
- Use single-process SQLite BLOB transactions for deadline scope. Do not build upload, profiles,
  encryption, separate containers, custom contracts, or an elaborate landing page.
- Reserve the final 45 minutes for verification/video/submission. At the 45-minute gate, disclose
  unsupported governance or missing signers; do not disguise a partial prototype as a success.

Assignments: `01-agent-auth-governance.md`, `02-agent-vault-backend.md`,
`03-agent-ui-submission.md` under `docs/implementation/`.
