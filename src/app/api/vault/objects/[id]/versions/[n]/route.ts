import { withAuth } from "../../../../../../../lib/auth/protect";
import { getVault, parseObjectId, parseVersion, readVersion } from "../../../../../../../lib/vault/core";
import { errorResponse, pathMatch, safeFilename } from "../../../../../../../lib/vault/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Exact byte download of an available version; 404 when absent or purged.
export const GET = withAuth(async (req) => {
  try {
    const [rawId, rawVersion] = pathMatch(req, /^\/api\/vault\/objects\/([^/]+)\/versions\/([^/]+)\/?$/);
    const { name, bytes, sha256 } = readVersion(getVault(), parseObjectId(rawId), parseVersion(rawVersion));
    return new Response(bytes, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/octet-stream",
        "Content-Length": String(bytes.byteLength),
        "Content-Disposition": `attachment; filename="${safeFilename(name)}"`,
        "X-Content-Type-Options": "nosniff",
        "X-Content-SHA256": sha256,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
});
