/**
 * Archive view: real file/version/size/digest/state from the vault API,
 * exact-bytes download with object-URL revocation after use, fail-closed pending
 * and error rendering. Rows re-read real state, so an executed purge lands as a
 * sealed row here only when the change is actually observed — never as an
 * optimistic effect.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import {
  downloadVersion,
  saveBlobAndRevoke,
  uiErrorHeading,
  type UiError,
} from "./client-api";
import { CopyButton } from "./copy-button";
import { StatusBanner, type BannerTone } from "./status-banner";
import { DownloadIcon, FileIcon, RefreshIcon, SealIcon } from "./icons";
import type { ArchiveObject } from "./merge-seam";

function shortSha(sha: string): string {
  return sha.length > 12 ? `${sha.slice(0, 12)}…` : sha;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function CopyDigest(props: { sha: string }) {
  return (
    <span className="cell-digest">
      <span className="mono" title={props.sha}>
        {shortSha(props.sha)}
      </span>
      <CopyButton value={props.sha} label="full SHA-256 digest" />
    </span>
  );
}

function SkeletonRows({ count, cells }: { count: number; cells: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, rowIndex) => (
        <tr key={rowIndex} aria-hidden="true">
          {Array.from({ length: cells }).map((_, cellIndex) => (
            <td key={cellIndex}>
              <span className={`skeleton ${cellIndex === 0 ? "skeleton-name" : "skeleton-cell"}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function ArchiveSection(props: {
  objects: ArchiveObject[];
  loading: boolean;
  error: UiError | null;
  onRefresh: () => void;
}) {
  const [busyVersion, setBusyVersion] = useState<string | null>(null);
  const [local, setLocal] = useState<{
    tone: BannerTone;
    heading: string;
    dismissId?: string;
    detail?: string;
  } | null>(null);

  // Observe AVAILABLE → PURGED transitions so the seal animation plays on the
  // actual moment of change, not on every mount of an already-purged row.
  const previousStates = useRef<Map<string, "AVAILABLE" | "PURGED"> | null>(null);
  const [sealedRows, setSealedRows] = useState<string[]>([]);
  useEffect(() => {
    const previous = previousStates.current;
    if (previous) {
      const sealed = props.objects
        .filter((object) => {
          const key = `${object.objectId}#${object.version}`;
          const was = previous.get(key);
          return object.state === "PURGED" && was === "AVAILABLE";
        })
        .map((object) => `${object.objectId}#${object.version}`);
      if (sealed.length > 0) setSealedRows(sealed);
    }
    const next = new Map<string, "AVAILABLE" | "PURGED">();
    for (const object of props.objects) next.set(`${object.objectId}#${object.version}`, object.state);
    previousStates.current = next;
  }, [props.objects]);

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
          dismissId: "archive-download",
          heading: `Saved ${result.filename}`,
          detail: "Temporary link revoked.",
        });
      } else {
        setLocal({
          tone: "error",
          dismissId: "archive-download-error",
          heading: uiErrorHeading(result.error),
          detail: result.error.message,
        });
      }
    } finally {
      setBusyVersion(null);
    }
  }

  if (props.loading && props.objects.length === 0) {
    return (
      <section className="panel" id="archive" aria-labelledby="archive-h">
        <h2 id="archive-h">
          <span className="panel-heading-icon">
            <FileIcon size={18} />
          </span>
          Archive
        </h2>
        <table className="archive-table" aria-busy="true">
          <caption>Fetching the live archive…</caption>
          <thead>
            <tr>
              <th scope="col">File</th>
              <th scope="col">Version</th>
              <th scope="col">Size</th>
              <th scope="col">SHA-256</th>
              <th scope="col">State</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            <SkeletonRows count={2} cells={6} />
          </tbody>
        </table>
      </section>
    );
  }

  // Fail-closed: pending setup / API failure renders honestly, never a fake archive.
  if (props.objects.length === 0) {
    return (
      <section className="panel" id="archive" aria-labelledby="archive-h">
        <h2 id="archive-h">
          <span className="panel-heading-icon">
            <FileIcon size={18} />
          </span>
          Archive
        </h2>
        <StatusBanner
          tone={props.error ? "warn" : "info"}
          heading={props.error ? uiErrorHeading(props.error) : "Setup pending"}
          detail={
            props.error
              ? `${props.error.message} (code ${props.error.code})`
              : "Backend not running yet."
          }
        />
        <button type="button" className="btn btn-ghost" onClick={props.onRefresh}>
          <RefreshIcon size={14} />
          Retry
        </button>
      </section>
    );
  }

  return (
    <section className="panel" id="archive" aria-labelledby="archive-h">
      <div className="section-heading"><h2 id="archive-h">
        <span className="panel-heading-icon">
          <FileIcon size={18} />
        </span>
        Archive
      </h2>
        <button type="button" className={`btn btn-ghost btn-small${props.loading ? " is-busy" : ""}`} disabled={props.loading} onClick={props.onRefresh}>
          <RefreshIcon size={15} /> {props.loading ? "Refreshing…" : "Refresh archive"}
        </button>
      </div>
      <div className="table-scroll">
        <table className="archive-table">
          <caption>Live versions and integrity digests.</caption>
          <thead>
            <tr>
              <th scope="col">File</th>
              <th scope="col">Version</th>
              <th scope="col">Size</th>
              <th scope="col">SHA-256</th>
              <th scope="col">State</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {props.objects.map((object) => {
              const key = `${object.objectId}#${object.version}`;
              const isPurged = object.state === "PURGED";
              return (
                <tr key={key} className={isPurged ? `is-purged${sealedRows.includes(key) ? " row-sealed" : ""}` : undefined}>
                  <td className="cell-file" data-label="File">
                    <span className="cell-file-inner">
                      <span className="muted">
                        <FileIcon size={15} />
                      </span>
                      <span className="cell-file-name" title={object.name}>
                        {object.name}
                      </span>
                    </span>
                  </td>
                  <td className="num" data-label="Version">v{object.version}</td>
                  <td className="num" data-label="Size" title={`${object.size} bytes`}>
                    {formatSize(object.size)}
                  </td>
                  <td data-label="SHA-256">
                    <CopyDigest sha={object.sha256} />
                  </td>
                  <td data-label="State">
                    {isPurged ? (
                      <span className="badge badge-gone">
                        <SealIcon size={12} /> Purged
                      </span>
                    ) : (
                      <span className="badge badge-ok">Available</span>
                    )}
                  </td>
                  <td className="archive-actions" data-label="Action">
                    {isPurged ? <span className="muted">No longer downloadable</span> : (
                      <button
                        type="button"
                        className={`btn btn-ghost${busyVersion === key ? " is-busy" : ""}`}
                        disabled={busyVersion !== null}
                        onClick={() => void handleDownload(object)}
                      >
                        <DownloadIcon size={16} /> {busyVersion === key ? "Saving…" : "Download"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {local ? (
        <StatusBanner tone={local.tone} heading={local.heading} detail={local.detail} dismissId={local.dismissId} />
      ) : null}
      {props.error && props.objects.length > 0 ? (
        <StatusBanner
          tone="warn"
          heading={uiErrorHeading(props.error)}
          detail="Refresh failed — showing the last known list."
          dismissId="archive-refresh-error"
        />
      ) : null}
    </section>
  );
}
