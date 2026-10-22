// Idempotent seed of the two synthetic recovery-export versions.
// Run: node scripts/seed-vault.mjs   (DB: $VAULT_DB_PATH or ./data/vault.sqlite, git-ignored)
// Safe to rerun: the seed marker prevents re-creating a purged version. No HTTP reset route exists.
import { join } from "node:path";
import { openVault, listObjects } from "../src/lib/vault/core.ts";

const path = process.env.VAULT_DB_PATH || join(process.cwd(), "data", "vault.sqlite");
const db = openVault(path);
console.log(`vault: ${path}`);
for (const o of listObjects(db)) console.log(`  ${o.objectId} v${o.version} ${o.state} ${o.size}B sha256=${o.sha256}`);
db.close();
