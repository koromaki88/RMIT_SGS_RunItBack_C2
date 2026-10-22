import { withAuth } from "../../../../lib/auth/protect";
import { fileRequest, getVault, listRequests } from "../../../../lib/vault/core";
import { errorResponse, identityFrom, json, readJsonBody } from "../../../../lib/vault/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  try {
    return json(200, { requests: listRequests(getVault()) });
  } catch (err) {
    return errorResponse(err);
  }
});

// Files a purge request for one version. Deletes nothing; returns the frozen manifest + hash.
export const POST = withAuth(async (req, jwt) => {
  try {
    const who = identityFrom(jwt as Record<string, unknown>);
    const body = await readJsonBody(req);
    return json(202, { request: fileRequest(getVault(), body, who) });
  } catch (err) {
    return errorResponse(err);
  }
});
