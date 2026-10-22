# Dual-Control Recovery Vault

One stolen admin login should not be enough to destroy a company's last clean backup.

### Vision & originality
A backup vault where deleting a recovery version is a governed act instead of an admin privilege. Purge authority does not exist in advance. It is created for one exact file version, only after independent trustees approve it, and it works once.

### Trust constraint insight
Ransomware attackers often log in as an administrator and wipe the backups first, because today whoever controls the admin account or the server can grant themselves delete rights. Companies respond by locking backups down until routine cleanup is painful. If no single account can create destructive authority, normal maintenance stays easy without that risk.

### Value & impact
A small logistics firm like our synthetic Harbourline Freight can let an IT contractor run day-to-day archive work. If the contractor's account is phished, the attacker can file a purge request but cannot approve it, so the recovery copy survives and the business restores instead of paying.

### Why TideCloak matters
TideCloak issues the purge permission through Emergent Authority: the role `vault-purge:<manifest hash>` only appears in a user's token after a quorum of trustees approves that exact manifest. No realm admin, server operator or the app itself can mint it alone. The backend re-hashes the manifest, checks issuer, user, client and the exact role, then purges in one transaction.

### Prototype & storytelling
Watch for: a compromised admin's purge is refused; an operator files a request; two different trustees approve; the purge runs once; a replay is rejected; the other version still downloads.

Note: Tide's network was under heavy load on 22 Oct, so, per Tide's Plan C, sign-in and the quorum-issued role are simulated.

## Setup

Requires Node.js 22.18 or newer (built-in `node:sqlite` and TypeScript type stripping). No install step is needed for the demo and tests below.

```bash
git clone https://github.com/koromaki88/RMIT_SGS_RunItBack_C2.git
cd RMIT_SGS_RunItBack_C2
node scripts/demo-planc.mjs            # the purge story, simulated TideCloak (Plan C)
node --test "tests/vault/*.test.mjs"   # 11 backend tests of the authority rule
```

Web app: (Agent 1 adds the exact commands here.)
