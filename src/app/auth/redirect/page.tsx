/**
 * Agent 3. Minimal redirect callback. Displayed only while the provider completes
 * the browser round-trip; no tokens, session URLs, or identity details are shown
 * or logged here (03-agent-ui-submission.md recording rules).
 */

"use client";

import Link from "next/link";

export default function RedirectCallbackPage() {
  return (
    <section className="panel">
      <h2>Sign-in return</h2>
      <p className="muted">
        If your sign-in completed, the app header should now show a signed-in state.
        If it still shows pending, return and restart sign-in from the header — the app
        never infers your identity from this page.
      </p>
      <p>
        <Link href="/">Back to the vault</Link>
      </p>
    </section>
  );
}
