import { withAuth } from "../../../../lib/auth/protect";
import { getVault, listObjects } from "../../../../lib/vault/core";
import { errorResponse, json } from "../../../../lib/vault/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withAuth(async () => {
  try {
    return json(200, { objects: listObjects(getVault()) });
  } catch (err) {
    return errorResponse(err);
  }
});
