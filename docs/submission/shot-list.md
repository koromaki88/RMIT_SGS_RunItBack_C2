# Two-minute video shot list

Owner: Agent 3. The **human** records, publishes, and submits — agents never capture
credentials, tokens, action-token/session URLs, bootstrap secrets, or personal emails,
and never record in place of the human without explicit permission.

Runtime rule: every cell below shows the **real app state**. If a stage is truncated in
editing, it must be presented as edited stages of a real sequence, never as a live
instantaneous flow being simulated. If governance is BLOCKED at the T+45 gate, replace
stages 4–5 with the honest "execution unavailable" screen and cut the claim accordingly.

## Shot plan

| # | Time | Shot | What must actually be visible |
|---|---|---|---|
| 1 | 0–15s | Delegated maintenance, without unilateral destruction | Real sign-in; Archive table with a real recovery file (name/version/size/SHA-256); file is downloadable. |
| 2 | 15–45s | File exact purge; direct execute refused; file still downloadable | Filing form with a 1–200-char reason; app acknowledgement reads "Request filed; no bytes removed"; Execute attempt returns an honest refusal banner; same file still downloads. |
| 3 | 45–65s | Trustee A approves — insufficient, repetition doesn't help | Trustee A's own browser profile approves; popover promoted; governance repeat of the same identity produces no second independent vote; status still shows 1 of real threshold. |
| 4 | 65–95s | Trustee B independently approves; grant commits; recipient gets fresh claims | A distinct trustee approves in their own session; observed governance reaches the real threshold; recipient refreshes/re-authenticates so a fresh signed token carries the exact `vault-purge:<hash>` role. |
| 5 | 95–110s | Exact version purged once; other version survives; replay refused | Execution succeeds; reload shows the purged version PURGED and the other version AVAILABLE and downloadable; a second execution attempt is refused (replay/consumed). |
| 6 | 110–120s | Boundaries and exclusions stated | Narration over the app: synthetic data, trusted backend/SQLite boundary, logical (not physical) deletion, untested bypasses listed; explicitly not "ransomware-proof". |

## Prep checklist (human)

- [ ] Three linked accounts ready; at least two genuinely independent signers available.
  If rehearsal uses multiple accounts controlled by one person, the narration must say so.
- [ ] Fresh browser profiles per trustee; no shared admin token anywhere on screen.
- [ ] Recording window: aim for first usable take by T+150, submit by T+165.
- [ ] Export `.mp4` into the repo root or `/media`; verify **duration <= ~2:00 and
  size < 100 MB** before staging (inspect the file, don't trust the render dialog).
- [ ] Final Git staging inspection: `git status` and `git diff --staged` reviewed for
  secrets, tokens, personal emails, `.env`, SQLite data files, or adapter private state.

## Post-take truth check (Agent 3 / human)

- [ ] Every on-screen claim matches a real observed outcome from the rehearsal
  checklist in `docs/status/agent-3.md`.
- [ ] Unknown counts shown as "unknown" on camera, not zero or an assumed 2-of-3.
- [ ] No stage implies "Tide approved" before the backend actually executed.
- [ ] Where a claim is untested, it is either cut or stated as untested.
