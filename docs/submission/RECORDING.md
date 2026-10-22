# Record the demonstration

Start with the [simulation walkthrough](../SIMULATION.md). Use a fresh dataset for each
rehearsal; normal restarts deliberately preserve purge results. Keep credentials, tokens,
action-token/session URLs, private configuration and personal emails out of the recording.

Runtime rule: record the actual application workflow with the simulation banner visible.
Following the organisers' outage guidance, sign-in, roles and governance are simulated;
archive bytes and purge transactions are real. Do not describe selectable demo actors as
independent humans or local claims as Tide-signed tokens. If stages are shortened in
editing, identify them as edited stages, not an instantaneous live flow.

## Shot plan

| # | Time | Shot | What must actually be visible |
|---|---|---|---|
| 1 | 0–15s | Intended benefit; outage boundary | Simulation banner and demo account selection; Archive with downloadable synthetic bytes, version/size/SHA-256. State that live Tide governance is unverified. |
| 2 | 15–45s | File exact purge; direct execute refused; file still downloadable | Filing form with a 1–200-char reason; app acknowledgement reads "Request filed; no bytes removed"; Execute attempt returns an honest refusal banner; same file still downloads. |
| 3 | 45–65s | Simulated trustee A approves — insufficient, repetition doesn't help | Select demo Trustee A, propose/refresh, approve; repeat vote stays 1 of the simulated 2. Operator execution remains refused. |
| 4 | 65–95s | Distinct simulated trustee B approves; recipient gets fresh claims | Select demo Trustee B and approve; count reaches simulated quorum. Return to Operator and refresh simulated claims. No enclave popup or real token signature is claimed. |
| 5 | 95–110s | Exact version purged once; other version survives | Execution succeeds; reload shows PURGED and the surviving version remains downloadable. Replay refusal can be shown with the CLI/HTTP test: completed cards no longer offer Execute. |
| 6 | 110–120s | Boundaries and exclusions stated | Simulated identity/governance, synthetic data, trusted host/SQLite, logical deletion, live Tide verification still pending; explicitly not "ransomware-proof". |

## Prep checklist (human)

- [ ] Demo actors ready; narration says the local selector can control every actor.
  Distinct actor IDs do not demonstrate real organisational independence.
- [ ] No real admin token, credentials or private operator files anywhere on screen.
- [ ] Export `.mp4` into the repo root or `/media`; verify **duration <= ~2:00 and
  size < 100 MB** before staging (inspect the file, don't trust the render dialog).
- [ ] Final Git staging inspection: `git status` and `git diff --staged` reviewed for
  secrets, tokens, personal emails, `.env`, SQLite data files, or adapter private state.

## Post-take checks

- [ ] Every on-screen claim matches an outcome actually observed in this rehearsal.
- [ ] Unknown counts shown as "unknown" on camera, not zero or an assumed 2-of-3.
- [ ] No stage implies "Tide approved": even successful simulated execution is not live Tide evidence.
- [ ] Where a claim is untested, it is either cut or stated as untested.
- [ ] Link the actual video from the README only once the file exists in the repository.
- [ ] Review the final published repository and video for secrets and private local state.
- [ ] Submit the public repository link through the organiser's form:
  https://forms.gle/HRHYjnqB86j1LFS97. Publishing alone is not submission.

## Optional terminal take

```sh
node scripts/demo-planc.mjs
```

This pauses briefly between steps; add `--fast` to skip pauses. The script directly
calls the real core with unsigned synthetic claims and a temporary database. Keep its
simulation disclosure visible; it does not exercise HTTP, JWT, DPoP or live Tide.
