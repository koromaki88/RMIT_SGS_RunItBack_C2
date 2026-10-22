# Local simulation during the Tide outage

The organisers instructed participants to plan the TideCloak integration using its MCP
and simulate sign-in, roles, and access checks while the service is unavailable. The user
explicitly authorised this implementation. This supersedes the earlier plan's ban on a
runtime simulation **only for this separately selected and labelled mode**.

## Run

```sh
npm install
npm test
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
   stays downloadable. A repeated execution is refused.

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

## Automated dynamic check

Stop any app on port 3000, then:

```sh
npm run build
npm run test:simulation
```

The script starts isolated temporary simulation and real-mode test servers in turn,
uses disposable databases under `/tmp/opencode/`, exercises real HTTP routes, then stops them.
It tests: unauthenticated refusal, same-origin write requirement, member grant refusal,
one-trustee failure, duplicate-vote refusal, second-trustee commitment, stale claim refusal,
wrong-recipient refusal, exact execution, surviving bytes/digest, replay, restart/seed behaviour,
and rejection of simulated sessions/endpoints in real mode. Temporary test data is retained
at the path printed by the script. It never touches the real Tide licence/realm.

## Results and limits

- Existing 33 auth/UI/backend tests pass.
- Production build and TypeScript pass with simulation support present.
- Dynamic HTTP simulation test passes, including restart and real-mode separation.
- Browser UI interaction still needs a human check; no browser automation success is claimed.
- No live Tide licence, quorum, ORK signing, claim propagation, or self-grant resistance is proven.

Submission disclosure:

> Following the organisers' outage guidance, sign-in, roles and approval governance are
> simulated. The archive and scoped transactional purge run locally on synthetic data.
> Real TideCloak integration points are retained and documented; live cryptographic
> governance remains unverified.
