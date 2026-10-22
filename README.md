# Dual-Control Recovery Vault

**One compromised login should not erase your way back.**

**Outage mode:** Following the organisers' guidance, sign-in, roles and approval governance
are simulated. Archive bytes and scoped transactional purge are real application functionality.
Live Tide cryptographic protection remains unverified.

## Judging prompts

**Vision and originality** — Make recovery-copy deletion a governed act, not a standing
admin privilege. Each request freezes one version, recipient and 30-minute window.

**Trust constraint** — The intended guarantee is that one compromised application account
cannot manufacture purge authority. The simulator requires distinct trustee actor IDs;
repeating one actor adds no vote. Locally selectable demo actors are not independent people.

**Value and impact** — Synthetic logistics firm Harbourline Freight can delegate archive
maintenance without intending to delegate unilateral destruction of recovery copies.

**Why Tide matters** — The intended TideCloak integration governs issuance of the exact
`vault-purge:<manifest hash>` realm role. The trusted backend checks scope, recipient,
issuer, client, expiry and single use. Real signed quorum policy and unilateral-grant
resistance still need live verification; local voting is not equivalent cryptography.

**Prototype and storytelling** — File a request without deleting bytes; show first/repeated
votes insufficient; grant after a second simulated trustee; purge exactly once; reject
replay and download the surviving version. A dependency-free terminal demo provides a
second, clearly simulated illustration of the real vault core.

## Setup

Use Node >=22.18 (Node 24+ recommended) and npm. No live Tide setup is required for simulation.

```sh
npm ci
npm test
npm run build
npm run simulate
```

Open **http://localhost:3000** (SSH-forward port 3000 if using a remote machine).
The server binds to loopback; do not publicly expose the demo-account selector.
Synthetic archive data is seeded automatically and kept separate from real-mode data.

Select **Demo Operator**, file a request, switch to **Trustee A**, propose the grant and
refresh governance, then approve. Approve as **Trustee B**, return to **Operator**, refresh
simulated role claims, and execute. See [full walkthrough](docs/SIMULATION.md).

Stop the app before running the dynamic HTTP check, which uses port 3000:

```sh
npm run test:simulation
```

Optional terminal illustration, with no dependency installation needed:

```sh
node scripts/demo-planc.mjs --fast
```

This calls the real core with synthetic unsigned claims, not HTTP/JWT/DPoP. It is not a
replacement for the automated tests or the interactive web simulator.

### Real Tide mode — currently blocked

`npm start` explicitly selects real Tide mode and never falls back to simulation. A genuine
exported adapter is required at ignored `public/tidecloak.json` and `data/tidecloak.json`.
Fresh realm provisioning requires a licence email, explicit acceptance of
<https://tide.org/legal>, and a hosting choice. Current licensing failed; no live sign-in,
independent quorum, role issuance or authenticated purge is claimed. See
[evidence and remaining checks](docs/evidence/governance.md).

## Honest limitations

- Archive documents are small synthetic records. Demo actors are locally selectable,
  not secure authentication or organisational separation of duties.
- The backend is the pinned trusted process and single SQLite store; deletion from the
  active archive is logical, not secure erasure of pages/physical copies.
- Host/root/storage compromise and a malicious quorum are outside the protection boundary.
- Real approval-target correlation and alternative grant paths remain unverified.
- Single-process DPoP replay storage is memory-only; purge consumption persists in SQLite.
- HTTP and unit tests do not establish browser visual/accessibility correctness or live Tide security.

## Attribution

Built for the [Tide](https://tide.org) hackathon, with retained TideCloak integration points
and organiser-authorised simulation during the outage.
