import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
if (process.argv.includes("--build")) {
  const build = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "build", "--webpack"], { stdio: "inherit" });
  process.exitCode = await new Promise((resolve) => build.on("exit", (code) => resolve(code ?? 1)));
} else {
  const env = { ...process.env, AUTH_MODE: "simulation" };
  // Simulation has no need for real tokens, adapters, licence config or master credentials.
  for (const key of Object.keys(env)) if (/^(KC_|TIDE_|CLIENT_ADAPTER$)/.test(key)) delete env[key];
  console.log("LOCAL SIMULATION ONLY — sign-in, roles and quorum are not Tide-enforced.");
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "3000"], { stdio: "inherit", env });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("exit", (code) => { process.exitCode = code ?? 1; });
}
