import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { openVault, listObjects, readVersion, sha256Hex, fileRequest, executePurge, getRequest } from "../../src/lib/vault/core.ts";

test("simulation restock adds fresh bytes without restoring purged versions or consuming history", () => {
  const directory = mkdtempSync(join(tmpdir(), "vault-restock-"));
  function restock(mode = "simulation") {
    return spawnSync(process.execPath, ["scripts/add-samples.mjs"], {
      encoding: "utf8", env: { ...process.env, AUTH_MODE: mode, SIMULATION_DATA_DIR: directory },
    });
  }
  assert.equal(restock().status, 0);
  const db = openVault(join(directory, "vault.sqlite"));
  try {
    const objects = listObjects(db);
    assert.equal(objects.length, 8);
    for (const object of objects) {
      const { bytes } = readVersion(db, object.objectId, object.version);
      assert.equal(sha256Hex(bytes), object.sha256);
      assert.equal(bytes.byteLength, object.size);
    }
    const target = objects.find((object) => object.objectId.startsWith("sample_"));
    const request = fileRequest(db, { objectId: target.objectId, version: target.version, reason: "Restock regression" }, { issuer: "urn:test", subject: "operator", audience: "test-client" });
    executePurge(db, request.requestId, { iss: "urn:test", sub: "operator", azp: "test-client", realm_access: { roles: [request.entitlement] } });
    assert.equal(restock().status, 0);
    assert.equal(listObjects(db).length, 14);
    assert.equal(listObjects(db).find((object) => object.objectId === target.objectId && object.version === target.version).state, "PURGED");
    assert.equal(getRequest(db, request.requestId).state, "EXECUTED");
    assert.notEqual(restock("tide").status, 0);
    assert.equal(listObjects(db).length, 14);
  } finally {
    db.close();
  }
});
