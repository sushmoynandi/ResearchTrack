// Service Worker for ResearchTrack Background Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Listen for incoming background push notifications
self.addEventListener('push', (event) => {
  let data = {}
  try {
    if (event.data) {
      data = event.data.json()
    }
  } catch (err) {
    data = {
      title: 'ResearchTrack Notification',
      message: event.data ? event.data.text() : 'You have a new research update.',
      link: '/',
    }
  }

  const title = data.title || 'ResearchTrack'
  const options = {
    body: data.message || data.body || 'You have a new update from your research advisor or lab.',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.link || data.url || '/',
      timestamp: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open in App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    tag: data.tag || 'researchtrack-notifications',
    renotify: false,
    requireInteraction: false,
    silent: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Handle tapping / clicking the system push notification banner
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      // Otherwise open a new browser window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    })
  )
})
