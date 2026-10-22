# Dual-Control Recovery Vault

**One compromised login must not erase your way back.** Harbourline Freight lets an
archive operator request that a recovery version be purged, but no single account —
including a strapped application admin — can obtain the destruction authority alone.
Every purge requires an independent quorum approving one exact, hash-bound operation
before the trusted backend will execute it, once.

## Judging prompts

**Vision and originality** — Access to destructive authority should be acquired, not
merely assumed. Applying Tide's model — consequential permission must be minted
through governed quorum — we make backup deletion a governed act rather than an
admin privilege.

**Trust constraint** — One compromised account (session included) cannot itself
acquire purge authority. Approvals come from distinct trustee identities; repeating
one identity's approval adds no independent vote.

**Value and impact** — The shortcut this targets is ransomware's favourite opening
move: destroying backups first. Dual-control issuance blocks unilateral erasure
without blocking normal maintenance.

**Why Tide matters** — Conventional stacks cannot stop a compromised administrator
from manufacturing their own destructive permissions, locally. Tide issues
operation-specific authority through real enclave governance with independent
approvers, so the boundary holds at the point where it matters.

## What the prototype demonstrates

Specifics recorded only after live tests pass; see the status notes. Implementation status is pending.

## Setup

<!-- MERGE-PENDING (Agent 3): Agent 1 supplies exact working commands, Node version,
     and fresh realm/licensing/SSH origin instructions before release. Do not treat
     the placeholders below as working. -->

**PENDING — Agent 1's exact commands go here.** Requirements already known from the
shared plan:

1. Node >= 22.13, public origin `http://localhost:3000`.
2. Fresh realm requires the human's licence email and explicit agreement to
   <https://tide.org/legal>, then the hosting choice — never recycled consent.
3. Setup commands (install, seed, run) to be inserted verbatim from
   `docs/status/agent-1.md` at integration.
4. Governance adapter and provider are Agent 1's exports; see
   `src/components/merge-seam.ts` for the documented swap points.

## Honest limitations

- Files are small synthetic records; no real personal data, credentials, or emails
  appear anywhere in the demo.
- The backend is the pinned trusted process and single SQLite store; deletion from the
  active archive is logical, not secure erasure of pages/physical copies.
- Untested/known bypasses must be listed here from live evidence (pending).

## Attribution

Built with [Tide](https://tide.org) — badge pending final packaging.
