self.addEventListener('install', (e) => {
  console.log('[Service Worker] Installed');
});

self.addEventListener('fetch', (e) => {
  // For now, this just passes network requests through normally.
  // We can add offline caching later.
});