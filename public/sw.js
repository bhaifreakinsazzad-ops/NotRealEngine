/* NotRealEngine — Safe Public-Only Service Worker (v1)
 * Security boundary:
 * - Caches ONLY safe static public assets and the /offline fallback page.
 * - NEVER caches authenticated pages (/dashboard, /admin, /quotes, /orders),
 *   auth routes (/login, /signup, /forgot-password, /reset-password, /auth),
 *   or any /api/* requests.
 */

const CACHE_NAME = "nre-public-shell-v2";
const PRECACHE_URLS = ["/offline", "/pwa-192x192.png", "/pwa-512x512.png", "/apple-touch-icon.png"];

const PRIVATE_PATH_PREFIXES = [
  "/api/",
  "/dashboard",
  "/admin",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth",
  "/quotes",
  "/orders",
  "/checkout",
];

function isPrivatePath(pathname) {
  return PRIVATE_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/") || (prefix.endsWith("/") && pathname.startsWith(prefix))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.headers.has("authorization")) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPrivatePath(url.pathname)) return;

  // Navigation requests: network-first with safe /offline fallback (never cache HTML pages)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedOffline = await caches.match("/offline");
        return (
          cachedOffline ||
          new Response("You appear to be offline. Reconnect to access NotRealEngine.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      })
    );
    return;
  }

  // Safe static assets only (immutable production Next chunks, fonts, icons)
  const isNextStatic = url.pathname.startsWith("/_next/static/");
  const isStaticAsset =
    isNextStatic ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2");

  if (!isStaticAsset) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const cacheControl = (response.headers.get("cache-control") || "").toLowerCase();
        const isAllowedNextChunk = !isNextStatic || cacheControl.includes("immutable");
        if (
          !response ||
          response.status !== 200 ||
          response.type !== "basic" ||
          !isAllowedNextChunk ||
          cacheControl.includes("private") ||
          cacheControl.includes("no-store") ||
          cacheControl.includes("no-cache")
        ) {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return response;
      });
    })
  );
});
