import { withAuth } from "../../../../../lib/auth/protect";
import { getRequest, getVault, parseRequestId } from "../../../../../lib/vault/core";
import { errorResponse, json, pathMatch } from "../../../../../lib/vault/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async (req) => {
  try {
    const [rawId] = pathMatch(req, /^\/api\/vault\/requests\/([^/]+)\/?$/);
    return json(200, { request: getRequest(getVault(), parseRequestId(rawId)) });
  } catch (err) {
    return errorResponse(err);
  }
});
