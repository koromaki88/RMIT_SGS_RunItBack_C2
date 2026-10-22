// Explicit local simulation restock. Never restores old objects or clears consumption.
import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { openVault, sha256Hex } from "../src/lib/vault/core.ts";

if (process.env.AUTH_MODE && process.env.AUTH_MODE !== "simulation") {
  throw new Error("Sample restocking is for simulation only. Unset AUTH_MODE or select simulation.");
}

const directory = process.env.SIMULATION_DATA_DIR || join(process.cwd(), "data", "simulation");
const path = join(directory, "vault.sqlite");
const db = openVault(path);
const batch = randomUUID();
const samples = [
  {
    name: "harbourline-warehouse-inventory.csv",
    versions: [
      "sku,warehouse,quantity\nDEMO-BOX-01,Melbourne,120\nDEMO-PAL-02,Sydney,45\n",
      "sku,warehouse,quantity\nDEMO-BOX-01,Melbourne,118\nDEMO-PAL-02,Sydney,50\n",
    ],
  },
  {
    name: "harbourline-dispatch-manifest.csv",
    versions: [
      "dispatch_id,route,status\nDEMO-D01,Melbourne-Sydney,PLANNED\nDEMO-D02,Sydney-Brisbane,BOOKED\n",
      "dispatch_id,route,status\nDEMO-D01,Melbourne-Sydney,DISPATCHED\nDEMO-D02,Sydney-Brisbane,BOOKED\n",
    ],
  },
  {
    name: "harbourline-recovery-runbook.txt",
    versions: [
      "Recovery rehearsal v1\n1. Verify recovery export digests.\n2. Review the incident scope.\n3. Rehearse recovery in an isolated environment.\n",
      "Recovery rehearsal v2\n1. Verify recovery export digests.\n2. Review the incident scope.\n3. Rehearse recovery in an isolated environment.\n4. Record the rehearsal outcome.\n",
    ],
  },
];

try {
  db.exec("BEGIN IMMEDIATE");
  const insert = db.prepare("INSERT INTO objects (object_id, version, name, size, sha256, state, content) VALUES (?, ?, ?, ?, ?, 'AVAILABLE', ?)");
  for (const sample of samples) {
    const id = `sample_${randomUUID()}`;
    for (const [index, text] of sample.versions.entries()) {
      const bytes = new TextEncoder().encode(`# SYNTHETIC DEMO DATA — batch ${batch}\n${text}`);
      insert.run(id, index + 1, sample.name, bytes.byteLength, sha256Hex(bytes), bytes);
    }
  }
  db.exec("COMMIT");
  console.log(`Added 6 sample versions (3 files × 2 versions) to ${path}`);
  console.log(`Batch: ${batch}`);
  console.log("Existing archive versions, purge requests and approval history were preserved. Refresh archive in the browser.");
} catch (error) {
  try { db.exec("ROLLBACK"); } catch { /* transaction may already be closed */ }
  throw error;
} finally {
  db.close();
}
