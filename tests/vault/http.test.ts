import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { readJsonBody, requireTrustee } from "../../src/lib/vault/http";

test("JSON input rejects oversized undeclared bodies and accepts valid bounded data", async () => {
  const request = (body: string) => new NextRequest("http://localhost:3000/api/vault/requests", {
    method: "POST", headers: { "Content-Type": "application/json" }, body,
  });
  assert.deepEqual(await readJsonBody(request('{"reason":"test"}')), { reason: "test" });
  await assert.rejects(readJsonBody(request("x".repeat(5000))), (error: unknown) => (error as { status: number }).status === 413);
  await assert.rejects(readJsonBody(request("not-json")), (error: unknown) => (error as { status: number }).status === 400);
});

test("trustee check accepts only exact realm-management client authority", () => {
  assert.doesNotThrow(() => requireTrustee({ resource_access: { "realm-management": { roles: ["tide-realm-admin"] } } }));
  for (const value of [{}, { realm_access: { roles: ["tide-realm-admin"] } },
    { resource_access: { other: { roles: ["tide-realm-admin"] } } }]) {
    assert.throws(() => requireTrustee(value), (error: unknown) => (error as { status: number }).status === 403);
  }
});
