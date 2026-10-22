"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "./display-utils";
import { CheckIcon, ClipboardIcon } from "./icons";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return <span className="copy-control">
    <button type="button" className={`btn btn-copy${status === "copied" ? " is-copied" : ""}`}
      aria-label={status === "copied" ? `${label} copied` : `Copy ${label}`} title={`Copy ${label}`}
      onClick={async () => {
        if (timer.current) clearTimeout(timer.current);
        setStatus(await copyText(value) ? "copied" : "failed");
        timer.current = setTimeout(() => setStatus("idle"), 2500);
      }}>
      {status === "copied" ? <CheckIcon size={14} /> : <ClipboardIcon size={14} />}
      {status === "copied" ? "Copied" : "Copy"}
    </button>
    <span className={status === "failed" ? "copy-error" : "visually-hidden"} role="status">
      {status === "failed" ? "Clipboard unavailable — select and copy the text." : status === "copied" ? `${label} copied.` : ""}
    </span>
  </span>;
}
