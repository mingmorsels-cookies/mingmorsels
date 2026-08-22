// mingmorsels — Service Worker (Notification Handler)
const SITE_URL = self.location.origin;

// Listen for messages from the main page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, badge, tag } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: icon || '/favicon.ico',
      badge: badge || '/favicon.ico',
      tag: tag || 'ming-morsels-promo',
      renotify: true,
      requireInteraction: false,
      data: { url: SITE_URL }
    });
  }
});

// Listen for Web Push broadcasts from the server
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'Ming Morsels';
      const options = {
        body: data.body || 'You have a new update from Ming Morsels!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'ming-morsels-push',
        data: { url: data.url || SITE_URL }
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
      console.error('Error parsing push data', err);
    }
  }
});

// When user clicks the notification → open the site
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || SITE_URL;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
