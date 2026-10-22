# Repository guidance

Read `README.md`, `SECURITY.md` and `docs/ARCHITECTURE.md` before changing authentication,
governance or purge behaviour. User workflows are in `docs/SIMULATION.md`.

- Preserve the goal: destructive authority is scoped to one frozen operation, recipient,
  client and expiry, and consumed once. UI flags and governance links are not authority.
- Simulation is explicitly selected, labelled and isolated from real Tide mode. Never
  introduce automatic fallback, accept simulation cookies in real mode, or describe
  simulated actor votes as Tide signatures or independent people.
- Keep strict real-mode JWT and DPoP verification. Never relax it to make a demo work.
- Preserve SQLite atomic deletion/consumption and idempotent seed behaviour. Do not
  reset a database, restore retired services or discard existing work without permission.
- Keep credentials, adapters, sessions and databases out of Git and client bundles.
- A fresh Tide realm needs the user's licence email, explicit agreement to
  https://tide.org/legal and a hosting choice. Humans enrol and approve for themselves.
- Custom Forseti deployment is not self-service; do not upload contracts.
- Keep changes narrow; do not add unrelated upload, profile, encryption or multi-tenant features.
- Use one installer/build/server process at a time. Stop the app before rebuilding or
  running the HTTP test, which owns port 3000. Restart the requested mode afterwards.
- Validate with `npm test`, `npm run build` and `npm run test:simulation` when relevant.
  Keep documented behaviour and limits aligned with actual results.
- Do not stage, commit, push, merge branches or discard other work without user authorisation.
