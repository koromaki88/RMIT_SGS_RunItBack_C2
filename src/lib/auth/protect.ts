import { NextRequest } from "next/server";
import { verifyTideJWT, hasRole, extractToken } from "./tideJWT";
import { verifyDpop } from "./verifyDpop";
import type { JWTPayload } from "jose";

// Playbook: verify-jwt-server-side Step 5
type AuthHandler = (req: NextRequest, jwt: JWTPayload) => Promise<Response>;

export function withAuth(handler: AuthHandler) {
  return async (req: NextRequest) => {
    let jwt;
    try {
      const token = extractToken(req.headers.get("authorization"));
      jwt = await verifyTideJWT(token);
      // The signature alone is not enough. This realm issues sender-constrained tokens (cnf.jkt),
      // and without checking the DPoP proof a stolen token replays as a plain `Bearer` and passes
      // (AP-43). verifyDpop rejects an unbound token, a Bearer-scheme replay, a proof signed by a
      // different key, and a proof for another URL or method. It throws; the catch below answers 401.
      // APP_ORIGIN is trusted server configuration, not a caller-controlled forwarding header.
      const origin = new URL(process.env.APP_ORIGIN || "http://localhost:3000");
      if (origin.origin !== origin.href.replace(/\/$/, "")) throw new Error("Invalid configured application origin");
      const publicUrl = new URL(req.nextUrl.pathname, origin.origin).href;
      await verifyDpop(
        { url: publicUrl, method: req.method, headers: req.headers },
        token,
        jwt as { cnf?: { jkt?: string } },
        { trustForwardedHeaders: false, iatSkewSeconds: 60 },
      );
    } catch (err) {
      return Response.json(
        { error: { code: "UNAUTHORIZED", message: "A valid Tide access token and bound DPoP proof are required." } },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }
    // Handler/storage errors must not be misreported as authentication failures.
    return handler(req, jwt);
  };
}

export function withRole(role: string, handler: AuthHandler) {
  return withAuth(async (req, jwt) => {
    if (!hasRole(jwt, role)) {
      return Response.json({ error: { code: "FORBIDDEN", message: "Required realm permission is missing." } }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }
    return handler(req, jwt);
  });
}
