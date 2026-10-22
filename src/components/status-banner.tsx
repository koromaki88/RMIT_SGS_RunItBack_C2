/**
 * Agent 3. Single shared banner for every honest error / status message in the app.
 * Categories come from client-api.ts (the contract's error table). A banner is
 * always real observed state — never a placeholder pretending success.
 */

export type BannerTone = "info" | "warn" | "error" | "success";

export function StatusBanner(props: {
  tone: BannerTone;
  heading: string;
  detail?: string;
}) {
  return (
    <div className={`banner banner-${props.tone}`} role="status">
      <strong>{props.heading}</strong>
      {props.detail ? <p>{props.detail}</p> : null}
    </div>
  );
}
