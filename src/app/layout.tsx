import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthRibbon } from "@/components/auth-ribbon";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Dual-Control Recovery Vault",
  description:
    "Delegated archive maintenance without unilateral destructive authority — hackathon prototype.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
        <AuthRibbon />
        <main className="page">{children}</main>
        <footer className="footer">
          <p>
            Synthetic archive documents only (Harbourline Freight). Real authentication
            and governance still require successful Tide setup and live verification.
          </p>
        </footer>
        </Providers>
      </body>
    </html>
  );
}
