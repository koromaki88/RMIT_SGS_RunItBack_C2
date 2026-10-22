/**
 * Display utilities: relative time phrasing for the frozen manifest
 * window (expiry is a governed deadline, so it must be scannable, not a raw
 * ISO string) and clipboard access with a graceful refusal.
 * Pure logic where possible; the clipboard path returns a boolean result.
 */

export function relativeWindow(iso: string, now: Date = new Date()): {
  text: string;
  /** minutes until expiry if in the future; negative when past */
  minutes: number | null;
} {
  const parsed = new Date(iso).getTime();
  if (Number.isNaN(parsed)) {
    return { text: iso, minutes: null };
  }
  const deltaMs = parsed - now.getTime();
  const minutes = Math.round(deltaMs / 60_000);
  const absMinutes = Math.abs(minutes);

  if (deltaMs < 0) {
    if (absMinutes < 60) return { text: "expired", minutes };
    const hours = Math.round(absMinutes / 60);
    if (hours < 24) return { text: `expired ${hours}h ago`, minutes };
    const days = Math.round(hours / 24);
    return { text: `expired ${days}d ago`, minutes };
  }

  if (minutes < 1) return { text: "expires in <1m", minutes };
  if (minutes < 60) return { text: `expires in ${minutes}m`, minutes };
  const hours = Math.round(minutes / 60);
  if (hours < 24) return { text: `expires in ${hours}h`, minutes };
  const days = Math.round(hours / 24);
  return { text: `expires in ${days}d`, minutes };
}

export function fullTimestamp(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 19) + " UTC";
  } catch {
    return iso;
  }
}

export async function copyText(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
