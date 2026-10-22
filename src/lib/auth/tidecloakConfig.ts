import { readFileSync } from "fs";
import { join } from "path";
import type { JWK } from "jose";

// Playbook: protect-api-nextjs Step 1
export interface TidecloakConfig {
  realm: string;
  "auth-server-url": string;
  "ssl-required": string;
  resource: string;
  "public-client": boolean;
  "confidential-port": number;
  jwk: { keys: JWK[] }; // Tide extension: embedded JWKS
  vendorId?: string;
  homeOrkUrl?: string;
}

export function loadTideConfig(): TidecloakConfig {
  const configPath = join(process.cwd(), "data", "tidecloak.json");
  const config = JSON.parse(process.env.CLIENT_ADAPTER || readFileSync(configPath, "utf-8"));

  if (!config.realm || !config.resource || !config["auth-server-url"] || !Array.isArray(config.jwk?.keys) || !config.jwk.keys.length) {
    throw new Error(
      "Adapter JSON missing required identity configuration or jwk field. " +
        "Export via Tide endpoint (providerId=keycloak-oidc-keycloak-json). " +
        "Successful vendor licensing/key setup is required; do not fabricate the adapter."
    );
  }

  return config;
}
