/**
 * ===========================================================================
 * MERGE SEAM — Agent 3's only glue to Agent 1 / Agent 2 modules. (04-contract.md)
 * ===========================================================================
 *
 * AGENT 2 real target:  `@/lib/vault/contract` (types) — Agent 2 publishes it early.
 * AGENT 1 real targets: `@/app/providers.tsx` (mounted in layout), `useTidecloak`
 *                       provider state, `secureFetch`, and
 *                       `@/lib/tide/governance-client`
 *                       (`proposePurgeGrant` / `readGovernance` / `approveGovernance`).
 *
 * The type/shape names below mirror 04-contract.md §2 and §4 exactly — no field is
 * renamed. Every binding that still points to a stub is marked MERGE-SWAP; at
 * integration only THIS file changes (plus layout's Providers import path if Agent
 * 1 changes it). Until the swaps land the UI stays fail-closed: pending banner,
 * no sign-in, no data fetches, no governance calls — nothing is fabricated.
 */

/** MERGE-SWAP: replace with `export type { … } from "@/lib/vault/contract"` (Agent 2). */
export type ArchiveObject = {
  objectId: string;
  version: number;
  name: string;
  size: number;
  sha256: string;
  state: "AVAILABLE" | "PURGED";
};

export type GovernanceLink = { changeRequestId: string; actionType: string };

export type PurgeManifest = {
  schema: "vault-purge-v1";
  requestId: string;
  operation: "PURGE_VERSIONS";
  vaultId: "harbourline-demo";
  objects: Array<{ objectId: string; version: number; sha256: string }>;
  requester: { issuer: string; subject: string };
  executorSubject: string;
  executorAudience: string;
  createdAt: string;
  expiresAt: string;
  reason: string;
};

export type PurgeRequest = {
  requestId: string;
  manifest: PurgeManifest;
  manifestHash: string;
  entitlement: string;
  state: "FILED" | "EXECUTED" | "EXPIRED";
  governanceLinks: GovernanceLink[];
  executedAt: string | null;
};

export type GovernanceObservation = {
  changeRequestId: string;
  status: "PENDING" | "APPROVED" | "DENIED" | "CANCELLED" | "UNKNOWN";
  authorizationCount: number | null;
  threshold: number | null;
};

export type ApiError = { error: { code: string; message: string } };

// ---------------------------------------------------------------------------
// Agent 1 seam: DPoP-bound secureFetch. MERGE-SWAP to Agent 1's real export.
// The stub refuses to talk to the network, so the client API layer surfaces
// "setup pending" instead of quietly issuing unauthenticated (Bearer) calls —
// plain fetch is forbidden for protected endpoints (03-agent-ui-submission.md).
// ---------------------------------------------------------------------------

/** Absolute public origin pinned by the shared contract. Never changed in-app. */
export const PUBLIC_ORIGIN = "http://localhost:3000";

export const secureFetch: (url: string, init?: RequestInit) => Promise<Response> =
  () =>
    Promise.reject(
      new Error(
        "SECURE_FETCH_PENDING: Agent 1's DPoP-bound secureFetch is not merged yet. " +
          "The UI stays in setup-pending mode and performs no protected calls.",
      ),
    );

/**
 * Real governance adapter from Agent 1 (browser-only module, contract §4).
 * MERGE-SWAP: re-point each body to the real export in
 * `@/lib/tide/governance-client`. The stubs throw the same pending error so the
 * Requests view renders governance as "unavailable (pending setup)", never as
 * approved/committed.
 */
export async function proposePurgeGrant(
  _request: PurgeRequest,
  _secureFetch: (url: string, init?: RequestInit) => Promise<Response>,
): Promise<GovernanceLink[]> {
  void _request;
  void _secureFetch;
  throw new Error(
    "GOVERNANCE_PENDING: Agent 1's governance-client adapter is not merged yet.",
  );
}

export async function readGovernance(
  _links: GovernanceLink[],
  _secureFetch: (url: string, init?: RequestInit) => Promise<Response>,
): Promise<GovernanceObservation[]> {
  void _links;
  void _secureFetch;
  throw new Error(
    "GOVERNANCE_PENDING: Agent 1's governance-client adapter is not merged yet.",
  );
}

export async function approveGovernance(
  _changeRequestId: string,
  _secureFetch: (url: string, init?: RequestInit) => Promise<Response>,
): Promise<GovernanceObservation> {
  void _changeRequestId;
  void _secureFetch;
  throw new Error(
    "GOVERNANCE_PENDING: Agent 1's governance-client adapter is not merged yet.",
  );
}

// ---------------------------------------------------------------------------
// Agent 1 seam: auth provider state. MERGE-SWAP the body of useAuthStatus to
// Agent 1's provider hook (e.g. the useTidecloak export binding authenticated /
// initialised / login / logout). Until then the header shows "Sign-in pending
// setup" with disabled controls — never a fake signed-in state.
// ---------------------------------------------------------------------------

export type AuthStatus = {
  /** true once the provider reports a real, verified session. */
  authenticated: boolean;
  /** false until Agent 1's provider is merged and mounted (no fake "signed in"). */
  providerReady: boolean;
  /** undefined while the real provider is still initialising. */
  pending: boolean;
};

export function useAuthStatus(): AuthStatus & {
  signIn: () => void;
  signOut: () => void;
} {
  return {
    authenticated: false,
    providerReady: false,
    pending: true,
    signIn: () => {
      throw new Error(
        "SIGNIN_PENDING: Agent 1's auth provider is not merged yet (fail-closed UI).",
      );
    },
    signOut: () => {
      throw new Error(
        "SIGNOUT_PENDING: Agent 1's auth provider is not merged yet (fail-closed UI).",
      );
    },
  };
}
