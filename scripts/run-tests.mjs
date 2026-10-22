import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function discover(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    return entry.isDirectory() ? discover(path) : /\.test\.(ts|tsx|mjs)$/.test(entry.name) ? [path] : [];
  });
}
const files = [...discover("src/lib/auth"), ...discover("tests")];
if (!files.length) { console.error("No tests have been added yet."); process.exit(1); }
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...files], { stdio: "inherit" });
process.exit(result.status ?? 1);
