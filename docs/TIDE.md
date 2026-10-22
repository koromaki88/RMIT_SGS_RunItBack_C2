# Real TideCloak mode

## Current status

**Use [simulation mode](SIMULATION.md) to run the project today.** Real Tide mode is not
ready for a security-sensitive deployment. Vendor licensing failed with HTTP 500 and
`TIDE-IDPEXT-VENDOR-KEYGEN_FAILED`; wallet finalisation also returned an upstream 403.
A bounded retry window ended without confirmed activation. No genuine adapter or live
quorum proof was exported. Do not infer that the external service has recovered from a build passing.

The intended integration uses TideCloak sign-in, strictly verified JWT/DPoP, and browser-to-Tide
IGA proposals/approvals to govern an exact realm-role grant. Real approval-target validation
also needs work; see [known gaps](../SECURITY.md#known-gaps-before-live-use).

## Configuration and launch

After legitimate setup and adapter export:

| Setting/path | Purpose |
|---|---|
| `public/tidecloak.json` | Genuine browser adapter; never include bootstrap secrets |
| `data/tidecloak.json` | Genuine server verification adapter |
| `CLIENT_ADAPTER` | Optional server-only JSON alternative to the server adapter file |
| `APP_ORIGIN` | Pinned server DPoP origin; default `http://localhost:3000` |
| `VAULT_DB_PATH` | Optional real vault SQLite path; default `data/vault.sqlite` |

The browser API origin currently remains `http://localhost:3000`; changing `APP_ORIGIN`
alone does not reconfigure the whole application. Public deployment requires coordinated
client/issuer/origin/HTTPS settings and security review, not just binding to another address.

```sh
npm run build
npm start
```

`npm start` forces real mode. Without a genuine adapter the app shows identity setup pending;
it never enables simulated sign-in as a fallback. No real bootstrap is necessary for the demo.

## Fresh local provisioning — operator-only, not a recovery shortcut

The repository includes `npm run init` / `scripts/init-tidecloak.sh` as bootstrap tooling,
**not a verified end-to-end setup recipe**. It creates identity state and can trigger
licensing/governance changes. Review current Tide MCP guidance and the script before use.

1. The deployment owner supplies the licence-management email and personally agrees to
   [Tide's Terms & Conditions](https://tide.org/legal). Do not reuse someone else's consent.
2. Choose local Docker or hosted Skycloak before realm creation; the realm cannot be moved later.
   The included script is local-Docker tooling, not a hosted deployment installer.
3. For local bootstrap, review `.env.example`; keep real operator values in ignored `.env`
   or a secret manager. The script can also load ignored `.setup/operator.env`; inspect
   existing local state first. Never commit passwords or licence details.
4. Review prerequisites: Bash, Docker, curl, jq and local port 8080; the current script also
   requires UID 1000 for volume handling. It refuses an existing named container/database.
5. Run bootstrap only for an intentionally fresh environment. Existing partial licensing
   failures need diagnosis, not database/container deletion or repeated blind initialisation.
6. Humans enrol accounts in their browsers. Export authentic adapters after successful setup;
   never fabricate adapter keys or use a master token as application identity.

If accessing a local identity container over SSH, forward 8080 as well as app port 3000.
Keep enrolment links and personal credentials off-screen and out of logs shared publicly.

## Readiness checklist

Before claiming Tide protection, verify all of these against the actual deployment:

- [ ] Licensing, genuine adapters and authenticated sign-in succeed.
- [ ] Intended client audience, issuer, EdDSA signature/time claims and bound DPoP pass;
      wrong/missing/unbound tokens and replay fail.
- [ ] IGA uses Tide cryptographic mode, not simple/Tideless attestation.
- [ ] Inspect the signed in-force admin policy: required distinct approvals are >=2.
      Neither account count nor an unsigned configuration value proves the threshold.
- [ ] Exact role creation/grant dependencies and frozen-operation review are validated.
- [ ] One trustee, repeated votes and unilateral alternative grant/configuration paths cannot
      produce an accepted equivalent entitlement.
- [ ] A distinct second trustee supplies the required approval through their own browser identity;
      no service-account proxy collapses everyone into the same caller.
- [ ] A fresh recipient token carries the exact operation role; missing/stale roles fail.
- [ ] Exact purge, surviving digest, expiry, tamper, restart and replay checks pass with real auth.

The current browser adapter uses `/iga/change-requests/{id}/approve`: request a model,
have the human sign via the enclave if required, return the signed model, then re-read
the actual result. `APPROVED` means committed/applied, not merely that a popup closed.
Role creation can precede the recipient grant as a separate governed dependency.

Do not bypass failed checks by loosening the verifier, assuming quorum, adding master
credentials to runtime, or presenting simulation as cryptographic evidence.
