import { withAuth } from "../../../../../../lib/auth/protect";
import { getVault, parseRequestId, setGovernanceLinks } from "../../../../../../lib/vault/core";
import { errorResponse, json, pathMatch, readJsonBody, requireTrustee } from "../../../../../../lib/vault/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Trustee-only observation metadata. Links never authorise execution, even if forged.
export const PUT = withAuth(async (req, jwt) => {
  try {
    requireTrustee(jwt as Record<string, unknown>);
    const [rawId] = pathMatch(req, /^\/api\/vault\/requests\/([^/]+)\/governance\/?$/);
    const body = await readJsonBody(req);
    return json(200, { request: setGovernanceLinks(getVault(), parseRequestId(rawId), body) });
  } catch (err) {
    return errorResponse(err);
  }
});
