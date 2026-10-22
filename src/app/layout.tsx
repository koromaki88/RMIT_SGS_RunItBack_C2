import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthRibbon } from "@/components/auth-ribbon";

/**
 * Agent 3 owns this file. Agent 1 owns `src/app/providers.tsx`.
 *
 * MERGE-SWAP (Agent 1 integration): wrap the app shell in Agent 1's provider so
 * auth state and DPoP-bound secureFetch become live, e.g.
 *
 *   import Providers from "./providers";
 *   <Providers>{/* ribbon + children *\/}</Providers>
 *
 * Pre-merge the header honestly reports "Sign-in pending setup" — nothing is
 * fabricated (AGENTS.md defaults; 03-agent-ui-submission.md).
 */
export const metadata: Metadata = {
  title: "Dual-Control Recovery Vault",
  description:
    "Delegated archive maintenance without unilateral destructive authority — hackathon prototype.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* TODO(MERGE-AG1): <Providers> wrapper goes here. */}
        <AuthRibbon />
        <main className="page">{children}</main>
        <footer className="footer">
          <p>Synthetic demo data — no real records, credentials, or emails.</p>
        </footer>
        {/* TODO(MERGE-AG1): </Providers> goes here. */}
      </body>
    </html>
  );
}
