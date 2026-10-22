/**
 * Agent 3. Single shared banner for every honest error / status message.
 * Tones carry meaning; the icon is drawn, roles are set for assistive tech,
 * and messages stay on screen until dismissed — never auto-erased.
 */

"use client";

import { useState } from "react";
import { CheckIcon, CloseIcon, LockIcon, ShieldIcon } from "./icons";
import type { BannerTone } from "./status-banner-types";

export type { BannerTone };

export function StatusBanner(props: {
  tone: BannerTone;
  heading: string;
  detail?: string;
  /** uid for the dismiss button's label; omit to disable dismissal */
  dismissId?: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const isError = props.tone === "error";
  const Icon = props.tone === "success" ? CheckIcon : isError ? CloseIcon : props.tone === "warn" ? LockIcon : ShieldIcon;

  return (
    <div
      className={`banner banner-${props.tone}`}
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
    >
      <strong>
        <span className="banner-icon">
          <Icon size={15} />
        </span>
        {props.heading}
      </strong>
      {props.detail ? <p>{props.detail}</p> : null}
      {props.dismissId ? (
        <button
          type="button"
          className="banner-dismiss"
          aria-label="Dismiss message"
          onClick={() => setDismissed(true)}
        >
          <CloseIcon size={14} />
        </button>
      ) : null}
    </div>
  );
}
