import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
const require = createRequire(import.meta.url);
const directory = mkdtempSync(join(tmpdir(), "vault-simulation-test-"));
const base = "http://localhost:3000";
let child;
async function start(mode) {
  const env = { ...process.env, AUTH_MODE: mode, SIMULATION_DATA_DIR: directory };
  delete env.CLIENT_ADAPTER;
  child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "3000"], { env, stdio: ["ignore", "pipe", "pipe"] });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Test server readiness timeout")), 15000);
    child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Test server exited (${code}); stop any existing app on port 3000 before this test.`)); });
    child.stdout.on("data", (data) => { if (String(data).includes("Ready")) { clearTimeout(timer); resolve(); } });
  });
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  await new Promise((resolve) => { child.once("exit", resolve); child.kill("SIGTERM"); });
}
async function call(path, { body, cookie, origin = true } = {}) {
  const headers = {};
  if (body !== undefined) { headers["Content-Type"] = "application/json"; if (origin) headers.Origin = base; }
  if (cookie) headers.Cookie = cookie;
  return fetch(base + path, { method: body === undefined ? "GET" : "POST", headers,
    body: body === undefined ? undefined : JSON.stringify(body) });
}
async function actor(id) {
  const response = await call("/api/simulation", { body: { action: "select", actorId: id } });
  assert.equal(response.status, 200);
  return response.headers.get("set-cookie").split(";")[0];
}
async function simulation(cookie, body) {
  const response = await call("/api/simulation", { cookie, body });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  return result;
}
try {
  await start("simulation");
  assert.equal((await call("/api/vault/objects")).status, 401);
  assert.equal((await call("/api/simulation", { body: { action: "select", actorId: "operator" }, origin: false })).status, 403);
  const operator = await actor("operator");
  const a = await actor("trustee-a");
  const b = await actor("trustee-b");
  const objects = (await (await call("/api/vault/objects", { cookie: operator })).json()).objects;
  assert.equal(objects.length, 2);
  const first = objects[0], second = objects[1];
  const download = async (object) => call(`/api/vault/objects/${object.objectId}/versions/${object.version}`, { cookie: operator });
  const before = await download(first);
  assert.equal(createHash("sha256").update(Buffer.from(await before.arrayBuffer())).digest("hex"), first.sha256);
  const filing = await call("/api/vault/requests", { cookie: operator, body: { objectId: first.objectId, version: first.version, reason: "Simulation integration test" } });
  assert.equal(filing.status, 202);
  const request = (await filing.json()).request;
  const execute = (cookie) => call(`/api/vault/requests/${request.requestId}/execute`, { cookie, body: {} });
  assert.equal((await execute(operator)).status, 403);
  assert.equal((await call("/api/simulation", { cookie: operator, body: { action: "propose", requestId: request.requestId } })).status, 403);
  const { links } = await simulation(a, { action: "propose", requestId: request.requestId });
  const id = links[0].changeRequestId;
  let observation = await simulation(a, { action: "approve", changeRequestId: id });
  assert.equal(observation.authorizationCount, 1);
  observation = await simulation(a, { action: "approve", changeRequestId: id });
  assert.equal(observation.authorizationCount, 1);
  await simulation(operator, { action: "refresh" });
  assert.equal((await execute(operator)).status, 403);
  assert.equal((await download(first)).status, 200);
  observation = await simulation(b, { action: "approve", changeRequestId: id });
  assert.equal(observation.authorizationCount, 2);
  assert.equal(observation.status, "APPROVED");
  assert.equal((await execute(operator)).status, 403, "Old claims must not be silently upgraded");
  await simulation(operator, { action: "refresh" });
  assert.equal((await execute(a)).status, 403, "Trustee is not the execution recipient");
  assert.equal((await execute(operator)).status, 200);
  assert.equal((await execute(operator)).status, 409);
  assert.equal((await download(first)).status, 404);
  const survivor = await download(second);
  assert.equal(survivor.status, 200);
  assert.equal(createHash("sha256").update(Buffer.from(await survivor.arrayBuffer())).digest("hex"), second.sha256);
  await stop();
  await start("simulation");
  assert.equal((await execute(operator)).status, 409, "Consumption persists across restart");
  assert.equal((await download(first)).status, 404, "Seed must not resurrect purged data");
  await stop();
  await start("tide");
  assert.equal((await call("/api/simulation")).status, 404);
  assert.equal((await call("/api/vault/objects", { cookie: operator })).status, 401, "Real mode rejects simulation cookies");
  assert.equal((await execute(operator)).status, 401);
  console.log("PASS: live HTTP simulation workflow, distinct-actor quorum, repeated-vote refusal, stale-claim refusal, recipient checks, exact purge, surviving digest, restart persistence, CSRF origin refusal, and real-mode rejection.");
  console.log("Disposable test databases retained at:", directory);
} finally { await stop(); }
