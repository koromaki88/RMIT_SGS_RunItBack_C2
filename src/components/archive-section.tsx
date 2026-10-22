/**
 * Agent 3. Archive view: real file/version/size/digest/state from Agent 2's API,
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
  copyText,
  type UiError,
} from "./client-api";
import { StatusBanner, type BannerTone } from "./status-banner";
import { archiveObjectCaption } from "./authority-logic";
import { CheckIcon, ClipboardIcon, DownloadIcon, FileIcon, RefreshIcon, SealIcon } from "./icons";
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
  const [copied, setCopied] = useState(false);
  return (
    <span className="cell-digest">
      <button
        type="button"
        className={`btn btn-copy${copied ? " is-copied" : ""}`}
        aria-label={`Copy digest ${props.sha}`}
        title="Copy full SHA-256"
        onClick={async () => {
          if (await copyText(props.sha)) {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1400);
          }
        }}
      >
        {copied ? <CheckIcon size={14} /> : <ClipboardIcon size={14} />}
      </button>
      <span className="mono" title={props.sha}>
        {shortSha(props.sha)}
      </span>
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
          detail: "The temporary link was revoked immediately — nothing lingers in this tab.",
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
              : "The archive appears once the backend is merged and running. Until then this view performs no calls."
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
      <h2 id="archive-h">
        <span className="panel-heading-icon">
          <FileIcon size={18} />
        </span>
        Archive
      </h2>
      <p className="panel-intro">
        Downloading is open to every signed-in member. Removing a version is not a button
        here — it is a request, and only a governed quorum can make it real.
      </p>
      <div className="table-scroll">
        <table className="archive-table">
          <caption>
            Recovery versions with their exact integrity digests. Purged versions cannot
            be downloaded again.
          </caption>
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
                  <td className="cell-file">
                    <span className="cell-file-inner">
                      <span className="muted">
                        <FileIcon size={15} />
                      </span>
                      <span className="cell-file-name" title={object.name}>
                        {object.name}
                      </span>
                    </span>
                  </td>
                  <td className="num">v{object.version}</td>
                  <td className="num" title={`${object.size} bytes`}>
                    {formatSize(object.size)}
                  </td>
                  <td>
                    <CopyDigest sha={object.sha256} />
                  </td>
                  <td>
                    {isPurged ? (
                      <span className="badge badge-gone">
                        <SealIcon size={12} /> Purged
                      </span>
                    ) : (
                      <span className="badge badge-ok">Available</span>
                    )}
                  </td>
                  <td className="archive-actions">
                    {isPurged ? (
                      <span className="rule-caption">{archiveObjectCaption(object.state)}</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={`btn btn-ghost${busyVersion === key ? " is-busy" : ""}`}
                          disabled={busyVersion === key}
                          onClick={() => void handleDownload(object)}
                        >
                          {busyVersion === key ? "Saving…" : "Download"}
                        </button>
                        <span className="rule-caption">{archiveObjectCaption(object.state)}</span>
                      </>
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
          detail="Latest refresh failed; showing the last known list."
          dismissId="archive-refresh-error"
        />
      ) : null}
      <button type="button" className="btn btn-quiet" onClick={props.onRefresh}>
        <RefreshIcon size={14} />
        Refresh archive
      </button>
    </section>
  );
}
