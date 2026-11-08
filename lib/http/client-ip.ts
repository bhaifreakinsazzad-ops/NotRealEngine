/**
 * Extracts client IP from trusted platform proxy headers first (e.g., Vercel / Cloudflare),
 * falling back to the last hop of x-forwarded-for or "unknown" to prevent trivial client spoofing.
 */
export function extractClientIp(headers: Headers): string {
  const realIp =
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (hops.length > 0) {
      return hops[hops.length - 1]!;
    }
  }
  return "unknown";
}
