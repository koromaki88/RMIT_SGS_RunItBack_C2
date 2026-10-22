/** Integrated bindings: no simulated sessions, data, or approvals. */
export type {
  ArchiveObject, GovernanceLink, PurgeManifest, PurgeRequest,
  GovernanceObservation, ApiError,
} from "../lib/vault/contract";
export { proposePurgeGrant, readGovernance, approveGovernance } from "../lib/tide/governance-client";

export const PUBLIC_ORIGIN = "http://localhost:3000";

/** SDK instance is shared with the real provider; never fall back to bare fetch. */
export async function secureFetch(url: string, init?: RequestInit): Promise<Response> {
  if (typeof window === "undefined") throw new Error("Authenticated requests require a browser session.");
  const { IAMService } = await import("@tidecloak/js");
  if (!IAMService._tc?.authenticated) throw new Error("Sign in with a real Tide account before making protected requests.");
  return IAMService.secureFetch(url, init);
}
