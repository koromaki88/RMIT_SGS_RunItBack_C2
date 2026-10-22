# Agent 1 evidence — fresh recovery-vault environment

## BLOCKED: fresh vendor licensing, 22 October 2026

No live quorum or operation-specific entitlement proof exists yet. No adapter or mock
credentials were substituted. The retired environment was not restored.

### Observed setup

- User explicitly confirmed fresh licence email/Terms and local Docker.
- New container `recovery-vault-tidecloak` started on loopback port 8080.
- Realm `recovery-vault` and client `recovery-vault-client` created; intended browser origin
  is `http://localhost:3000`, with an explicit client audience mapper in the initial template.
- Initial `setUpTideRealm` failed during vendor wallet finalisation:

```text
TIDE-IDPEXT-VENDOR-KEYGEN_FAILED
The vendor key was created but the license could not be set up.
[Midgard] FinalizeWallet failed:
HttpRequestException: Response status code does not indicate success: 500
```

- A read-only `getLicenseDetails` call timed out. A documented `CreateTideVendorKey` lifecycle
  retry also returned HTTP 500 with `TIDE-IDPEXT-VENDOR-KEYGEN_FAILED`.
- Bootstrap stopped before enabling IGA, creating users, invitations, or adapter export.
- Doctor: realm exists, no adapter, IGA not enabled, no pending governance requests at check time.

### Local code checks

`npm test`: eight synthetic-key auth test groups passed. The tests exercise the real protected
handler and token/proof verifier with isolated keys, not a real enrolled account. Negative
cases include wrong/missing audience, issuer/client/identity/time claims, untrusted signatures,
unbound/Bearer requests, wrong proof URL/method/token hash/key, stale timestamps, and replay.

The browser governance adapter is implemented but unverified against a live governed role grant.
No signed threshold >=2, real operation role, recipient token, or live purge result is claimed.

### Single-person rehearsal disclosure

The human plans to create three distinct accounts themselves. Successful distinct-account
mechanics would not prove independence between real people. Do not label that rehearsal an
organisational separation-of-duties deployment.

### Needed before PASS

Successful licensing, legitimate browser linking, signed live threshold inspection, first-account
insufficiency, second distinct-account commitment, actual expected audience/role claims in the
recipient token, exact executor integration, and relevant unilateral bypass tests. Until then,
runtime execution must remain fail-closed; application counts or recorded status are not authority.
