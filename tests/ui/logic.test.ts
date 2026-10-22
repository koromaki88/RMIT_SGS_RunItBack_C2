/**
 * Agent 3 UI logic tests. Pure modules only (no DOM/no React mount) so they run
 * under the single test runner Agent 1 provides (`tsx --test tests/ui/*.test.ts`).
 * They assert the honest-wording and fail-closed rules that 03-agent-ui-submission.md
 * requires, plus the contract error-table mapping (04-contract.md §3).
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  archiveObjectCaption,
  approvalObservationText,
  filedAckText,
  myApprovalBridges,
} from "../../src/components/authority-logic";
import {
  statusToCategory,
  toUiError,
  uiErrorHeading,
  validateReason,
} from "../../src/components/client-api";

test("validateReason trims whitespace and does not count it", () => {
  const result = validateReason("  old export no longer needed  ");
  assert.equal(result.ok, true);
  assert.ok(result.ok);
  assert.equal(result.reason, "old export no longer needed");
});

test("validateReason enforces 1–200 characters", () => {
  assert.equal(validateReason("   ").ok, false);
  assert.equal(validateReason("x".repeat(201)).ok, false);
  assert.equal(validateReason("x".repeat(200)).ok, true);
});

test("validateReason rejects control characters", () => {
  const result = validateReason("bad\u0000reason");
  assert.equal(result.ok, false);
  assert.match(result.ok ? "" : result.problem, /control/i);
});

test("validateReason normalises to NFC", () => {
  const decomposed = "cafe\u0301"; // é as e + combining acute
  const result = validateReason(decomposed);
  assert.equal(result.ok, true);
  assert.ok(result.ok);
  assert.equal(result.reason, "café");
});

test("contract error table maps every documented status", () => {
  assert.equal(statusToCategory(413), "invalid");
  assert.equal(statusToCategory(401), "auth");
  assert.equal(statusToCategory(403), "denied");
  assert.equal(statusToCategory(404), "notfound");
  assert.equal(statusToCategory(409), "conflict");
  assert.equal(statusToCategory(410), "expired");
  assert.equal(statusToCategory(503), "unavailable");
  assert.equal(statusToCategory(418), "unavailable");
});

test("error headings never promise success", () => {
  for (const heading of [
    uiErrorHeading({ category: "auth", code: "", message: "", status: 401 }),
    uiErrorHeading({ category: "denied", code: "", message: "", status: 403 }),
    uiErrorHeading({ category: "conflict", code: "", message: "", status: 409 }),
    uiErrorHeading({ category: "expired", code: "", message: "", status: 410 }),
    uiErrorHeading({ category: "unavailable", code: "", message: "", status: 503 }),
  ]) {
    assert.ok(heading.length > 0);
    assert.doesNotMatch(heading, /success|approved|granted/i);
  }
});

test("rejected Response becomes a UiError with the API's own message", async () => {
  const response = new Response(
    JSON.stringify({ error: { code: "CONSUMED", message: "request already executed" } }),
    { status: 409 },
  );
  const error = await toUiError(response);
  assert.equal(error.category, "conflict");
  assert.equal(error.code, "CONSUMED");
  assert.equal(error.message, "request already executed");
  assert.equal(error.status, 409);
});

test("pending-seam errors surface as setup-pending, never as progress", async () => {
  const error = await toUiError(new Error("SECURE_FETCH_PENDING: provider not merged"));
  assert.equal(error.category, "unavailable");
  assert.equal(error.code, "SETUP_PENDING");
});

test("filing acknowledgement never claims approval", () => {
  const filed = filedAckText("FILED");
  // The banner heading already says "no bytes removed".
  assert.equal(filed, "");
  assert.match(filedAckText("EXECUTED"), /already/i);
  assert.match(filedAckText("EXPIRED"), /expired/i);
});

test("archive caption distinguishes purged from purge-able", () => {
  assert.match(archiveObjectCaption("PURGED"), /no further download/i);
  assert.match(archiveObjectCaption("AVAILABLE"), /quorum/i);
  assert.doesNotMatch(archiveObjectCaption("AVAILABLE"), /no further download/i);
});

test("self-approval bridge is disclosed, not celebrated as independence", () => {
  const bridge = myApprovalBridges("trustee-and-filer");
  assert.ok(bridge);
  assert.match(bridge, /independent/i);
  assert.equal(myApprovalBridges("trustee"), null);
});

test("unknown counts render as unknown — never zero, never assumed 2-of-3", () => {
  const observed = approvalObservationText({
    observedCount: null,
    threshold: null,
    reconciliationReported: null,
  });
  assert.match(observed, /unknown|not readable|unconfirmed/i);
  assert.doesNotMatch(observed, /2 of 3|zero/i);

  const underThreshold = approvalObservationText({
    observedCount: 1,
    threshold: 2,
    reconciliationReported: null,
  });
  assert.match(underThreshold, /1 of 2/);
  assert.match(underThreshold, /NOT executable/i);

  const bridged = approvalObservationText({
    observedCount: null,
    threshold: null,
    reconciliationReported: "enclave bridge returned PENDING",
  });
  assert.match(bridged, /unconfirmed until re-read/i);
});
