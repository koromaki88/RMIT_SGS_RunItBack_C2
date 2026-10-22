# Dual-Control Recovery Vault — clean starting point

**Goal:** one compromised application account must not be enough to destroy recovery copies.

This checkout is a blank implementation canvas, retaining only reusable TideCloak auth
helpers, relay/configuration assets, and planning documents. There is **no runnable app,
package manifest, installed dependency tree, profile feature, local adapter, or database**.
No previous application or local identity container is running. Network identities were
not deleted or revoked.

## Three-agent handoff

Read [AGENTS.md](AGENTS.md), then [the three-hour coordination plan](docs/implementation/00-coordination.md).

| Agent | Assignment |
|---|---|
| 1 | [Fresh Tide foundation, real governance proof, integration ownership](docs/implementation/01-agent-auth-governance.md) |
| 2 | [Transactional vault backend, exact purge authority, backend tests](docs/implementation/02-agent-vault-backend.md) |
| 3 | [Product UI, integration checks, README/video/submission preparation](docs/implementation/03-agent-ui-submission.md) |

All three use the frozen [API and authority contract](docs/implementation/04-contract.md).
The [product brief](tide-ransomware-vault-brief.md) defines scope and honest claims.

**Deadline mode:** three hours total, not three hours of isolated work per agent. The
last 45 minutes are reserved for integration, recording, and submission. Live governance
is unverified; do not replace it with simulated signatures or application approval counts.

## Retained building blocks

- `src/lib/auth/`: JWT/configuration/DPoP helpers. Review audience/time-claim requirements
  for the fresh client before using them; retaining code is not a fresh deployment test.
- `public/tide_dpop_auth.html`: byte-exact SDK relay; do not rewrite it.
- `public/silent-check-sso.html`, `next.config.ts`, `.env.example`, `.gitignore`.

These are not sufficient to run `npm start` until Agent 1 adds the minimal application
foundation and exports a legitimate fresh adapter. Do not reuse retired credentials or
start a retired container to make the new project appear configured.

## Retirement record

The previous source, dependencies, local state, credentials, and backups were archived
outside this repository under the workspace's private `.retired-projects/20261022T072755Z/`.
Its local container was stopped and automatic restart disabled. The stopped container
was retained for recovery, but its former bind-mount path has been archived: do not start
it directly. Restoration instructions are private in the archive.

Git history and staging were preserved. No reset, commit, push, network-account deletion,
or fresh realm provisioning was performed by this cleanup.
