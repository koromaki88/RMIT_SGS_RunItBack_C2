# Dual-Control Recovery Vault

**One compromised login should not erase your way back.**

**Outage mode:** Following the organisers' guidance, sign-in, roles and approval governance
are simulated. Archive bytes and scoped transactional purge are real application functionality.
Live Tide cryptographic protection remains unverified.

Download synthetic recovery exports, request removal of one exact version, collect two
distinct simulated trustee approvals, then execute a scoped, single-use purge. The other
version remains available. The intended TideCloak integration governs acquisition of that
destructive authority; it is not yet a verified production deployment.

## Quick start

Use **Node.js 22.18+** (Node 24 LTS recommended) and npm. Run these commands from the
repository root. Simulation needs **no Docker, Tide account, adapter or `.env` file**.

```sh
npm ci
npm run build
npm run simulate
```

Open **http://localhost:3000** (SSH-forward port 3000 if using a remote machine).
The server binds to loopback; do not publicly expose the demo-account selector.
Synthetic archive data is seeded automatically and persists across restarts. Stop the
server with **Ctrl+C**. To start it again without code changes, run `npm run simulate`.

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
[setup status and remaining checks](docs/TIDE.md).

## Commands

| Command | Purpose |
|---|---|
| `npm run simulate` | Serve the built app in explicit local simulation mode |
| `AUTH_MODE=simulation npm run dev -- --port 3000` | Simulation with hot reload (POSIX shell) |
| `npm run build` | Build the production bundle and check TypeScript |
| `npm test` | Auth, UI-logic and vault unit tests |
| `npm run typecheck` | TypeScript check without a production build |
| `npm run test:simulation` | Isolated HTTP workflow, restart and real-mode separation checks |
| `node scripts/demo-planc.mjs --fast` | Dependency-free terminal illustration |
| `npm start` | Real Tide mode; requires completed identity setup, **not** the simulator |

Only one process may use port 3000. Stop the app before a build or HTTP test; after
editing code, rebuild before using `npm run simulate`. `npm run dev` without `AUTH_MODE`
uses real Tide mode rather than silently enabling simulation.

## Documentation

- [Simulation walkthrough, fresh datasets and troubleshooting](docs/SIMULATION.md)
- [Architecture, data flow and API](docs/ARCHITECTURE.md)
- [Security boundary, test evidence and known gaps](SECURITY.md)
- [Real Tide setup status and readiness checklist](docs/TIDE.md)
- [Hackathon overview](docs/submission/OVERVIEW.md) and [recording guide](docs/submission/RECORDING.md)

## Limitations

- Archive documents are small synthetic records. Demo actors are locally selectable,
  not secure authentication or organisational separation of duties.
- The backend is the pinned trusted process and single SQLite store; deletion from the
  active archive is logical, not secure erasure of pages/physical copies.
- Host/root/storage compromise and a malicious quorum are outside the protection boundary.
- Real approval-target correlation and alternative grant paths remain unverified; see [security notes](SECURITY.md).
- Single-process DPoP replay storage is memory-only; purge consumption persists in SQLite.
- HTTP and unit tests do not establish browser visual/accessibility correctness or live Tide security.

## Attribution

Built for the [Tide](https://tide.org) hackathon, with retained TideCloak integration points
and organiser-authorised simulation during the outage.
