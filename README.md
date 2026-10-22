# Dual-Control Recovery Vault

**One compromised login should not erase your way back.**

**Outage mode:** Following the organisers' guidance, sign-in, roles and approval governance
are simulated. Archive bytes and scoped transactional purge are real application functionality.
Live Tide cryptographic protection remains unverified.

## Project overview

**Vision and originality:** Protect the recovery path when ransomware controls an
application account. Separate acquisition of destructive authority from everyday access;
two-person approval is the mechanism, not the product's purpose.

**Trust constraint:** One compromised operator or trustee should not independently
manufacture purge authority. Existing permissions can still be abused, and a valid scoped
grant still permits its authorised action. Selectable demo actors are not independent people.

**Value and impact:** Preserve synthetic logistics firm Harbourline Freight's recovery
copies during an attempted account-level purge, while keeping legitimate maintenance possible.

**Why Tide matters:** The intended integration uses TideCloak IGA to govern issuance of
`vault-purge:<manifest hash>`. The trusted backend enforces the grant's exact target,
recipient, client, expiry and single use. Real signed quorum policy and alternative grant
paths still need verification; local voting is not equivalent cryptography.

**Prototype and storytelling:** First show a compromised Operator's purge refused and
recovery files still downloadable. Separately, legitimate maintenance acquires one exact,
expiring permission through distinct simulated trustees. Only its target is removed.
Tests cover replay refusal and the surviving version; the terminal illustration also
shows cross-request reuse refused. No actual malware is run.

This demonstrates an **authorization boundary around recovery-copy destruction**, not
malware-spread prevention, per-user file isolation, successful restore or protection
against a compromised server/storage host. All signed-in members share archive read access.

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

For a remote machine, run this on your computer and open the same localhost URL:

```sh
ssh -N -L 3000:127.0.0.1:3000 user@your-server
```

## Demo workflow

Keep the amber simulation banner visible. Use a fresh dataset if you have already purged
these versions. Tabs share cookies; separate profiles have separate sessions.

### Attack: one compromised account cannot grant itself a purge

1. Select **Demo Operator**, representing the compromised application account/session.
2. Download both versions to establish the recovery files and their SHA-256 digests.
3. File a request for version 1 with reason **ATTACK REHEARSAL — unapproved purge**.
   Filing deletes nothing. Note this request's ID.
4. On that request, try **Propose grant** and **Execute approved purge**. Both are refused.
   Download version 1 again: the recovery copies remain available. **Leave this request unapproved.**

### Legitimate maintenance: a separate request receives scoped authority

5. As Operator, file a **new** request for version 1 with reason
   **LEGITIMATE MAINTENANCE — retire outdated v1**. This is a separate scenario, not
   approval of the attack or proof that an attacker has been evicted.
6. Select **Demo Trustee A**. On the **legitimate** request, click **Propose grant**,
   **Refresh governance**, then approve. Repeating the vote stays **1 of 2**.
7. Return to Operator, refresh simulated claims and try execution: still refused.
8. Select **Demo Trustee B**, refresh the legitimate request's governance and approve.
9. Return to Operator, refresh simulated role claims and execute the legitimate request.
   Version 1 becomes PURGED. Download version 2 to verify survival.

The grant is bound to that request's hash, recipient and 30-minute expiry, not a standing
delete privilege. Completed cards no longer offer Execute; replay refusal is covered by
the HTTP test/terminal illustration. Unapproved requests can expire; there is no deny UI.

### Fresh rehearsal data

Stop the app, then choose a **new, unused** directory under ignored `data/`:

```sh
SIMULATION_DATA_DIR="$PWD/data/rehearsal-01" npm run simulate
```

Change the suffix for another fresh run. Reusing a directory resumes its data, including
purges and approvals. Keep `vault.sqlite` and `governance.sqlite` together; never use a real
vault directory. Run without the override to resume the default `data/simulation/` dataset.

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

## Testing

```sh
npm test
npm run build
npm run test:simulation
```

Stop the app first: the HTTP test owns port 3000. It creates isolated temporary databases,
checks distinct/repeated votes, stale claims, recipient checks, exact purge, surviving bytes,
replay, restart and real-mode rejection of simulation sessions, then stops its servers.
The printed temporary dataset is retained. Restart the demo with `npm run simulate`.

At the latest verification, **35 unit tests**, build/TypeScript and the HTTP workflow passed.
A local Chromium desktop/mobile check also exercised the attack-first UI, request-scoped
approvals, copy feedback and responsive layout. This is not a full accessibility audit,
an actual malware test, or live Tide security evidence.
The optional terminal demo needs no dependency installation and uses unsigned synthetic
claims directly against the core—not HTTP/JWT/DPoP. Its “Root admin” is a synthetic role
fixture, not operating-system root or proof of real administrator self-grant resistance.

## Troubleshooting

| Symptom | Action |
|---|---|
| Missing build | Run `npm run build` before `npm run simulate`. |
| Port 3000 busy | Stop the previous app/test; only one may use that port. |
| Identity setup pending | You started real mode; stop it and use `npm run simulate`. |
| No downloadable versions | Use a fresh rehearsal directory; restart does not restore purged files. |
| Execute returns 403 | Check two distinct approvals on the same legitimate request; execute as its filing Operator with refreshed claims. |
| Expired / 410 | File and approve a new request; grants expire after 30 minutes. |
| Conflict / 409 | Request is consumed or target changed; refresh the displayed state. |
| Origin refused | Use `http://localhost:3000`, including local SSH-forwarded port 3000. |
| Wrong actor / stale state | Tabs share cookies; refresh the page after account changes. |
| Configuration retry fails | Check server/SSH connectivity, then fully reload the page. |

## Implementation and security boundary

One trusted Next.js Node process stores two synthetic archive versions as SQLite BLOBs.
`src/lib/vault/core.ts` freezes and hashes manifests, then rechecks identity, exact realm
role, target digest, expiry and state inside `BEGIN IMMEDIATE`. BLOB deletion and durable
request consumption commit together; a failed transaction rolls back both. Seed is idempotent.
Shared API types are in `src/lib/vault/contract.ts`; protected routes are under `src/app/api/vault/`.

Simulation uses fixed server roles, HttpOnly SameSite=Strict cookies and persisted distinct
votes, not signed Tide tokens or enclave signatures. Anyone using its selector controls
all demo actors. Real mode instead requires pinned EdDSA JWT verification and bound
ES256/P-256 DPoP. No automatic fallback is allowed; simulation endpoints return 404 in real mode.

The backend/host, storage, clock and sufficient trustee independence are trusted. Host/root
compromise, malicious quorum and denial of service are outside scope. Storage is plaintext;
purge is logical deletion, not physical secure erasure or immutable backup protection.
DPoP does not protect a compromised browser able to use its key. Its replay cache is
process-local and lost on restart; purge consumption persists separately in SQLite.

Known gaps include live approval-target correlation using substring matching, unverified
alternative grant/configuration paths, stale browser snapshots, runtime-mode fetch recovery
requiring reload, accumulating simulation sessions and lack of production rate limiting.
There is no per-user data isolation, malware scanning, restore workflow or full audit system.

## Real Tide mode — not yet verified

Use simulation today. Licensing failed with `TIDE-IDPEXT-VENDOR-KEYGEN_FAILED`; no successful
live sign-in, signed quorum policy, independent approval or authenticated Tide purge is claimed.
The intended integration governs acquisition of an exact realm role via browser-to-Tide IGA;
the application still enforces what that grant can do.

After legitimate setup, `npm start` forces real mode using genuine adapters at ignored
`public/tidecloak.json` (browser) and `data/tidecloak.json` (server). `CLIENT_ADAPTER` is an
optional server-only JSON alternative. `APP_ORIGIN` defaults to `http://localhost:3000`;
changing it alone does not change the hardcoded browser API origin. Real vault storage
defaults to `data/vault.sqlite`, optionally overridden by `VAULT_DB_PATH`.

`npm run init` is operator-only local Docker bootstrap tooling, not a verified deployment
recipe or a way to reset an existing failed realm. Before fresh provisioning, the owner
must supply a licence email, personally accept <https://tide.org/legal>, and choose local
Docker or hosted Skycloak. Review `.env.example` and the script; ignored `.setup/operator.env`
can take precedence over `.env`. Local bootstrap needs Bash, Docker, curl, jq, port 8080
and the script's UID 1000 volume handling. Existing state must not be overwritten.

Before claiming real protection, verify authentic adapters/login, strict JWT/DPoP, Tide
cryptographic IGA mode, a signed threshold of at least two, exact approval-target binding,
independent approvals, refusal of unilateral/self-grant paths, fresh scoped recipient claims
and the full purge/replay/expiry/survival workflow. Never replace these checks with UI counts.

## Demo recording and private state

For a two-minute recording: show the attack refused first, then the separate legitimate
request, one vote insufficient, a distinct second vote, exact purge and surviving version.
Keep the simulation banner visible and explicitly state the boundary—not “ransomware-proof”
or “stops malware spreading”. Use a fresh dataset; no actual malware needs to run.

Keep `.env` secrets, `.setup/`, `data/`, adapters, tokens, cookies, invitation URLs and personal
emails out of commits, recordings and reports. Share redacted error codes and reproduction
steps; send security-sensitive reports privately to the repository owner.

The hackathon video should be a roughly two-minute `.mp4` under 100 MB in the public
repository. Link the actual file here once recorded; do not imply a video exists before it
does. Publishing is not submission: submit the repository link through
<https://forms.gle/HRHYjnqB86j1LFS97>.

## Attribution

Built for the [Tide](https://tide.org) hackathon, with retained TideCloak integration points
and organiser-authorised simulation during the outage.
