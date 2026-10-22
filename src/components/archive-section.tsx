/**
 * Agent 3. Archive view: real file/version/size/digest/state from Agent 2's API,
 * exact-bytes download with object-URL revocation after use, fail-closed pending
 * and error rendering. No fake archive rows, no fixture toggle (03-agent-ui-submission.md).
 */

"use client";

import { useState } from "react";
import {
  downloadVersion,
  saveBlobAndRevoke,
  uiErrorHeading,
  type UiError,
} from "./client-api";
import { StatusBanner, type BannerTone } from "./status-banner";
import { archiveObjectCaption } from "./authority-logic";
import type { ArchiveObject } from "./merge-seam";

function shortSha(sha: string): string {
  return sha.length > 12 ? `${sha.slice(0, 12)}…` : sha;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ArchiveSection(props: {
  objects: ArchiveObject[];
  loading: boolean;
  error: UiError | null;
  onRefresh: () => void;
}) {
  const [busyVersion, setBusyVersion] = useState<string | null>(null);
  const [local, setLocal] = useState<{ tone: BannerTone; heading: string; detail?: string } | null>(
    null,
  );

  async function handleDownload(object: ArchiveObject) {
    const key = `${object.objectId}#${object.version}`;
    setBusyVersion(key);
    setLocal(null);
    try {
      const result = await downloadVersion({
        objectId: object.objectId,
        version: object.version,
      });
      if (result.ok) {
        saveBlobAndRevoke(result.blob, result.filename, result.revoke);
        setLocal({
          tone: "success",
          heading: `Downloaded ${result.filename}`,
          detail: "Connection closed; temporary link withdrawn.",
        });
      } else {
        setLocal({ tone: "error", heading: uiErrorHeading(result.error), detail: result.error.message });
      }
    } finally {
      setBusyVersion(null);
    }
  }

  if (props.loading && props.objects.length === 0) {
    return (
      <section className="panel" id="archive" aria-labelledby="archive-h">
        <h2 id="archive-h">Archive</h2>
        <p className="muted">Fetching archive…</p>
      </section>
    );
  }

  // Fail-closed: pending setup / API failure renders honestly, never a fake archive.
  if (props.objects.length === 0) {
    const tone: BannerTone = props.error ? "warn" : "info";
    return (
      <section className="panel" id="archive" aria-labelledby="archive-h">
        <h2 id="archive-h">Archive</h2>
        <StatusBanner
          tone={tone}
          heading={
            props.error
              ? uiErrorHeading(props.error)
              : "Setup pending"
          }
          detail={
            props.error
              ? `${props.error.message} (code ${props.error.code})`
              : "The archive appears once the backend is merged and running. Until then this view performs no calls."
          }
        />
        <button type="button" className="btn" onClick={props.onRefresh}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="panel" id="archive" aria-labelledby="archive-h">
      <h2 id="archive-h">Archive</h2>
      <table className="archive-table">
        <thead>
          <tr>
            <th scope="col">File</th>
            <th scope="col">Version</th>
            <th scope="col">Size</th>
            <th scope="col">SHA-256</th>
            <th scope="col">State</th>
            <th scope="col">
              <span className="visually-hidden">Actions</span>Purge rule
            </th>
          </tr>
        </thead>
        <tbody>
          {props.objects.map((object) => (
            <tr key={`${object.objectId}#${object.version}`}>
              <td>{object.name}</td>
              <td>v{object.version}</td>
              <td>{formatSize(object.size)}</td>
              <td title={object.sha256} className="mono">
                {shortSha(object.sha256)}
              </td>
              <td>
                <span className={`badge ${object.state === "AVAILABLE" ? "badge-ok" : "badge-gone"}`}>
                  {object.state}
                </span>
              </td>
              <td className="archive-actions">
                {object.state === "AVAILABLE" ? (
                  <>
                    <button
                      type="button"
                      className="btn"
                      disabled={busyVersion === `${object.objectId}#${object.version}`}
                      onClick={() => void handleDownload(object)}
                    >
                      {busyVersion === `${object.objectId}#${object.version}`
                        ? "Downloading…"
                        : "Download"}
                    </button>
                    <span className="muted rule-caption">{archiveObjectCaption(object.state)}</span>
                  </>
                ) : (
                  <span className="muted rule-caption">{archiveObjectCaption(object.state)}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {local ? <StatusBanner tone={local.tone} heading={local.heading} detail={local.detail} /> : null}
      {props.error && props.objects.length > 0 ? (
        <StatusBanner tone="warn" heading={uiErrorHeading(props.error)} detail="Latest refresh failed; showing last known list." />
      ) : null}
      <p className="muted section-note">
        Deletion happens only after a governed quorum approves one specific request. Downloading
        or filing does not remove anything.
      </p>
      <button type="button" className="btn btn-ghost" onClick={props.onRefresh}>
        Refresh archive
      </button>
    </section>
  );
}
