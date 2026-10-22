// Agent 2: shared HTTP helpers for /api/vault routes. Authentication itself is Agent 1's
// withAuth (JWT + DPoP); these helpers only shape responses, bound input and derive
// server-side identity values. Relative imports avoid depending on a tsconfig path alias.
import type { NextRequest } from "next/server";
import { loadTideConfig } from "../auth/tidecloakConfig";
import { MAX_BODY_BYTES, VaultError, toVaultError, type Identity } from "./core";
import type { ApiError } from "./contract";

const NO_STORE = { "Cache-Control": "no-store" };

export function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

export function errorResponse(err: unknown): Response {
  const e = err instanceof VaultError ? err : toVaultError(err);
  const body: ApiError = { error: { code: e.code, message: e.message } };
  return json(e.status, body);
}

/** Issuer and audience come from the server's adapter config, never from the client. */
export function serverAuthority(): { issuer: string; audience: string } {
  try {
    const cfg = loadTideConfig();
    const issuer = `${cfg["auth-server-url"].replace(/\/+$/, "")}/realms/${cfg.realm}`;
    if (!cfg.realm || !cfg.resource) throw new Error("incomplete adapter");
    return { issuer, audience: cfg.resource };
  } catch {
    throw new VaultError(503, "CONFIG_UNAVAILABLE", "Identity configuration unavailable");
  }
}

/** Requester identity for filing: verified token subject + server-pinned issuer/audience. */
export function identityFrom(jwt: Record<string, unknown>): Identity {
  const { issuer, audience } = serverAuthority();
  if (jwt.iss !== issuer || jwt.azp !== audience || typeof jwt.sub !== "string" || jwt.sub.length === 0) {
    throw new VaultError(401, "UNAUTHENTICATED", "Token does not match the configured client");
  }
  return { issuer, subject: jwt.sub, audience };
}

export async function readJsonBody(req: NextRequest): Promise<unknown> {
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new VaultError(400, "INVALID_JSON", "Content-Type must be application/json");
  }
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) throw new VaultError(413, "TOO_LARGE", "Request body too large");
  const reader = req.body?.getReader();
  if (!reader) throw new VaultError(400, "INVALID_JSON", "Body must be JSON");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new VaultError(413, "TOO_LARGE", "Request body too large");
    }
    chunks.push(value);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    throw new VaultError(400, "INVALID_JSON", "Body must be JSON");
  }
}

/** Path params are read from the URL so the routes work with withAuth's (req) signature. */
export function pathMatch(req: NextRequest, pattern: RegExp): string[] {
  const m = pattern.exec(req.nextUrl.pathname);
  if (!m) throw new VaultError(404, "NOT_FOUND", "Unknown path");
  return m.slice(1).map((s) => decodeURIComponent(s));
}

/** Trustee-only linking: exact realm-management client role named by server config. */
export function requireTrustee(jwt: Record<string, unknown>): void {
  const role = "tide-realm-admin";
  const access = jwt.resource_access as Record<string, { roles?: unknown }> | undefined;
  const roles = access?.["realm-management"]?.roles;
  if (!Array.isArray(roles) || !roles.includes(role)) {
    throw new VaultError(403, "NOT_TRUSTEE", "Only trustees may attach governance links");
  }
}

export function safeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 120) || "download.bin";
}
