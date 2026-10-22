/**
 * Authored inline icon set. One consistent stroke weight and geometry,
 * rendered from currentColor so context sets the color. No icon libraries, no
 * emoji-as-icons (craft rule: icons are drawn). Keep viewBox 24 and stroke 1.7.
 */

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function svgProps(props: IconProps): SVGProps<SVGSVGElement> {
  const { size = 16, ...rest } = props;
  return {
    xmlns: "http://www.w3.org/2000/svg",
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    focusable: "false" as const,
    ...rest,
  };
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="5" y="11" width="14" height="9" rx="1.6" />
      <path d="M8 11V8a4 4 0 0 1 8 0" />
      <circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 3.5l7 2.5v5.2c0 4.6-3 7.9-7 9.3-4-1.4-7-4.7-7-9.3V6l7-2.5z" />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.4" />
    </svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M12 4v10.5" />
      <path d="M7.5 10.5L12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M19 12a7 7 0 1 1-2.05-4.95" />
      <path d="M19 4.5V8h-3.5" />
    </svg>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <rect x="8" y="6" width="12" height="15" rx="1.6" />
      <path d="M15 6V4.6A1.6 1.6 0 0 0 13.4 3H5.6A1.6 1.6 0 0 0 4 4.6v12.8A1.6 1.6 0 0 0 5.6 19H7" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M5 12.5L10 17l9-10" />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function FileIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <path d="M6 3.5h8L19 8.5V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5A1.5 1.5 0 0 1 6.5 3.5z" />
      <path d="M13.5 3.5V9H19" />
    </svg>
  );
}

export function QuorumIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="8" cy="8.5" r="2.8" />
      <circle cx="16.5" cy="9.5" r="2.3" />
      <path d="M3 20c.4-2.6 2.4-4.3 5-4.3 1.2 0 2.3.4 3.2 1" />
      <path d="M13.5 19c.6-1.6 2-2.6 3.7-2.6 1.6 0 3 .9 3.8 2.3" />
    </svg>
  );
}

export function SealIcon(props: IconProps) {
  return (
    <svg {...svgProps(props)}>
      <circle cx="12" cy="10" r="5.5" />
      <path d="M9.3 10l1.9 1.9 3.5-3.8" />
      <path d="M9 15.5L7.5 21l4.5-2.2L16.5 21 15 15.5" />
    </svg>
  );
}
