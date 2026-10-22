"use client";

import type { GovernanceLink, GovernanceObservation, PurgeRequest } from "../vault/contract";

export type SecureFetch = (url: string, init?: RequestInit) => Promise<Response>;
type Json = Record<string, unknown>;
type ChangeRequest = Json & {
  id: string;
  actionType?: string;
  entityId?: string;
  status?: string;
  rows?: unknown;
  authorizationCount?: number;
  threshold?: number;
};
type Role = { id: string; name: string; clientRole?: boolean };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function configuration() {
  if (typeof window === "undefined") throw new Error("Governance approval is a browser-only operation.");
  const { IAMService } = await import("@tidecloak/js");
  const config = IAMService.getConfig() as Record<string, unknown> | undefined;
  if (!config?.realm || !config["auth-server-url"] || !config.resource) {
    throw new Error("A real authenticated Tide configuration is not available yet.");
  }
  const base = `${String(config["auth-server-url"]).replace(/\/+$/, "")}/admin/realms/${encodeURIComponent(String(config.realm))}`;
  return { base, config, IAMService };
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function checked(response: Response, operation: string): Promise<unknown> {
  const data = await readJson(response);
  if (!response.ok) {
    // Do not echo request models, tokens, or arbitrary upstream HTML into the UI.
    throw new Error(`${operation} failed (HTTP ${response.status}). Check your admin role, session and pending governance dependencies.`);
  }
  return data;
}

function normalizeRequests(data: unknown): ChangeRequest[] {
  const values = Array.isArray(data) ? data : data && typeof data === "object" ? Object.values(data) : [];
  return values.filter((value): value is ChangeRequest => !!value && typeof value === "object" && typeof (value as Json).id === "string");
}

async function pending(base: string, fetcher: SecureFetch) {
  return normalizeRequests(await checked(await fetcher(`${base}/iga/change-requests?status=PENDING`, { cache: "no-store" }), "Reading pending changes"));
}

function observation(cr: ChangeRequest): GovernanceObservation {
  const status = ["PENDING", "APPROVED", "DENIED", "CANCELLED"].includes(cr.status || "")
    ? cr.status as GovernanceObservation["status"] : "UNKNOWN";
  return {
    changeRequestId: cr.id,
    status,
    authorizationCount: typeof cr.authorizationCount === "number" ? cr.authorizationCount : null,
    threshold: typeof cr.threshold === "number" ? cr.threshold : null,
  };
}

function link(cr: ChangeRequest): GovernanceLink {
  if (typeof cr.actionType !== "string") throw new Error("Tide returned a change without an action type; refusing to guess.");
  return { changeRequestId: cr.id, actionType: cr.actionType };
}

async function findRole(base: string, name: string, fetcher: SecureFetch): Promise<Role | null> {
  const response = await fetcher(`${base}/roles/${encodeURIComponent(name)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  const value = await checked(response, "Reading request-specific role") as Role | null;
  if (!value || typeof value.id !== "string" || value.name !== name || value.clientRole) {
    throw new Error("The proposed permission is not the exact expected realm role.");
  }
  return value;
}

function oneMatching(changes: ChangeRequest[], action: string, role: string, recipient?: string): ChangeRequest | null {
  const matches = changes.filter((cr) => cr.actionType === action
    && (!recipient || cr.entityId === recipient)
    && JSON.stringify(cr.rows ?? {}).includes(role));
  if (matches.length > 1) throw new Error("Multiple matching governance changes exist; inspect them rather than choosing one automatically.");
  return matches[0] || null;
}

async function locateMutation(response: Response, base: string, fetcher: SecureFetch,
  action: string, roleName: string, recipient?: string): Promise<GovernanceLink[]> {
  const location = response.headers.get("Location");
  const body = await checked(response, `Proposing ${action}`) as Json | null;
  if (response.status !== 202) return [];
  const candidate = body?.changeRequestId ?? body?.id ?? location?.split("/").pop();
  if (typeof candidate === "string" && uuid.test(candidate)) {
    const cr = await checked(await fetcher(`${base}/iga/change-requests/${candidate}`, { cache: "no-store" }), "Reading proposed change") as ChangeRequest;
    if (cr.actionType !== action || (recipient && cr.entityId !== recipient)
      || !JSON.stringify(cr.rows ?? {}).includes(roleName)) {
      throw new Error("The returned change does not match the proposed operation-specific permission; inspect it before approval.");
    }
    return [link(cr)];
  }
  // Some browser responses do not expose Location. Correlate the actual replay rows,
  // action and recipient; never choose a list index or an arbitrary newest request.
  const cr = oneMatching(await pending(base, fetcher), action, roleName, recipient);
  if (!cr) throw new Error("Tide accepted the proposal but its exact change request could not be correlated safely.");
  return [link(cr)];
}

export async function proposePurgeGrant(request: PurgeRequest, secureFetch: SecureFetch): Promise<GovernanceLink[]> {
  if (!uuid.test(request.requestId)) throw new Error("Invalid application request ID.");
  const { base, config } = await configuration();
  // Independently read the backend's frozen manifest rather than trusting editable UI input.
  const data = await checked(await secureFetch(new URL(`/api/vault/requests/${request.requestId}`, window.location.origin).href,
    { cache: "no-store" }), "Reading frozen purge manifest") as { request?: PurgeRequest } | null;
  const frozen = data?.request;
  if (!frozen || !/^[a-f0-9]{64}$/.test(frozen.manifestHash)
    || frozen.manifestHash !== request.manifestHash
    || frozen.entitlement !== `vault-purge:${frozen.manifestHash}`
    || frozen.state !== "FILED" || Date.parse(frozen.manifest.expiresAt) <= Date.now()
    || frozen.manifest.executorAudience !== config.resource
    || frozen.manifest.executorSubject !== frozen.manifest.requester.subject
    || !uuid.test(frozen.manifest.executorSubject)) {
    throw new Error("The frozen operation is expired, changed, or bound to a different recipient/client.");
  }
  const name = frozen.entitlement;
  const recipient = frozen.manifest.executorSubject;
  let role = await findRole(base, name, secureFetch);
  if (!role) {
    const existing = oneMatching(await pending(base, secureFetch), "CREATE_ROLE", name);
    if (existing) return [link(existing)];
    const target = frozen.manifest.objects[0];
    const description = `Purge ${target.objectId} v${target.version}; request ${frozen.requestId}; recipient ${recipient}; expires ${frozen.manifest.expiresAt}. Review frozen manifest before approval.`;
    const response = await secureFetch(`${base}/roles`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, composite: false, clientRole: false }),
    });
    if (response.status === 409) {
      role = await findRole(base, name, secureFetch);
      if (!role) throw new Error("Role creation conflicts with a pending change; refresh and inspect dependencies.");
    } else {
      const links = await locateMutation(response, base, secureFetch, "CREATE_ROLE", name);
      if (links.length) return links; // Commit this dependency, then invoke propose again.
      role = await findRole(base, name, secureFetch);
    }
  }
  if (!role) throw new Error("Role creation is not yet applied; approve its dependency before proposing the grant.");
  const existingGrant = oneMatching(await pending(base, secureFetch), "GRANT_ROLES", name, recipient)
    || oneMatching(await pending(base, secureFetch), "GRANT_ROLES", role.id, recipient);
  if (existingGrant) return [link(existingGrant)];
  const assigned = await checked(await secureFetch(`${base}/users/${recipient}/role-mappings/realm`, { cache: "no-store" }), "Reading current role mappings");
  if (Array.isArray(assigned) && assigned.some((item) => item?.id === role.id && item?.name === name)) {
    return []; // Real grant is already applied; recipient must refresh their real token.
  }
  return locateMutation(await secureFetch(`${base}/users/${recipient}/role-mappings/realm`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ id: role.id, name: role.name, clientRole: false }]),
  }), base, secureFetch, "GRANT_ROLES", name, recipient);
}

export async function readGovernance(links: GovernanceLink[], secureFetch: SecureFetch): Promise<GovernanceObservation[]> {
  const { base } = await configuration();
  if (links.length > 10) throw new Error("Too many linked governance dependencies.");
  return Promise.all(links.map(async ({ changeRequestId }) => {
    if (!uuid.test(changeRequestId)) throw new Error("Invalid governance request ID.");
    const response = await secureFetch(`${base}/iga/change-requests/${changeRequestId}`, { cache: "no-store" });
    if (response.status === 404) return { changeRequestId, status: "UNKNOWN", authorizationCount: null, threshold: null } as GovernanceObservation;
    const cr = await checked(response, "Reading governance state") as ChangeRequest;
    if (cr.id !== changeRequestId) throw new Error("Tide returned a different change request.");
    return observation(cr);
  }));
}

export async function approveGovernance(changeRequestId: string, secureFetch: SecureFetch): Promise<GovernanceObservation> {
  if (!uuid.test(changeRequestId)) throw new Error("Invalid governance request ID.");
  const { base, IAMService } = await configuration();
  const current = await checked(await secureFetch(`${base}/iga/change-requests/${changeRequestId}`, { cache: "no-store" }), "Reading approval target") as ChangeRequest;
  if (current.status !== "PENDING") return observation(current);
  const endpoint = `${base}/iga/change-requests/${changeRequestId}/approve`;
  const initial = await checked(await secureFetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
  }), "Preparing approval") as Json | null;
  if (initial?.mode === "needs-approval") {
    if (typeof initial.requestModel !== "string" || initial.requestModel.length > 2_000_000) throw new Error("Invalid Tide approval model.");
    const tc = IAMService._tc;
    if (!tc?.requestTideOperatorApproval) throw new Error("The authenticated Tide approval enclave is unavailable.");
    const bytes = Uint8Array.from(atob(initial.requestModel), (char) => char.charCodeAt(0));
    // This is the exact model returned by Tide for this CR, not an invented app payload.
    const results = await tc.requestTideOperatorApproval([{ id: changeRequestId, request: bytes }]);
    const result = results.find((entry) => entry.id === changeRequestId);
    if (!result || result.status !== "approved") throw new Error("Approval was denied or remains pending; no approval is claimed.");
    let binary = "";
    for (const byte of result.request) binary += String.fromCharCode(byte);
    const recorded = await checked(await secureFetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestModel: btoa(binary) }),
    }), "Recording signed approval") as Json | null;
    if (recorded?.mode !== "recorded") throw new Error("Tide did not confirm the signed approval was recorded.");
  } else if (initial?.mode !== "recorded") {
    throw new Error("Unsupported Tide approval response; refusing to infer success.");
  }
  const [latest] = await readGovernance([{ changeRequestId, actionType: current.actionType || "UNKNOWN" }], secureFetch);
  return latest;
}
