// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Finance Planner", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Finance Planner", {
      body: payload.body ?? "",
      icon: "/icon",
      badge: "/icon",
      tag: payload.tag ?? "finance-planner",
      data: { url: payload.url ?? "/dashboard" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        const existing = clientList.find(
          (c) => c.url.includes(url) && "focus" in c
        );
        if (existing) return existing.focus();
        return clients.openWindow(url);
      })
  );
});

// ── Cache ─────────────────────────────────────────────────────────────────────
const CACHE_VERSION = "v1";
const STATIC_CACHE = `fp-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `fp-dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/manifest.json",
  "/icon",
  "/apple-icon",
  "/offline"
];

const STATIC_PREFIXES = ["/_next/static/"];

function isStaticAsset(url) {
  return (
    STATIC_ASSETS.includes(new URL(url).pathname) ||
    STATIC_PREFIXES.some((prefix) => new URL(url).pathname.startsWith(prefix))
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip Next.js internal routes and API routes
  if (
    url.pathname.startsWith("/_next/webpack-hmr") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  if (isStaticAsset(request.url)) {
    // Cache-first for static assets
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              caches
                .open(STATIC_CACHE)
                .then((cache) => cache.put(request, response.clone()));
            }
            return response;
          })
      )
    );
    return;
  }

  // Network-first for app pages with offline fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          caches
            .open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, response.clone()));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Offline fallback for navigation requests
        if (request.mode === "navigate") {
          return caches.match("/offline");
        }
        return new Response("Offline", { status: 503 });
      })
  );
});
