export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json({ mode: process.env.AUTH_MODE === "simulation" ? "simulation" : "tide" }, { headers: { "Cache-Control": "no-store" } });
}
