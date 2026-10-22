import { NextRequest } from "next/server";
import { actors, approve, observe, propose, refreshSession, selectActor, sessionResponse, signOut, simulatedClaims, simulationRequestAllowed, simulationEnabled } from "../../../lib/simulation/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store", "X-Vault-Simulation": "true" };
function unavailable(req: NextRequest) {
  if (!simulationEnabled()) return Response.json({ error: { code: "NOT_FOUND", message: "Not found" } }, { status: 404 });
  if (!simulationRequestAllowed(req)) return Response.json({ error: { code: "SIMULATION_ORIGIN", message: "Local simulation origin required." } }, { status: 403, headers });
}
export async function GET(req: NextRequest) {
  const denied = unavailable(req); if (denied) return denied;
  return Response.json(sessionResponse(req), { headers });
}
export async function POST(req: NextRequest) {
  const denied = unavailable(req); if (denied) return denied;
  try {
    const reader = req.body?.getReader();
    if (!reader) throw new Error("JSON body required");
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) {
        await reader.cancel();
        return Response.json({ error: { code: "TOO_LARGE", message: "Request too large" } }, { status: 413, headers });
      }
      chunks.push(value);
    }
    const text = Buffer.concat(chunks).toString("utf8");
    const body = JSON.parse(text);
    if (body.action === "select") {
      if (!actors.some((a) => a.id === body.actorId) || Object.keys(body).some((k) => !["action", "actorId"].includes(k))) throw new Error("Invalid actor selection.");
      return Response.json({ simulation: true }, { headers: { ...headers, "Set-Cookie": selectActor(body.actorId) } });
    }
    if (!simulatedClaims(req)) return Response.json({ error: { code: "UNAUTHORIZED", message: "Select a demo account." } }, { status: 401, headers });
    if (body.action === "logout") return Response.json({ simulation: true }, { headers: { ...headers, "Set-Cookie": signOut(req) } });
    if (body.action === "refresh") { refreshSession(req); return Response.json(sessionResponse(req), { headers }); }
    if (body.action === "propose" && typeof body.requestId === "string") {
      const change = propose(req, body.requestId);
      return Response.json({ links: [{ changeRequestId: change.id, actionType: "SIMULATED_GRANT_ROLES" }] }, { headers });
    }
    if (body.action === "observe" && typeof body.changeRequestId === "string") return Response.json(observe(body.changeRequestId), { headers });
    if (body.action === "approve" && typeof body.changeRequestId === "string") return Response.json(approve(req, body.changeRequestId), { headers });
    throw new Error("Unsupported simulation action.");
  } catch (reason) {
    return Response.json({ error: { code: "SIMULATION_REFUSED", message: reason instanceof Error ? reason.message : "Simulation request refused" } }, { status: 403, headers });
  }
}
