/** Same open-redirect guard as the existing app. */
export function safeNext(next: string | null | undefined, fallback = "/home"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\") || next.startsWith("/verify/id-card")) return fallback;
  return next;
}
