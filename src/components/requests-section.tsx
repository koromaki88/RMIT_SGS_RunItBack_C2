/**
 * Agent 3. Purge Requests view: real filing, frozen-manifest display, governance
 * observations via Agent 1's adapter, and execution whose authority belongs to
 * the backend only. Wording rules honor 03-agent-ui-submission.md:
 *  - 202 = "filed; no bytes removed", never "Tide approved"
 *  - unknown counts render as "unknown", never zero or an assumed 2-of-3
 *  - one approval → "One approval recorded; the recovery version is still available"
 *  - popup closing / role-creation stage / token lag are shown as real stages
 */

"use client";

import { useEffect, useRef, useState } from "react";
import {
  executePurge,
  filePurgeRequest,
  putGovernanceLinks,
  toUiError,
  uiErrorHeading,
  validateReason,
  type UiError,
} from "./client-api";
import {
  approveGovernance,
  proposePurgeGrant,
  readGovernance,
  secureFetch,
  type GovernanceObservation,
  type PurgeRequest,
} from "./merge-seam";
import { StatusBanner, type BannerTone } from "./status-banner";
import {
  approvalObservationText,
} from "./authority-logic";
import {
  relativeWindow,
  fullTimestamp,
  copyText,
} from "./display-utils";
import {
  ClipboardIcon,
  CloseIcon,
  QuorumIcon,
  RefreshIcon,
  SealIcon,
  ShieldIcon,
} from "./icons";

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toUTCString();
}

function StateBadge(props: { state: PurgeRequest["state"] }) {
  if (props.state === "EXECUTED") {
    return (
      <span className="badge badge-committed">
        <SealIcon size={12} /> Executed
      </span>
    );
  }
  if (props.state === "EXPIRED") {
    return <span className="badge badge-expired">Expired</span>;
  }
  return <span className="badge badge-pending">Filed · awaiting quorum</span>;
}

function RequestWindow(props: { iso: string }) {
  const { text, minutes } = relativeWindow(props.iso);
  const tone = minutes === null ? "" : minutes <= 0 ? "is-past" : minutes <= 5 ? "is-urgent" : "";
  return (
    <span className={`request-window${tone ? ` ${tone}` : ""}`} title={`Full window: ${fullTimestamp(props.iso)} (server-assigned TTL)`}>
      <SealIcon size={12} />
      {text}
    </span>
  );
}

export function RequestsSection(props: {
  requests: PurgeRequest[];
  availableOptions: Array<{ objectId: string; version: number; name: string }>;
  requestsLoading: boolean;
  requestsError: UiError | null;
  onSubmit: () => void;
  onStateMutated: () => void;
}) {
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [reasonProblem, setReasonProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [local, setLocal] = useState<{
    tone: BannerTone;
    heading: string;
    detail?: string;
    dismissId?: string;
  } | null>(null);
  const [observations, setObservations] = useState<GovernanceObservation[]>([]);
  const [observationError, setObservationError] = useState<string | null>(null);
  const [justFiledId, setJustFiledId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLElement | null>(null);

  // Keep relative windows truthful as time passes.
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((tick) => tick + 1), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // One authored moment: the newly filed request slides in and is brought to view.
  useEffect(() => {
    if (justFiledId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [justFiledId, props.requests.length]);

  async function handleError(value: unknown, fallbackTone: BannerTone, dismissId: string): Promise<void> {
    const error = await toUiError(value);
    setLocal({ tone: fallbackTone, heading: uiErrorHeading(error), detail: error.message, dismissId });
  }

  async function withBusy(key: string, action: () => Promise<void>) {
    setBusy(key);
    setLocal(null);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  }

  const proposeGrant = (request: PurgeRequest) =>
    withBusy(`propose:${request.requestId}`, async () => {
      try {
        const links = await proposePurgeGrant(request, secureFetch);
        const stored = await putGovernanceLinks({ requestId: request.requestId, links });
        if (stored.ok) {
          setLocal({
            tone: "info",
            dismissId: "request-propose",
            heading: links.length ? "Grant proposed." : "No new governance changes returned.",
          });
          props.onStateMutated();
        } else {
          await handleError(stored.error, "error", "request-propose-error");
        }
      } catch (caught) {
        await handleError(caught, "error", "request-propose-error");
      }
    });

  const refreshGovernance = (request: PurgeRequest) =>
    withBusy(`read:${request.requestId}`, async () => {
      setObservationError(null);
      try {
        const observed = await readGovernance(request.governanceLinks, secureFetch);
        setObservations(observed);
        setLocal({
          tone: "info",
          dismissId: "request-read",
          heading: "Governance refreshed.",
        });
      } catch (caught) {
        const error = await toUiError(caught);
        setObservationError(error.message);
        setLocal({
          tone: "warn",
          dismissId: "request-read-error",
          heading: uiErrorHeading(error),
          detail: error.message,
        });
      }
    });

  const approve = (request: PurgeRequest, changeRequestId: string) =>
    withBusy(`approve:${changeRequestId}`, async () => {
      try {
        const observation = await approveGovernance(changeRequestId, secureFetch);
        setObservations((current) => [
          ...current.filter((item) => item.changeRequestId !== observation.changeRequestId),
          observation,
        ]);
        const singleApproval =
          observation.authorizationCount === 1 && observation.status === "APPROVED";
        setLocal({
          tone: "warn",
          dismissId: "request-approve",
          heading: singleApproval
            ? "One approval recorded; the recovery version is still available."
            : approvalObservationText({
                observedCount: observation.authorizationCount,
                threshold: observation.threshold,
                reconciliationReported: null,
              }),
        });
      } catch (caught) {
        // A popup closing is NOT approval commitment — surface as observed refusal/pending.
        await handleError(caught, "warn", "request-approve-error");
      }
    });

  const execute = (request: PurgeRequest) =>
    withBusy(`execute:${request.requestId}`, async () => {
      try {
        const result = await executePurge(request.requestId);
        if (result.ok) {
          const targets = result.purged.map((entry) => `${entry.objectId} v${entry.version}`).join(", ");
          setLocal({
            tone: "success",
            dismissId: "request-execute",
            heading: "Purge executed exactly once.",
            detail: `Removed from the active archive: ${targets}.`,
          });
          props.onStateMutated();
        } else {
          // 403 without committed authority, 409 replay/consumed, 410 expired — shown honestly.
          await handleError(result.error, "error", "request-execute-error");
        }
      } catch (caught) {
        await handleError(caught, "error", "request-execute-error");
      }
    });

  function handleFile() {
    setLocal(null);
    const chosen = props.availableOptions.find(
      (option) => `${option.objectId}#${option.version}` === selected,
    );
    if (!chosen) {
      setReasonProblem("Choose a version to purge.");
      return;
    }
    const validated = validateReason(reason);
    if (!validated.ok) {
      setReasonProblem(validated.problem);
      return;
    }
    setReasonProblem(null);
    return withBusy("file", async () => {
      try {
        const result = await filePurgeRequest({
          objectId: chosen.objectId,
          version: chosen.version,
          reason: validated.reason,
        });
        if (result.ok) {
          setLocal({
            tone: "warn",
            dismissId: "request-filed",
            heading: "Request filed; no bytes removed.",
          });
          setJustFiledId(result.request.requestId);
          setReason("");
          setSelected("");
          props.onSubmit();
        } else {
          await handleError(result.error, "error", "request-filed-error");
        }
      } catch (caught) {
        await handleError(caught, "error", "request-filed-error");
      }
    });
  }

  function filingForm() {
    if (props.availableOptions.length === 0) {
      return (
        <div className="empty-state">
          <span className="empty-icon">
            <QuorumIcon size={20} />
          </span>
          <h3>Nothing to file right now</h3>
          <p>No downloadable version is available to select.</p>
        </div>
      );
    }
    const charCount = reason.normalize("NFC").trim().length;
    const over = charCount > 200;
    return (
      <form
        className="file-form"
        onSubmit={(event) => {
          event.preventDefault();
          const outcome = handleFile();
          void outcome;
        }}
      >
        <label htmlFor="target">Recovery version to purge</label>
        <select
          id="target"
          value={selected}
          onChange={(event) => {
            setSelected(event.target.value);
            setReasonProblem(null);
          }}
        >
          <option value="">Choose a version…</option>
          {props.availableOptions.map((option) => (
            <option
              key={`${option.objectId}#${option.version}`}
              value={`${option.objectId}#${option.version}`}
            >
              {option.name} · v{option.version}
            </option>
          ))}
        </select>

        <label htmlFor="reason">Reason</label>
        <textarea
          id="reason"
          rows={2}
          maxLength={400}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            const validated = validateReason(event.target.value);
            setReasonProblem(
              event.target.value.length === 0 ? null : validated.ok ? null : validated.problem,
            );
          }}
          placeholder="Why this specific version must go — in words a trustee can judge"
        />
        <div className="field-meta">
          <span className={`char-counter${over ? " is-over" : ""}`} aria-live="polite">
            {charCount}/200
          </span>
        </div>
        {reasonProblem ? (
          <p className="field-error" role="alert">
            <CloseIcon size={14} />
            {reasonProblem}
          </p>
        ) : null}

        <button
          type="submit"
          className={`btn file-submit${busy === "file" ? " is-busy" : ""}`}
          disabled={busy === "file"}
        >
          {busy === "file" ? "Filing…" : "File purge request"}
        </button>
      </form>
    );
  }

  function observationRow(observation: GovernanceObservation) {
    const count =
      observation.authorizationCount === null ? "unknown" : String(observation.authorizationCount);
    const threshold = observation.threshold === null ? "unknown" : String(observation.threshold);
    const statusBadge =
      observation.status === "APPROVED" ? (
        <span className="badge badge-ok">Approved</span>
      ) : observation.status === "PENDING" ? (
        <span className="badge badge-pending">Pending</span>
      ) : (
        <span className="badge badge-expired">{observation.status.toLowerCase()}</span>
      );
    return (
      <tr key={observation.changeRequestId}>
        <td className="mono">{observation.changeRequestId}</td>
        <td>{statusBadge}</td>
        <td className="num">{count}</td>
        <td className="num">{threshold}</td>
        <td>
          <button
            type="button"
            className={`btn btn-brass btn-small${busy === `approve:${observation.changeRequestId}` ? " is-busy" : ""}`}
            disabled={busy !== null || observation.status !== "PENDING"}
            onClick={() => {
              const request = props.requests.find((item) =>
                item.governanceLinks.some(
                  (link) => link.changeRequestId === observation.changeRequestId,
                ),
              );
              if (request) void approve(request, observation.changeRequestId);
            }}
          >
            <ShieldIcon size={13} />
            {busy === `approve:${observation.changeRequestId}` ? "Signing…" : "Approve (trustee)"}
          </button>
        </td>
      </tr>
    );
  }

  const showObservations = observations.length > 0 || observationError !== null;

  function noRequestsState(hasError: UiError | null) {
    if (hasError) {
      return (
        <StatusBanner
          tone="warn"
          heading={uiErrorHeading(hasError)}
          detail={
            hasError.status === null
              ? `${hasError.message} (code ${hasError.code})`
              : hasError.message
          }
        />
      );
    }
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <QuorumIcon size={20} />
        </span>
        <h3>No purge requests yet</h3>
        <p>File a request above.</p>
      </div>
    );
  }

  return (
    <section className="panel" id="requests" aria-labelledby="requests-h">
      <h2 id="requests-h">
        <span className="panel-heading-icon">
          <QuorumIcon size={18} />
        </span>
        Purge requests
      </h2>

      {filingForm()}

      {props.requestsLoading && props.requests.length === 0 ? (
        <div className="skeleton" style={{ height: 68, width: "100%" }} aria-hidden="true" />
      ) : null}
      {!props.requestsLoading && props.requests.length === 0
        ? noRequestsState(props.requestsError)
        : null}

      {props.requests.map((request) => {
        const highlighted = request.requestId === justFiledId;
        return (
          <article
            className={`request-card${highlighted ? " is-highlighted" : ""}`}
            key={request.requestId}
            ref={highlighted ? highlightRef : undefined}
          >
            <div className="request-head">
              <h3>{request.requestId}</h3>
              <StateBadge state={request.state} />
              <RequestWindow iso={request.manifest.expiresAt} />
            </div>
            <dl className="manifest-grid">
              <dt>Manifest scope</dt>
              <dd className="mono">
                {request.manifest.objects
                  .map((entry) => `${entry.objectId} · v${entry.version} · ${entry.sha256.slice(0, 16)}…`)
                  .join("; ")}
              </dd>
              <dt>Intended recipient (server-assigned)</dt>
              <dd className="mono">{request.manifest.executorSubject}</dd>
              <dt>Audience (server-configured)</dt>
              <dd className="mono">{request.manifest.executorAudience}</dd>
              <dt>Window opened</dt>
              <dd>
                <span title={fullTimestamp(request.manifest.createdAt)}>{formatTimestamp(request.manifest.createdAt)}</span>
              </dd>
              <dt>Entitlement role hash</dt>
              <dd className="mono manifest-key-digest">
                {request.entitlement}
                <button
                  type="button"
                  className="btn btn-copy"
                  aria-label="Copy entitlement role name"
                  onClick={async () => {
                    await copyEntitlement(request.entitlement);
                  }}
                >
                  <ClipboardIcon size={13} />
                </button>
              </dd>
              <dt>Manifest hash</dt>
              <dd className="mono manifest-key-digest">
                {request.manifestHash}
                <button
                  type="button"
                  className="btn btn-copy"
                  aria-label="Copy manifest hash"
                  onClick={async () => {
                    await copyText(request.manifestHash);
                  }}
                >
                  <ClipboardIcon size={13} />
                </button>
              </dd>
              <dt>Reason</dt>
              <dd>{request.manifest.reason}</dd>
              <dt>Governance CR IDs</dt>
              <dd className="mono">
                {request.governanceLinks.length === 0
                  ? "none yet"
                  : request.governanceLinks.map((link) => `${link.changeRequestId} (${link.actionType})`).join(", ")}
              </dd>
              {request.executedAt ? (
                <>
                  <dt>Executed</dt>
                  <dd>{formatTimestamp(request.executedAt)}</dd>
                </>
              ) : null}
            </dl>

            {request.state !== "FILED" ? null : (
              <div className="request-actions">
                <button
                  type="button"
                  className={`btn${busy === `propose:${request.requestId}` ? " is-busy" : ""}`}
                  disabled={busy === `propose:${request.requestId}`}
                  onClick={() => void proposeGrant(request)}
                >
                  <QuorumIcon size={14} />
                  {busy === `propose:${request.requestId}` ? "Proposing…" : "Propose grant"}
                </button>
                <button
                  type="button"
                  className={`btn btn-ghost${busy === `read:${request.requestId}` ? " is-busy" : ""}`}
                  disabled={busy === `read:${request.requestId}`}
                  onClick={() => void refreshGovernance(request)}
                >
                  <RefreshIcon size={14} />
                  {busy === `read:${request.requestId}` ? "Reading…" : "Refresh governance"}
                </button>
                <button
                  type="button"
                  className={`btn btn-danger${busy === `execute:${request.requestId}` ? " is-busy" : ""}`}
                  disabled={busy === `execute:${request.requestId}`}
                  onClick={() => void execute(request)}
                >
                  <SealIcon size={14} />
                  {busy === `execute:${request.requestId}` ? "Executing…" : "Execute approved purge"}
                </button>
              </div>
            )}
          </article>
        );
      })}

      {showObservations ? (
        <div className="observations">
          <h3>
            <ShieldIcon size={16} />
            Governance observations
          </h3>
          {observationError ? (
            <p className="muted">
              <CloseIcon size={13} /> {observationError}
            </p>
          ) : null}
          {observations.length > 0 ? (
            <div className="table-scroll">
              <table className="observations-table">
                <thead>
                  <tr>
                    <th scope="col">Change request</th>
                    <th scope="col">Status</th>
                    <th scope="col">Approvals</th>
                    <th scope="col">Threshold</th>
                    <th scope="col">Trustee action</th>
                  </tr>
                </thead>
                <tbody>{observations.map((observation) => observationRow(observation))}</tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {local ? (
        <StatusBanner tone={local.tone} heading={local.heading} detail={local.detail} dismissId={local.dismissId} />
      ) : null}
    </section>
  );
}

async function copyEntitlement(value: string) {
  await copyText(value);
}
