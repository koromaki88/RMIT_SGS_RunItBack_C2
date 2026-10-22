/**
 * Client API layer. Every protected call goes through the mode-aware secureFetch:
 * SDK DPoP in real mode, same-origin cookies in explicit simulation mode.
 * Also owns HTTP status → honest error-category mapping and
 * safe binary download with object-URL cleanup.
 */

import {
  PUBLIC_ORIGIN,
  secureFetch,
  type ApiError,
  type ArchiveObject,
  type PurgeRequest,
} from "./merge-seam";

export type UiErrorCategory =
  | "invalid" // 400 / 413
  | "auth" // 401
  | "denied" // 403
  | "notfound" // 404
  | "conflict" // 409 — consumed/conflicting state, incl. replay refusal
  | "expired" // 410
  | "unavailable" // 503
  | "network"; // connection failed / pending seam

export type UiError = {
  category: UiErrorCategory;
  code: string;
  message: string;
  /** HTTP status when a response existed; null for pure network/pending failures. */
  status: number | null;
};

export function isUiError(value: unknown): value is UiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "category" in value &&
    "code" in value &&
    "message" in value
  );
}

const CATEGORY_BY_STATUS: Record<string, UiErrorCategory> = {
  "400": "invalid",
  "413": "invalid",
  "401": "auth",
  "403": "denied",
  "404": "notfound",
  "409": "conflict",
  "410": "expired",
  "503": "unavailable",
};

export function statusToCategory(status: number): UiErrorCategory {
  return CATEGORY_BY_STATUS[String(status)] ?? "unavailable";
}

/** Human phrasing per category — used by every view via the shared banner. */
export function uiErrorHeading(error: UiError): string {
  switch (error.category) {
    case "auth":
      return "Sign-in required";
    case "denied":
      return "Not permitted";
    case "notfound":
      return "Not found";
    case "conflict":
      return "Already used or conflicting";
    case "expired":
      return "Request expired";
    case "invalid":
      return "Unacceptable input";
    case "unavailable":
      return "Service unavailable";
    case "network":
      return "Could not reach the service";
  }
}

/** Maps a thrown/failing response into a UiError, preserving the API's own message. */
export async function toUiError(value: unknown): Promise<UiError> {
  if (value instanceof Response) {
    let apiCode = "HTTP_" + value.status;
    let apiMessage = value.statusText || "Request failed";
    try {
      const body = (await value.json()) as Partial<ApiError>;
      if (body && body.error && typeof body.error.code === "string") {
        apiCode = body.error.code;
      }
      if (body && body.error && typeof body.error.message === "string") {
        apiMessage = body.error.message;
      }
    } catch {
      // non-JSON error body — keep the status fallbacks above
    }
    return {
      category: statusToCategory(value.status),
      code: apiCode,
      message: apiMessage,
      status: value.status,
    };
  }
  if (value instanceof Error) {
    // Includes the pending-seam errors: same honest wording, no fake recovery.
    const pending = /PENDING:/.test(value.message);
    return {
      category: pending ? "unavailable" : "network",
      code: pending ? "SETUP_PENDING" : "NETWORK",
      message: value.message,
      status: null,
    };
  }
  return {
    category: "network",
    code: "UNKNOWN",
    message: "Unexpected failure",
    status: null,
  };
}

// ---------------------------------------------------------------------------
// Protected calls
// ---------------------------------------------------------------------------

/** Headers required by the frozen contract — futures rejected server-side anyway. */
function jsonInit(method: string, body?: unknown): RequestInit {
  const init: RequestInit = {
    method,
    headers: { "Accept": "application/json" },
    cache: "no-store",
  };
  if (body !== undefined) {
    (init.headers as Record<string, string>)["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  return init;
}

export type ObjectsResult =
  | { ok: true; objects: ArchiveObject[] }
  | { ok: false; error: UiError };

export async function fetchObjects(): Promise<ObjectsResult> {
  try {
    const res = await secureFetch(`${PUBLIC_ORIGIN}/api/vault/objects`, jsonInit("GET"));
    if (!res.ok) return { ok: false, error: await toUiError(res) };
    const data = (await res.json()) as { objects: ArchiveObject[] };
    return { ok: true, objects: data.objects };
  } catch (caught) {
    return { ok: false, error: await toUiError(caught) };
  }
}

export type RequestsResult =
  | { ok: true; requests: PurgeRequest[] }
  | { ok: false; error: UiError };

export async function fetchRequests(): Promise<RequestsResult> {
  try {
    const res = await secureFetch(`${PUBLIC_ORIGIN}/api/vault/requests`, jsonInit("GET"));
    if (!res.ok) return { ok: false, error: await toUiError(res) };
    const data = (await res.json()) as { requests: PurgeRequest[] };
    return { ok: true, requests: data.requests };
  } catch (caught) {
    return { ok: false, error: await toUiError(caught) };
  }
}

export type FiledResult =
  | { ok: true; request: PurgeRequest }
  | { ok: false; error: UiError };

export async function filePurgeRequest(input: {
  objectId: string;
  version: number;
  reason: string;
}): Promise<FiledResult> {
  try {
    const res = await secureFetch(
      `${PUBLIC_ORIGIN}/api/vault/requests`,
      jsonInit("POST", input),
    );
    if (!res.ok && res.status !== 202) return { ok: false, error: await toUiError(res) };
    if (res.status === 202) {
      const data = (await res.json()) as { request: PurgeRequest };
      return { ok: true, request: data.request };
    }
    return { ok: false, error: await toUiError(res) };
  } catch (caught) {
    return { ok: false, error: await toUiError(caught) };
  }
}

export type LinkResult =
  | { ok: true; request: PurgeRequest }
  | { ok: false; error: UiError };

export async function putGovernanceLinks(input: {
  requestId: string;
  links: Array<{ changeRequestId: string; actionType: string }>;
}): Promise<LinkResult> {
  try {
    const res = await secureFetch(
      `${PUBLIC_ORIGIN}/api/vault/requests/${encodeURIComponent(input.requestId)}/governance`,
      jsonInit("PUT", { links: input.links }),
    );
    if (!res.ok) return { ok: false, error: await toUiError(res) };
    const data = (await res.json()) as { request: PurgeRequest };
    return { ok: true, request: data.request };
  } catch (caught) {
    return { ok: false, error: await toUiError(caught) };
  }
}

export type ExecuteResult =
  | { ok: true; request: PurgeRequest; purged: Array<{ objectId: string; version: number }> }
  | { ok: false; error: UiError };

/** Empty JSON body exactly as the contract requires — no extra fields. */
export async function executePurge(requestId: string): Promise<ExecuteResult> {
  try {
    const res = await secureFetch(
      `${PUBLIC_ORIGIN}/api/vault/requests/${encodeURIComponent(requestId)}/execute`,
      jsonInit("POST", {}),
    );
    if (!res.ok) return { ok: false, error: await toUiError(res) };
    const data = (await res.json()) as {
      request: PurgeRequest;
      purged: Array<{ objectId: string; version: number }>;
    };
    return { ok: true, request: data.request, purged: data.purged };
  } catch (caught) {
    return { ok: false, error: await toUiError(caught) };
  }
}

export type DownloadResult =
  | { ok: true; blob: Blob; filename: string; revoke: () => void }
  | { ok: false; error: UiError };

/**
 * Downloads exact bytes via the authenticated endpoint. The caller MUST invoke
 * revoke() after use — the browser object URL is revoked right after "Save",
 * never left behind after use.
 */
export async function downloadVersion(input: {
  objectId: string;
  version: number;
}): Promise<DownloadResult> {
  try {
    const res = await secureFetch(
      `${PUBLIC_ORIGIN}/api/vault/objects/${encodeURIComponent(input.objectId)}/versions/${encodeURIComponent(String(input.version))}`,
      { method: "GET", cache: "no-store" },
    );
    if (!res.ok) return { ok: false, error: await toUiError(res) };
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const filenameMatch = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(disposition);
    const filename = filenameMatch
      ? decodeURIComponent(filenameMatch[1].replace(/"/g, ""))
      : `${input.objectId}.v${input.version}.bin`;
    const url = URL.createObjectURL(blob);
    return {
      ok: true,
      blob,
      filename,
      revoke: () => URL.revokeObjectURL(url),
    };
  } catch (caught) {
    return { ok: false, error: await toUiError(caught) };
  }
}

/** Trigger a user-facing save from a blob, then revoke immediately. */
export function saveBlobAndRevoke(blob: Blob, filename: string, revoke: () => void): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke both the caller-supplied handle and the fresh anchor URL.
  revoke();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

// ---------------------------------------------------------------------------
// Reason validation mirrors the server rule so files never
// bounce with raw 400s. The server remains the authority; the client just
// prevents obvious typos from becoming error noise.
// ---------------------------------------------------------------------------

const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;

export type ReasonValidation =
  | { ok: true; reason: string }
  | { ok: false; problem: string; length: number };

export function validateReason(raw: string): ReasonValidation {
  // NFC normalisation must match the server's trimmed-NFC comparison.
  const reason = raw.normalize("NFC").trim();
  if (reason.length < 1) {
    return { ok: false, problem: "A reason is required.", length: 0 };
  }
  if (reason.length > 200) {
    return { ok: false, problem: "Reason must be at most 200 characters.", length: reason.length };
  }
  if (CONTROL_CHARS.test(reason)) {
    return { ok: false, problem: "Reason must not contain control characters.", length: reason.length };
  }
  return { ok: true, reason };
}
