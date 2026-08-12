self.addEventListener('push', function(event) {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: data.url || '/' },
        vibrate: [100, 50, 100],
      }),
      // Home-screen badge while the app is fully backgrounded/closed — the
      // service worker only knows a push arrived, not an accurate pending
      // count, so this sets a generic non-zero badge. The moment the app is
      // next opened, components/NavBadges.js recomputes the real per-section
      // count and overwrites this with the accurate number. Added Aug 12
      // 2026 alongside the in-app badge sync — see NavBadges.js comment.
      self.registration.setAppBadge ? self.registration.setAppBadge(1).catch(() => {}) : Promise.resolve(),
    ])
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
})

