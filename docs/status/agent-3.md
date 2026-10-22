# Agent 3 status — UI, integration seams, submission

## Current status

`READY ui-shell` — all Agent 3-owned files exist and are coded against the frozen
`04-contract.md` shapes. Fail-closed pre-merge: with Agent 1's provider and Agent 2's
backend unmerged, the UI renders "setup pending", performs **no** protected calls, and
offers no fake sign-in, no fake archive, and no fake approvals.

## Deliverables on branch `agent3-ui-submission`

| File | Purpose |
|---|---|
| `src/app/layout.tsx` | Shell; `TODO(MERGE-AG1)` markers where Agent 1's `<Providers>` mounts. |
| `src/app/page.tsx` | Single route holding the two views (Archive + Purge Requests) with shared refresh. |
| `src/app/auth/redirect/page.tsx` | Minimal callback; infers nothing about identity. |
| `src/app/globals.css` | Plain CSS; no libraries installed (per ownership rules). |
| `src/components/auth-ribbon.tsx` | Header, synthetic-company label, honest sign-in/out surface. |
| `src/components/merge-seam.ts` | **The only Agent-3 glue file.** All Agent 1/2 swap points live here. |
| `src/components/client-api.ts` | secureFetch-based calls, error-table mapping, download+revoke, reason validation. |
| `src/components/authority-logic.ts` | Pure honest-wording truth table. |
| `src/components/archive-section.tsx` | Real archive rows, digest display, gated download. |
| `src/components/requests-section.tsx` | Filing, frozen-manifest display, governance observations, execution attempt. |
| `tests/ui/logic.test.ts` | UI logic tests (honest wording, error mapping, reason rules). |
| `README.md`, `docs/submission/shot-list.md` | Submission materials; claims marked pending until live evidence. |
| `docs/submission/mp4-placeholder.md` | Video packaging checklist. |

## Merge-swap list for the human / peers (single integration pass)

1. `src/components/merge-seam.ts`
   - Types: swap stubs for `export type { … } from "@/lib/vault/contract"` (Agent 2).
   - `secureFetch`: swap stub for Agent 1's real DPoP-bound export.
   - `proposePurgeGrant` / `readGovernance` / `approveGovernance`: swap stubs for
     Agent 1's real exports in `@/lib/tide/governance-client`.
   - `useAuthStatus`: bind to Agent 1's provider hook (login/logout/authenticated).
2. `src/app/layout.tsx` — mount Agent 1's `<Providers>` at the two `TODO(MERGE-AG1)` markers.
3. `src/lib/tide/governance-client.ts` — owned by Agent 1; file must exist for the merge.
4. `src/lib/vault/contract.ts` — owned by Agent 2; replaces the type stubs.

Nothing else in Agent 3's code changes; no field of the frozen contract was renamed.

## Messages to peers

- `READY ui-shell (+ merge-seam swap list, tests/ui/logic.test.ts)`
- To Agent 2: after merging, `filedAckText` wording expects the `202` envelope
  `{ request: PurgeRequest }` exactly as frozen; any deviation = CHANGE REQUEST.
- To Agent 1: please confirm the exact export names for `secureFetch` and the provider
  hook (assumed per contract §4) so the single swap lands first try.
- Test command requirement: `tsx --test tests/ui/logic.test.ts` (or equivalent) should
  be part of Agent 1's package scripts.

## Timeline notes (sprint-mimic mode)

- T+0–10: shell + README/shot-list drafts done (this commit).
- Pending: bind real data as Agents 1/2 land `READY contract.ts` and `READY endpoints`;
  chase their status files; then replace "pending" claims with real outcomes.
- Rehearsal checklist (with humans, after integration): login → download → file →
  failed one-account execute → first approval insufficient → second distinct approval →
  recipient refresh → exact execute → other version intact → replay refused.
