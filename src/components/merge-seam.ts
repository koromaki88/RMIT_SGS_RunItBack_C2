/** Client bindings for explicitly selected Tide or local simulation mode. */
export type {
  ArchiveObject, GovernanceLink, PurgeManifest, PurgeRequest,
  GovernanceObservation, ApiError,
} from "../lib/vault/contract";
import type { PurgeRequest, GovernanceLink, GovernanceObservation } from "../lib/vault/contract";
import { isSimulation, simulationCall } from "../lib/simulation/client";
import type { SecureFetch } from "../lib/tide/governance-client";

export async function proposePurgeGrant(request: PurgeRequest, fetcher: SecureFetch): Promise<GovernanceLink[]> {
  if (await isSimulation()) return (await simulationCall({ action: "propose", requestId: request.requestId })).links;
  return (await import("../lib/tide/governance-client")).proposePurgeGrant(request, fetcher);
}
export async function readGovernance(links: GovernanceLink[], fetcher: SecureFetch): Promise<GovernanceObservation[]> {
  if (await isSimulation()) return Promise.all(links.map((link) => simulationCall({ action: "observe", changeRequestId: link.changeRequestId })));
  return (await import("../lib/tide/governance-client")).readGovernance(links, fetcher);
}
export async function approveGovernance(id: string, fetcher: SecureFetch): Promise<GovernanceObservation> {
  if (await isSimulation()) return simulationCall({ action: "approve", changeRequestId: id });
  return (await import("../lib/tide/governance-client")).approveGovernance(id, fetcher);
}

export const PUBLIC_ORIGIN = "http://localhost:3000";

/** Real mode uses the provider's SDK; only explicit simulation uses same-origin cookies. */
export async function secureFetch(url: string, init?: RequestInit): Promise<Response> {
  if (typeof window === "undefined") throw new Error("Authenticated requests require a browser session.");
  if (await isSimulation()) {
    const target = new URL(url, window.location.origin);
    if (target.origin !== window.location.origin) throw new Error("Simulation requests must remain same-origin.");
    return fetch(target.href, { ...init, credentials: "same-origin", cache: "no-store" });
  }
  const { IAMService } = await import("@tidecloak/js");
  if (!IAMService._tc?.authenticated) throw new Error("Sign in with a real Tide account before making protected requests.");
  return IAMService.secureFetch(url, init);
}
