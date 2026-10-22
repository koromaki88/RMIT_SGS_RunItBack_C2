import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { generateKeyPair, exportJWK, calculateJwkThumbprint, SignJWT } from "jose";
import { NextRequest } from "next/server";
import { withAuth } from "./protect";
import { MemoryJtiStore, verifyDpop } from "./verifyDpop";

// Synthetic test-only keys, issuer, and identity. These never reach the live realm.
const issuer = "https://auth.example.test/realms/test";
const url = "http://localhost:3000/api/me";
let signing: Awaited<ReturnType<typeof generateKeyPair>>;
let binding: Awaited<ReturnType<typeof generateKeyPair>>;
let jwk: Awaited<ReturnType<typeof exportJWK>>;
let thumb: string;

before(async () => {
  signing = await generateKeyPair("EdDSA");
  binding = await generateKeyPair("ES256");
  jwk = await exportJWK(binding.publicKey);
  thumb = await calculateJwkThumbprint(jwk);
  process.env.CLIENT_ADAPTER = JSON.stringify({
    realm: "test", "auth-server-url": "https://auth.example.test", resource: "test-client",
    jwk: { keys: [{ ...await exportJWK(signing.publicKey), kid: "test-signing-key", alg: "EdDSA" }] },
  });
});

async function access(overrides: Record<string, unknown> = {}, key?: CryptoKey) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ iss: issuer, sub: "test-user", azp: "test-client", aud: "test-client", exp: now + 300, iat: now, cnf: { jkt: thumb }, ...overrides })
    .setProtectedHeader({ alg: "EdDSA", kid: "test-signing-key" }).sign(key ?? signing.privateKey);
}
async function proof(token: string, overrides: Record<string, unknown> = {}, pair = binding) {
  return new SignJWT({
    htm: "GET", htu: url, iat: Math.floor(Date.now() / 1000), jti: randomUUID(),
    ath: createHash("sha256").update(token).digest("base64url"), ...overrides,
  }).setProtectedHeader({ alg: "ES256", typ: "dpop+jwt", jwk: await exportJWK(pair.publicKey) }).sign(pair.privateKey);
}
const protectedHandler = withAuth(async (_request, jwt) => Response.json({ subject: jwt.sub }));
function request(token?: string, signedProof?: string, scheme = "DPoP") {
  return new NextRequest(url, { headers: {
    ...(token ? { authorization: `${scheme} ${token}` } : {}),
    ...(signedProof ? { dpop: signedProof } : {}),
  } });
}

test("valid signed token and bound proof reach the protected handler", async () => {
  const token = await access();
  const response = await protectedHandler(request(token, await proof(token)));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { subject: "test-user" });
});
test("missing authentication is rejected", async () => {
  assert.equal((await protectedHandler(request())).status, 401);
});
test("wrong issuer, client, or expired tokens are rejected", async () => {
  for (const change of [{ iss: "https://wrong.example.test" }, { azp: "other-client" }, { aud: "other-audience" }, { exp: 1 }, { sub: "" }, { iat: undefined }, { exp: undefined }, { aud: undefined }]) {
    const token = await access(change);
    assert.equal((await protectedHandler(request(token, await proof(token)))).status, 401);
  }
});
test("untrusted token signature is rejected", async () => {
  const stranger = await generateKeyPair("EdDSA");
  const token = await access({}, stranger.privateKey);
  assert.equal((await protectedHandler(request(token, await proof(token)))).status, 401);
});
test("Bearer scheme, absent proof, and unbound tokens are rejected", async () => {
  const token = await access();
  assert.equal((await protectedHandler(request(token, await proof(token), "Bearer"))).status, 401);
  assert.equal((await protectedHandler(request(token))).status, 401);
  const unbound = await access({ cnf: {} });
  assert.equal((await protectedHandler(request(unbound, await proof(unbound)))).status, 401);
});
test("proofs for a different URL, method, token hash, or old timestamp are rejected", async () => {
  const token = await access();
  for (const change of [{ htu: "http://localhost:3000/api/other" }, { htm: "PUT" }, { ath: "wrong" }, { iat: 1 }]) {
    assert.equal((await protectedHandler(request(token, await proof(token, change)))).status, 401);
  }
});
test("proof signed by another binding key is rejected", async () => {
  const token = await access();
  const other = await generateKeyPair("ES256");
  assert.equal((await protectedHandler(request(token, await proof(token, {}, other)))).status, 401);
});
test("reusing the same DPoP proof is rejected", async () => {
  const token = await access();
  const signedProof = await proof(token);
  assert.equal((await protectedHandler(request(token, signedProof))).status, 200);
  assert.equal((await protectedHandler(request(token, signedProof))).status, 401);
});

test("future-skewed proof stays replay-blocked for its entire acceptance window", async () => {
  const token = await access();
  const start = Math.floor(Date.now() / 1000) * 1000;
  const signedProof = await proof(token, { iat: start / 1000 + 59 });
  const req = request(token, signedProof);
  const store = new MemoryJtiStore();
  const originalNow = Date.now;
  try {
    Date.now = () => start;
    await verifyDpop(req, token, { cnf: { jkt: thumb } }, { jtiStore: store, iatSkewSeconds: 60 });
    // The proof remains within skew, but the old receipt-time cache entry has expired.
    Date.now = () => start + 61_000;
    await assert.rejects(
      verifyDpop(req, token, { cnf: { jkt: thumb } }, { jtiStore: store, iatSkewSeconds: 60 }),
      /already used/,
    );
  } finally {
    Date.now = originalNow;
  }
});
