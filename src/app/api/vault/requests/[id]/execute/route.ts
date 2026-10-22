import { withAuth } from "../../../../../../lib/auth/protect";
import { executePurge, getVault, parseRequestId, VaultError } from "../../../../../../lib/vault/core";
import { errorResponse, json, pathMatch, readJsonBody } from "../../../../../../lib/vault/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The only destructive route. Authority = verified token whose realm_access.roles contains the
// exact vault-purge:<manifestHash> granted through Tide governance. Fails closed otherwise.
export const POST = withAuth(async (req, jwt) => {
  try {
    const [rawId] = pathMatch(req, /^\/api\/vault\/requests\/([^/]+)\/execute\/?$/);
    const body = await readJsonBody(req);
    if (body === null || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 0) {
      throw new VaultError(400, "INVALID_SCHEMA", "Execute body must be {}");
    }
    return json(200, executePurge(getVault(), parseRequestId(rawId), jwt as Record<string, unknown>));
  } catch (err) {
    return errorResponse(err);
  }
});
