import { jwtVerify, createLocalJWKSet } from "jose";
import type { JWTPayload } from "jose";
import { loadTideConfig } from "./tidecloakConfig";

// Lazy initialization — do NOT load config at module level.
// Next.js 16 evaluates module-level code during `next build` for static
// page generation. If tidecloak.json doesn't exist yet (placeholder or
// pre-bootstrap), eager loading throws at build time.
let _jwks: ReturnType<typeof createLocalJWKSet> | null = null;
let _config: ReturnType<typeof loadTideConfig> | null = null;

function getConfig() {
  if (!_config) {
    _config = loadTideConfig();
    if (!_config.jwk) {
      throw new Error(
        "Adapter JSON missing jwk field. Re-export with IGA enabled."
      );
    }
    _jwks = createLocalJWKSet(_config.jwk);
  }
  return { config: _config, JWKS: _jwks! };
}

export async function verifyTideJWT(token: string): Promise<JWTPayload> {
  const { config, JWKS } = getConfig();
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `${config["auth-server-url"].replace(/\/+$/, "")}/realms/${config.realm}`,
    audience: config.resource,
    algorithms: ["EdDSA"],
    requiredClaims: ["iss", "sub", "aud", "azp", "iat", "exp"],
    clockTolerance: 30,
  });

  if (payload.azp !== config.resource) {
    throw new Error("Token azp does not match client");
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.sub !== "string" || !payload.sub.trim()) {
    throw new Error("Missing token subject");
  }
  if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp) || payload.exp < now - 30) {
    throw new Error("Token expired");
  }
  if (typeof payload.iat !== "number" || !Number.isFinite(payload.iat) || payload.iat > now + 30 || payload.exp <= payload.iat) {
    throw new Error("Token issued in future");
  }

  return payload;
}

export function hasRole(payload: JWTPayload, role: string): boolean {
  // App entitlements are realm roles only. Never search every client for a same-named role.
  const realmAccess = payload.realm_access as { roles?: unknown } | undefined;
  return Array.isArray(realmAccess?.roles) && realmAccess.roles.includes(role);
}

export function hasClientRole(payload: JWTPayload, client: string, role: string): boolean {
  const clients = payload.resource_access as Record<string, { roles?: unknown }> | undefined;
  const roles = clients?.[client]?.roles;
  return Array.isArray(roles) && roles.includes(role);
}

export function isTrustee(payload: JWTPayload): boolean {
  return hasClientRole(payload, "realm-management", "tide-realm-admin");
}

export function extractToken(authHeader: string | null): string {
  if (!authHeader) throw new Error("Missing Authorization header");
  if (authHeader.startsWith("Bearer ")) return authHeader.substring(7);
  if (authHeader.startsWith("DPoP ")) return authHeader.substring(5);
  throw new Error("Invalid Authorization header format");
}
