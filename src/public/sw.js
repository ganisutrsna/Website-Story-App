/* eslint-disable no-restricted-globals */
const CACHE_NAME = 'ceritakita-v6';
const API_BASE_URL = 'https://story-api.dicoding.dev/v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/styles/styles.css',
  '/manifest.json',
  '/images/logo.png',
  '/images/favicon.png',
  '/app.bundle.js',
];

// ✅ Install – cache semua asset statis
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ✅ Activate – hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    )
  );
  self.clients.claim();
  console.log('✅ SW aktif, tapi tidak memaksa reload');
});

// ✅ Fetch handler dengan fallback aman
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.url.startsWith(API_BASE_URL)) {
    // Network first untuk API
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200) return response;
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clonedResponse));
          return response;
        })
        .catch(() => {
          return new Response(
            JSON.stringify({ error: true, message: 'Offline mode – API unavailable.' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
  } else {
    // Cache first untuk asset statis
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request)
          .then((networkResponse) => {
            const cloned = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
            return networkResponse;
          })
          .catch(() => {
            if (request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            return new Response('', { status: 408, statusText: 'Offline' });
          });
      })
    );
  }
});

// ✅ Push notification
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || 'Cerita Kita';
  const options = {
    body: data.body || 'Ada cerita baru yang menarik untukmu!',
    icon: '/images/logo.png',
    badge: '/images/favicon.png',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ✅ Klik notifikasi
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});

// ✅ Background Sync untuk upload cerita offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-stories') {
    event.waitUntil(syncPendingStories());
  }
});

// ======================================================
// ✅ Fungsi sync offline → online (pakai clientId + notif sukses)
// ======================================================
// ✅ Sinkronisasi offline → online
async function syncPendingStories() {
  const db = await openPendingDB();
  const tx = db.transaction('pendingStories', 'readonly');
  const store = tx.objectStore('pendingStories');

  const stories = await new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  await new Promise((resolve) => (tx.oncomplete = resolve));

  let successCount = 0;

  for (const story of stories) {
    try {
      // 🧠 Pastikan data valid
      if (!story?.description || !story?.token) {
        console.warn('⛔ Data story tidak lengkap, dilewati:', story);
        continue;
      }

      // ✅ Bentuk FormData sesuai API Dicoding
      const formData = new FormData();
      formData.append('description', story.description);

      if (story.photoFile instanceof Blob) {
        formData.append('photo', story.photoFile, 'offline-photo.jpg');
      }

      if (story.lat !== undefined && story.lon !== undefined) {
        formData.append('lat', story.lat);
        formData.append('lon', story.lon);
      }

      const response = await fetch(`${API_BASE_URL}/stories`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${story.token}`,
        },
        body: formData,
      });

      if (response.ok) {
        console.log('✅ Cerita offline berhasil di-sync:', story.description);
        successCount++;

        // 🔥 Pastikan benar-benar hapus dari pendingStories
        const delTx = db.transaction('pendingStories', 'readwrite');
        const delStore = delTx.objectStore('pendingStories');

        // Hapus berdasarkan kecocokan (id atau clientId)
        const cursorReq = delStore.openCursor();
        cursorReq.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const val = cursor.value;
            if (
        story.clientId &&
        val.clientId &&
        val.clientId === story.clientId
      ) {
        cursor.delete(); // ✅ delete langsung
      }
      cursor.continue();
    }
  };

        await new Promise((resolve) => (delTx.oncomplete = resolve));
      } else {
        const resText = await response.text();
        console.warn('⚠️ Gagal sync story (HTTP):', response.status, resText);
      }
    } catch (err) {
      console.error('⚠️ Gagal sync story offline:', err);
    }
  }

  // ✅ Jika ada cerita yang berhasil di-sync, beri notifikasi
  if (successCount > 0) {
    self.registration.showNotification('Cerita Kita', {
      body: `${successCount} cerita kamu berhasil diunggah ke server 🎉`,
      icon: '/images/logo.png',
      badge: '/images/favicon.png',
    });
  }

  db.close();
}



// ======================================================
// ✅ Helper: Buka IndexedDB
// ======================================================
function openPendingDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('story-app-db', 2);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingStories')) {
        db.createObjectStore('pendingStories', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// 🟢 Terima pesan dari client untuk manual sync
self.addEventListener('message', (event) => {
  if (event.data?.action === 'manual-sync') {
    console.log('🔄 Manual sync dari client dijalankan...');
    event.waitUntil(syncPendingStories());
  }
});
