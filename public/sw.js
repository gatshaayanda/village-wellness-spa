const CACHE_PREFIX = "village-wellness-spa-";
const CACHE_NAME = "village-wellness-spa-shell-v2";
const STATIC_CACHE = "village-wellness-spa-static-v2";
const NEXT_CACHE = "village-wellness-spa-next-v2";
const APP_SHELL = ["/", "/treatments", "/book", "/queue", "/offline", "/icon.svg", "/manifest.webmanifest"];
const PUBLIC_ROUTES = new Set(["/", "/treatments", "/book", "/queue", "/offline"]);

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(APP_SHELL.map((path) => cache.add(path)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith(CACHE_PREFIX) && ![CACHE_NAME, STATIC_CACHE, NEXT_CACHE].includes(key))
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const candidate = event.notification.data && event.notification.data.link;
  let destination;
  try {
    destination = new URL(typeof candidate === "string" ? candidate : "/account", self.location.origin);
    if (destination.origin !== self.location.origin) destination = new URL("/account", self.location.origin);
  } catch {
    destination = new URL("/account", self.location.origin);
  }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      if (client.url !== destination.href && typeof client.navigate === "function") {
        try { await client.navigate(destination.href); } catch { /* Open a new window below if navigation fails. */ }
      }
      if (typeof client.focus === "function") return client.focus();
    }
    return self.clients.openWindow(destination.href);
  })());
});

function cacheablePublicResponse(response) {
  if (!response || !response.ok || response.type === "opaque") return false;
  const control = response.headers.get("Cache-Control") || "";
  return !/private|no-store|no-cache/i.test(control);
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
  }
}

async function networkFirstPublic(request, pathname) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (cacheablePublicResponse(response) && !request.url.includes("?") && PUBLIC_ROUTES.has(pathname)) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request) || await cache.match(pathname);
    return cached || await caches.match("/offline") || new Response("You are offline. Reconnect to continue.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  let url;
  try { url = new URL(request.url); } catch { return; }
  if (url.origin !== self.location.origin) return;

  // Never cache authenticated pages, admin workspaces, account data or API responses.
  if (url.pathname === "/account" || url.pathname.startsWith("/account/")
    || url.pathname === "/admin" || url.pathname.startsWith("/admin/")
    || url.pathname === "/api" || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    if (!PUBLIC_ROUTES.has(url.pathname)) return;
    event.respondWith(networkFirstPublic(request, url.pathname));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith((async () => {
      const cache = await caches.open(NEXT_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (cacheablePublicResponse(response)) {
        await cache.put(request, response.clone());
        await trimCache(NEXT_CACHE, 180);
      }
      return response;
    })());
    return;
  }

  const isPublicAsset = ["/images/", "/fonts/"].some((prefix) => url.pathname.startsWith(prefix))
    || /\.(?:css|woff2?|ttf|otf|png|jpe?g|webp|svg|ico|avif)$/i.test(url.pathname);
  if (isPublicAsset) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (cacheablePublicResponse(response)) {
        await cache.put(request, response.clone());
        await trimCache(STATIC_CACHE, 120);
      }
      return response;
    })());
  }
});
