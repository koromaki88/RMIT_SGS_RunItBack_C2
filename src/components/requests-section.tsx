/**
 * Agent 3. Purge Requests view: real filing, frozen-manifest display, governance
 * observations via Agent 1's adapter, and execution whose authority belongs to the
 * backend only. Every wording rule honors 03-agent-ui-submission.md:
 *  - 202 = "filed; no bytes removed", never "Tide approved"
 *  - unknown counts render as "unknown", never zero or an assumed 2-of-3
 *  - one approval → "One approval recorded; the recovery version is still available"
 *  - popup closing / role-creation stage / token lag are shown as real stages
 */

"use client";

import { useState } from "react";
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
import { approvalObservationText, filedAckText, myApprovalBridges, type MyGovernanceRole } from "./authority-logic";

const DEFAULT_ROLE: MyGovernanceRole = "unknown";

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toUTCString();
}

function formatEntitlement(value: string): string {
  // pure display; never re-parsed as authority
  return value;
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
  } | null>(null);
  const [observations, setObservations] = useState<GovernanceObservation[]>([]);
  const [observationError, setObservationError] = useState<string | null>(null);
  const [unknownRole, setUnknownRole] = useState<MyGovernanceRole>(DEFAULT_ROLE);

  async function handleError(value: unknown, fallbackTone: BannerTone): Promise<void> {
    const error = await toUiError(value);
    setLocal({ tone: fallbackTone, heading: uiErrorHeading(error), detail: error.message });
  }

  async function handleFile() {
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
    setBusy("file");
    try {
      const result = await filePurgeRequest({
        objectId: chosen.objectId,
        version: chosen.version,
        reason: validated.reason,
      });
      if (result.ok) {
        setLocal({
          tone: "info",
          heading: "Request filed; no bytes removed.",
          detail: filedAckText(result.request.state),
        });
        setReason("");
        setSelected("");
        props.onSubmit();
      } else {
        await handleError(result.error, "error");
      }
    } catch (caught) {
      await handleError(caught, "error");
    } finally {
      setBusy(null);
    }
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
        const stored = await putGovernanceLinks({
          requestId: request.requestId,
          links,
        });
        if (stored.ok) {
          setLocal({
            tone: "info",
            heading: "Grant proposed.",
            detail:
              "The role-creation and grant appear as separate dependent change requests. Approvals are not yet recorded — refresh governance for real observations.",
          });
          props.onStateMutated();
        } else {
          await handleError(stored.error, "error");
        }
      } catch (caught) {
        await handleError(caught, "error");
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
          heading: "Governance refreshed.",
          detail:
            "Counts shown below are observations only. Unknown counts stay unknown — they are never treated as zero or as an assumed threshold.",
        });
      } catch (caught) {
        const error = await toUiError(caught);
        setObservationError(error.message);
        setLocal({ tone: "warn", heading: uiErrorHeading(error), detail: error.message });
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
        const bridge = myApprovalBridges(unknownRole);
        setLocal({
          tone: "info",
          heading:
            observation.authorizationCount === 1
              ? "One approval recorded; the recovery version is still available."
              : approvalObservationText({
                  observedCount: observation.authorizationCount,
                  threshold: observation.threshold,
                  reconciliationReported: null,
                }),
          detail: bridge ?? undefined,
        });
      } catch (caught) {
        // A popup closing is NOT approval commitment — surface as observed refusal/pending.
        await handleError(caught, "warn");
      }
    });

  const execute = (request: PurgeRequest) =>
    withBusy(`execute:${request.requestId}`, async () => {
      try {
        const result = await executePurge(request.requestId);
        if (result.ok) {
          const targets = result.purged
            .map((entry) => `${entry.objectId} v${entry.version}`)
            .join(", ");
          setLocal({
            tone: "success",
            heading: "Purge executed once.",
            detail: `Removed: ${targets}. Reloaded archive shows the other version still present.`,
          });
          setUnknownRole(DEFAULT_ROLE);
          props.onStateMutated();
        } else {
          // 403 without committed authority, 409 replay/consumed, 410 expired — all shown honestly.
          await handleError(result.error, "error");
        }
      } catch (caught) {
        await handleError(caught, "error");
      }
    });

  function fileForm() {
    if (props.availableOptions.length === 0) {
      return (
        <p className="muted">
          Filing is disabled right now: no archive version is present to select. This is not a
          workaround prompt — the backend decides what may be filed.
        </p>
      );
    }
    return (
      <form
        className="file-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleFile();
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
            <option key={`${option.objectId}#${option.version}`} value={`${option.objectId}#${option.version}`}>
              {option.name} · v{option.version}
            </option>
          ))}
        </select>

        <label htmlFor="reason">Reason (1–200 characters)</label>
        <textarea
          id="reason"
          rows={2}
          maxLength={400}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            const validated = validateReason(event.target.value);
            setReasonProblem(event.target.value.length === 0 ? null : validated.ok ? null : validated.problem);
          }}
          placeholder="Why this version must go (own words; no secrets)"
        />
        {reasonProblem ? (
          <p className="field-error" role="alert">
            {reasonProblem}
          </p>
        ) : null}

        <button type="submit" className="btn" disabled={busy === "file"}>
          {busy === "file" ? "Filing…" : "File purge request"}
        </button>
        <p className="muted section-note">
          Filing freezes target, recipient and expiry server-side and removes nothing. The app&apos;s
          acknowledgement is not a Tide approval.
        </p>
      </form>
    );
  }

  function observationRow(observation: GovernanceObservation) {
    const count = observation.authorizationCount === null ? "unknown" : String(observation.authorizationCount);
    const threshold = observation.threshold === null ? "unknown" : String(observation.threshold);
    return (
      <tr key={observation.changeRequestId}>
        <td className="mono">{observation.changeRequestId}</td>
        <td>{observation.status}</td>
        <td>{count}</td>
        <td>{threshold}</td>
        <td>
          <button
            type="button"
            className="btn"
            disabled={busy === `approve:${observation.changeRequestId}`}
            onClick={() => {
              const request = props.requests.find((item) =>
                item.governanceLinks.some((link) => link.changeRequestId === observation.changeRequestId),
              );
              if (request) void approve(request, observation.changeRequestId);
            }}
          >
            {busy === `approve:${observation.changeRequestId}` ? "Submitting…" : "Approve (trustee)"}
          </button>
        </td>
      </tr>
    );
  }

  const showObservations = observations.length > 0 || observationError !== null;

  return (
    <section className="panel" id="requests" aria-labelledby="requests-h">
      <h2 id="requests-h">Purge requests</h2>

      {props.requestsLoading && props.requests.length === 0 ? (
        <p className="muted">Fetching requests…</p>
      ) : null}
      {!props.requestsLoading && props.requests.length === 0 && props.requestsError ? (
        <StatusBanner
          tone="warn"
          heading={uiErrorHeading(props.requestsError)}
          detail={
            props.requestsError.status === null
              ? `${props.requestsError.message} (code ${props.requestsError.code})`
              : props.requestsError.message
          }
        />
      ) : null}
      {!props.requestsLoading && props.requests.length === 0 && !props.requestsError ? (
        <p className="muted">No purge requests yet.</p>
      ) : null}

      {fileForm()}

      {props.requests.map((request) => (
        <article className="request-card" key={request.requestId}>
          <h3 className="mono">{request.requestId}</h3>
          <p>
            <span className={`badge ${request.state === "FILED" ? "badge-pending" : request.state === "EXECUTED" ? "badge-gone" : "badge-expired"}`}>
              {request.state}
            </span>
          </p>
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
            <dt>Expires</dt>
            <dd>{formatTimestamp(request.manifest.expiresAt)}</dd>
            <dt>Entitlement role hash</dt>
            <dd className="mono">{formatEntitlement(request.entitlement)}</dd>
            <dt>Manifest hash</dt>
            <dd className="mono">{request.manifestHash}</dd>
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

          <div className="request-actions">
            {request.state !== "FILED" ? null : (
              <>
                <button
                  type="button"
                  className="btn"
                  disabled={busy === `propose:${request.requestId}`}
                  onClick={() => void proposeGrant(request)}
                >
                  {busy === `propose:${request.requestId}` ? "Proposing…" : "Propose grant (trustee)"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy === `read:${request.requestId}`}
                  onClick={() => void refreshGovernance(request)}
                >
                  {busy === `read:${request.requestId}` ? "Reading…" : "Refresh governance"}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy === `execute:${request.requestId}`}
                  onClick={() => void execute(request)}
                >
                  Execute approved purge
                </button>
                <p className="muted section-note">
                  The backend decides this button&apos;s outcome every time; the UI never grants
                  permission. Refusal is expected until a committed grant appears in a fresh
                  recipient token — re-login may be required after the second approval.
                </p>
              </>
            )}
          </div>
        </article>
      ))}

      {showObservations ? (
        <div className="observations">
          <h3>Governance observations</h3>
          {observationError ? <p className="muted">{observationError}</p> : null}
          {observations.length > 0 ? (
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
          ) : null}
          <p className="muted section-note">
            App state is not Tide state: observations are read through Agent 1&apos;s adapter,
            counts stay &ldquo;unknown&rdquo; when not reported, and a signer popup closing never
            counts as approval. Approve from each trustee&apos;s own browser profile.
          </p>
        </div>
      ) : null}

      {local ? (
        <StatusBanner tone={local.tone} heading={local.heading} detail={local.detail} />
      ) : null}
    </section>
  );
}
