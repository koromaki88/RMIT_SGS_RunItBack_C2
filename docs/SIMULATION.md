# Run and use the local simulator

The simulator lets you exercise the complete purge workflow without a Tide service.
Sign-in, roles and two-trustee governance are simulated server-side. The archive stores
actual synthetic bytes, and purge uses the real transactional vault implementation.

Do not expose this mode publicly: anyone with access can choose every demo identity.

## Run

```sh
npm ci
npm run build
npm run simulate
```

Open http://localhost:3000 using SSH forwarding if necessary. Only one app can use port 3000.
The app binds to loopback. No Tide service, credentials, licence or adapter is needed in
simulation mode. Do not expose this deliberately unauthenticated demo-account selector publicly.

Normal `npm start` explicitly forces real Tide mode. It does not fall back to simulation;
without the genuine exported adapter it shows the identity-setup blocker. Simulation endpoints
return 404 in real mode, and simulation cookies cannot authorise its vault APIs.

## Hands-on walkthrough

1. In the persistent amber simulation banner select **Demo Operator**.
2. Download a recovery version, then file a purge request with a reason. Try execute: refused.
3. Select **Demo Trustee A**. Find the request and select **Propose grant**, then **Refresh
   governance**. Approve the linked simulated request once. Refresh to see 1 of 2.
4. Approve again as A: it still counts once. Operator execution must still fail.
5. Select **Demo Trustee B**, refresh that request's governance, and approve. The simulated
   change now reports 2 of 2 and applied.
6. Return to **Demo Operator**. Selecting the actor creates a new session with current claims;
   alternatively use **Refresh simulated role claims** for an existing recipient session.
7. Execute the exact request: the selected version is logically removed. The other version
   stays downloadable. Download it to verify survival. The UI no longer offers execution
   for completed requests; repeated execution is checked through the automated HTTP test.

Actor selection is intentionally not secure authentication: anyone using this local
simulation can choose any demo actor. These accounts are NOT independent people or ORK
identities. The banner discloses this throughout the workflow. Session role snapshots
make already-open recipient sessions stale until refresh; changing actors creates fresh claims.

Different browser profiles have separate cookies. Tabs in the same browser profile share
the selected actor/session. Do not mistake tabs for independent accounts.

## Real vs simulated

| Component | Current simulation behaviour |
|---|---|
| Sign-in | Fixed demo selector; opaque HttpOnly, SameSite=Strict local session cookie |
| Roles | Server-defined fixed actor roles; client cannot post an arbitrary role |
| Governance | Server SQLite records two distinct demo trustees; unique actor/change pair prevents duplicate votes |
| Entitlements | Exact frozen-request role appears after simulated grant and session refresh |
| Cryptography / DPoP | **Not simulated as a cryptographic claim.** Sim mode uses cookie/origin checks, not Tide tokens/proofs |
| Archive | Actual synthetic byte arrays stored in SQLite BLOBs |
| Requests | Actual canonical manifest/hash, recipient and expiry checks |
| Purge | Actual database transaction and durable single-use state |
| Tide mode | Existing real token/DPoP verifier and browser governance adapter retained, live deployment still blocked |

The simulator represents one aggregate operation-grant change, not every separate role-create/
grant dependency in real IGA. It does not render a fake enclave popup or invent Tide signatures.
Server-side simulated checks are ordinary application enforcement; a host/operator can bypass
them. They are not the claimed production trust guarantee of Tide's network.

## Data separation

Default simulation data: ignored `data/simulation/vault.sqlite` and `governance.sqlite`.
Real-mode vault data is separate. No automatic reset/reseed resurrects a purged version.
To start a separate demo dataset, stop the simulation and deliberately choose a fresh
`SIMULATION_DATA_DIR` directory when launching; retain the previous dataset if it matters.
No HTTP reset or raw-delete endpoint is provided.

For a fresh rehearsal, stop the app and select a **new, unused** directory under ignored
`data/`. For example, in a POSIX shell:

```sh
SIMULATION_DATA_DIR="$PWD/data/rehearsal-01" npm run simulate
```

Use a different suffix for each fresh dataset. Reusing a directory resumes its existing
archive and approvals; it does not reset them. Keep both `vault.sqlite` and `governance.sqlite`
together when preserving a simulation dataset. Do not point this at a real vault directory.
To resume the default dataset, stop the app and run `npm run simulate` without the override.

## Remote access over SSH

Run the server on the remote machine, then run this on your own computer (replace the
host with your SSH destination):

```sh
ssh -N -L 3000:127.0.0.1:3000 user@your-server
```

Open **http://localhost:3000** locally. No port 8080 forwarding is needed for simulation.
Keep local port 3000: simulation requests require the configured localhost origin.

## Automated dynamic check

Stop any app on port 3000, then:

```sh
npm run build
npm run test:simulation
```

The script starts isolated temporary simulation and real-mode test servers in turn,
uses disposable databases in your OS temporary directory, exercises real HTTP routes, then stops them.
It tests: unauthenticated refusal, same-origin write requirement, member grant refusal,
one-trustee failure, duplicate-vote refusal, second-trustee commitment, stale claim refusal,
wrong-recipient refusal, exact execution, surviving bytes/digest, replay, restart/seed behaviour,
and rejection of simulated sessions/endpoints in real mode. Temporary test data is retained
at the path printed by the script. It never touches the real Tide licence/realm.

## Troubleshooting

| Symptom | What to do |
|---|---|
| Missing production build | Run `npm run build` before `npm run simulate`. |
| Port 3000 already in use | Stop the existing app with Ctrl+C. Do not start the HTTP test alongside it. |
| Identity setup pending / missing adapter | You launched real mode. Stop it and use `npm run simulate`. |
| No downloadable versions | This dataset was already purged. Use a new dataset directory; restarting does not restore bytes. |
| Execute returns 403 | Confirm two distinct trustees approved the same change; return to the filing Operator and refresh simulated role claims. Trustee/admin roles alone do not authorise execution. |
| Request expired / 410 | Requests expire after 30 minutes. File a new request and approve its new operation; old grants cannot be reused. |
| Conflict / 409 | The request was consumed or its target is no longer available. Refresh the archive and requests. |
| Local simulation origin required | Use http://localhost:3000, not a public tunnel or a different forwarded port. |
| Session looks wrong in another tab | Tabs share cookies. Refresh after actor selection, or use separate browser profiles. |
| Initial configuration fetch failed and Retry does not help | Reload the browser page after checking the server/SSH connection. |

The displayed governance counts and request state are snapshots. Refresh before deciding
what to do; the backend rechecks authority, expiry and state on every execution.

## Validation and limits

- At documentation refresh, 34 auth/UI/backend tests passed.
- Production build and TypeScript pass with simulation support present.
- Dynamic HTTP simulation test passes, including restart and real-mode separation.
- Browser UI interaction still needs a human check; no browser automation success is claimed.
- No live Tide licence, quorum, ORK signing, claim propagation, or self-grant resistance is proven.

Submission disclosure:

> Following the organisers' outage guidance, sign-in, roles and approval governance are
> simulated. The archive and scoped transactional purge run locally on synthetic data.
> Real TideCloak integration points are retained and documented; live cryptographic
> governance remains unverified.
