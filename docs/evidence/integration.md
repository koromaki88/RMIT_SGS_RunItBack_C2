# Local three-agent integration results

Branch: `feat/recovery-vault-mvp`. Agent 2 and Agent 3 remote branch changes were imported
without commits using `git merge --squash`; root main and remotes were not changed. Existing
uncommitted Agent 1 work was preserved. Imported changes are staged, integration fixes are
not automatically staged. Review the full working tree/index before committing.

## Passed locally

- `npm test`: 31 test groups passed across auth, UI logic and backend.
- `npm run build`: Next.js production build, TypeScript and static page generation passed.
- Actual backend contract types wired into UI; actual SDK auth and governance adapters replace
  pre-merge fail-closed placeholders. The strict provider is mounted in the layout.
- Byte-download response typing fixed without changing bytes.
- Unknown quorum counts explicitly render unknown; no assumed two-of-three threshold.
- Protected governance-link metadata requires the exact expected trustee client role.
- Running production home returns 200 and explicitly reports missing real identity setup.
- Unauthenticated GET objects, GET requests, POST request, and POST execute all return 401.
- Runtime Tide doctor confirms the exact served relay and headers: 10 passes, one failure.

## Still blocked / not tested

The doctor failure is the absent genuine adapter. Fresh realm licensing is still unresolved;
see `governance.md`. There is no claimed real login, 2-of-3 grant, or live authenticated purge.
Synthetic-key/local backend tests do not establish that Tide's grant path enforces quorum.
The UI does not render a false signed-in state, fake archive, or simulated approval success.

No credentials, tokens or test authority were installed into runtime as a workaround. The
temporary licence watcher was left running independently. A build passing does not mean the
hackathon's central security promise is proven or the submission/video is complete.
