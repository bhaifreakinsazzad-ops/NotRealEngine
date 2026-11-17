/**
 * Only permit links back into authenticated application pages.
 * `next` is user-controlled and must never resolve to another origin.
 */
const FALLBACK = "/dashboard";
const APP_ROUTES = /^\/(?:admin|dashboard|quotes|orders|reset-password)(?:\/|$)/;

export function safeAuthRedirect(destination: string | null | undefined): string {
  if (typeof destination !== "string") return FALLBACK;
  const candidate = destination.trim();
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(candidate) ||
    /%(?:00|2f|5c)/i.test(candidate)
  ) return FALLBACK;

  try {
    const url = new URL(candidate, "https://notrealengine.invalid");
    if (url.origin !== "https://notrealengine.invalid" || !APP_ROUTES.test(url.pathname)) {
      return FALLBACK;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return FALLBACK;
  }
}
