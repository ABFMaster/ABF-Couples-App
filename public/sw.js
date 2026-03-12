self.addEventListener('push', function(event) {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' },
      vibrate: [100, 50, 100],
    })
  )
  if (navigator.setAppBadge) { navigator.setAppBadge(1) }
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  )
  if (navigator.clearAppBadge) { navigator.clearAppBadge() }
})

self.addEventListener('activate', function(event) {
  if (navigator.clearAppBadge) { navigator.clearAppBadge() }
})
