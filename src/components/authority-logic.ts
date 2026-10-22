/**
 * Truth table for honest status wording — the only place that decides what the UI
 * may say about authority. See README.md for the security boundary.
 * No React, no DOM — pure logic so it is unit-testable.
 *
 * Never-wrong rules implemented here:
 * - Filing is NOT approval: app 202 means "filed; no bytes removed".
 * - Unknown counts/thresholds render as unknown, never as zero or as assumed 2-of-3.
 * - A bridged approval (this same account, or a self-filing count) must not be shown
 *   as independent progress.
 * - Execution authority is the backend's decision; the UI never enables it locally.
 */

export type RequestAppState = "FILED" | "EXECUTED" | "EXPIRED";

export type MyGovernanceRole =
  | "unknown"
  | "filing-member"
  | "trustee"
  | "trustee-and-filer";

export type ErrorCategory =
  | "auth" // 401 — not signed in / DPoP proof failure
  | "denied" // 403 — insufficient authority
  | "notfound" // 404
  | "conflict" // 409 — consumed / conflicting state (incl. replay)
  | "expired" // 410
  | "unavailable" // 503 — backend/storage/config not ready
  | "network" // fetch/connection failure
  | "invalid"; // 400/413 — malformed or oversized input

/** Status sentence the Archive section shows for a purge-able version. */
export function archiveObjectCaption(state: unknown): string {
  return state === "PURGED"
    ? "Purged — no further download"
    : "Remove this version only after a governed quorum";
}

/** Does a majority count toward independence, given the Caller's own CR visibility. */
export function myApprovalBridges(msg: MyGovernanceRole): string | null {
  if (msg === "trustee-and-filer") {
    return "This account both filed the request AND added this approval. Its approval count stands, but independent signer distance is still required — the second approval must come from a different trustee.";
  }
  return null;
}

/** Filing acknowledgement detail. Empty when the heading already covers it. */
export function filedAckText(state: RequestAppState): string {
  return state === "FILED"
    ? ""
    : state === "EXECUTED"
      ? "This request has already been executed."
      : "This request has expired. File a new one for the retry activity.";
}

/**
 * Approvals copy surgery — feedback after a merge action attempt.
 * May show "at least one approval recorded" only when actual evidence exists via
 * the readGovernance adapter. Null means "no observable change — see notes".
 */
export function approvalObservationText(args: {
  observedCount: number | null;
  threshold: number | null;
  reconciliationReported: string | null;
}): string {
  const { observedCount, threshold, reconciliationReported } = args;
  const unknown = observedCount === null || threshold === null;
  if (reconciliationReported) {
    return `Approval action returned a bridge: ${reconciliationReported} Quorum remains unconfirmed until re-read shows ${unknown ? "signed observed counts" : `${observedCount} of ${threshold} (independently)`}.`;
  }
  if (unknown) return "Quorum count or threshold is unknown. Re-check the request's change requests.";
  if (observedCount < threshold) {
    return `Governance shows ${observedCount} of ${threshold} recorded — the purge is still NOT executable. Another trustee must approve independently.`;
  }
  return `Governance shows ${observedCount} of ${threshold} recorded. The backend only executes once your recipient token carries the exact vault-purge role in a fresh signed token — re-auth may be required.`;
}
