# Dual-Control Recovery Vault — Plan C overview draft

One stolen application-admin login should not be enough to destroy a company's recovery copies.

**Status:** Following the organisers' outage guidance, sign-in, roles and quorum are simulated.
Live Tide cryptographic governance and resistance to unilateral grants remain unverified.

### Vision & originality
A backup vault where deleting a recovery version is a governed act instead of an admin privilege.
Purge authority is bound to one exact file version, recipient and expiry, and works once.

### Trust constraint insight
Ransomware attackers can use compromised administrator accounts to destroy recovery options.
The intended boundary is that one application account cannot manufacture destructive authority.
It does not protect against a compromised server or storage host.

### Value & impact
A small logistics firm like synthetic Harbourline Freight can delegate archive maintenance
without intending to delegate unilateral purge authority. Normal downloads remain available.

### Why TideCloak matters
The intended integration uses Tide IGA to govern the exact realm role `vault-purge:<manifest hash>`.
The trusted backend checks the frozen manifest, issuer, recipient, client, expiry and exact role,
then purges in one transaction. The actual live signed policy and alternative grant paths still
require verification. The simulator is ordinary server enforcement, not Tide cryptography.

### Prototype & storytelling
Show a missing-authority refusal, filing, distinct simulated trustee votes, exact purge,
replay refusal and the surviving version. All demo identities may be controlled locally.

## Setup

Canonical web setup and current limitations: [repository README](../../README.md) and
[simulation guide](../SIMULATION.md). Requires Node >=22.18 for the dependency-free CLI:

```sh
node scripts/demo-planc.mjs --fast
node --test "tests/vault/*.test.mjs"
```

The terminal demo calls the real vault core directly with synthetic unsigned claims; it
does not test HTTP authentication, JWT validation, DPoP, or live Tide. It is a storytelling
aid, not an assertion-based test suite. The web simulator remains the primary interactive demo.
