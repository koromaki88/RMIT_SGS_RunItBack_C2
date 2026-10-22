/** Presentation data only. Never use a display name to decide authorization. */
export function validateDisplayName(value: unknown): string {
  if (typeof value !== "string") throw new Error("Display name must be text.");
  const name = value.trim().normalize("NFC");
  if (!name || name.length > 80 || /[\p{Cc}\p{Cf}]/u.test(name)) {
    throw new Error("Enter a display name of 1–80 characters without control characters.");
  }
  return name;
}
