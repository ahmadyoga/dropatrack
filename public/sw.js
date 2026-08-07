// Minimal service worker — no caching, just makes the site installable as a PWA
// (installed PWAs get materially better background/wake treatment than a browser tab).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
