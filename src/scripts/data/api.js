import CONFIG from '../config.js';

// Endpoint API
const ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  STORY_DETAIL: (id) => `${CONFIG.BASE_URL}/stories/${id}`,
};


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

async function savePendingStory(story) {
  const db = await openPendingDB();
  const tx = db.transaction('pendingStories', 'readwrite');
  const store = tx.objectStore('pendingStories');
  const clientId = crypto.randomUUID();
  await store.add({ ...story, clientId, createdAt: Date.now() });
  await tx.done;
  db.close();
}



export async function registerUser({ name, email, password }) {
  try {
    const res = await fetch(ENDPOINTS.REGISTER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) throw new Error('Gagal register');
    return await res.json();
  } catch (err) {
    console.error('registerUser error:', err);
    return { error: true, message: err.message };
  }
}


export async function loginUser({ email, password }) {
  try {
    const res = await fetch(ENDPOINTS.LOGIN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) throw new Error('Gagal login, salah memasukkan username atau password');
    const json = await res.json();

    if (json.loginResult?.token) {
      localStorage.setItem('token', json.loginResult.token);
      localStorage.setItem('userName', json.loginResult.name || '');
    }

    return json;
  } catch (err) {
    console.error('loginUser error:', err);
    return { error: true, message: err.message };
  }
}


export async function getStories({ withLocation = false } = {}) {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Token tidak ditemukan. Silakan login dulu.');

    const locationParam = withLocation ? '?location=1' : '';
    const res = await fetch(`${ENDPOINTS.STORIES}${locationParam}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Gagal memuat cerita');
    const json = await res.json();

    console.log('📡 getStories', json);
    return json.listStory || [];
  } catch (err) {
    console.error('getStories error:', err);
    return [];
  }
}


export async function getStoryById(id) {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Token tidak ditemukan');

    const res = await fetch(ENDPOINTS.STORY_DETAIL(id), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) throw new Error('Gagal memuat detail cerita');
    const json = await res.json();

    return json.story || null;
  } catch (err) {
    console.error('getStoryById error:', err);
    return null;
  }
}

// Tambah cerita + Offline Sync Support
export async function addStory({ description, photoFile, lat, lon }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return { error: true, message: 'Token tidak ditemukan. Silakan login.' };
  }

  const formData = new FormData();
  formData.append('description', description);
  if (photoFile) formData.append('photo', photoFile);
  if (lat !== undefined && lat !== null) formData.append('lat', lat);
  if (lon !== undefined && lon !== null) formData.append('lon', lon);

  // Cek koneksi — jika offline, simpan ke IndexedDB
  if (!navigator.onLine) {
    try {
      // Konversi foto dulu ke blob sebelum buka transaksi
      let photoBlob = null;
      if (photoFile) {
        const arrayBuffer = await photoFile.arrayBuffer();
        photoBlob = new Blob([arrayBuffer], { type: photoFile.type });
      }

      const db = await openPendingDB();
      const tx = db.transaction('pendingStories', 'readwrite');
      const store = tx.objectStore('pendingStories');

      const clientId = crypto.randomUUID(); // ID unik untuk setiap cerita offline

      await store.add({
        id: Date.now(),
        clientId,
        description,
        photoFile: photoBlob,
        lat,
        lon,
        token,
        isSynced: false,
        createdAt: Date.now(),
      });



      tx.oncomplete = () => db.close();

      console.log('Cerita disimpan offline dan akan di-sync otomatis');

      // Daftarkan background sync
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('sync-stories');
        console.log('Background sync "sync-stories" terdaftar');
      }

      return {
        error: false,
        message: 'Kamu sedang offline. Cerita akan dikirim saat online kembali.',
        offline: true,
      };
    } catch (err) {
      console.error('Gagal menyimpan data offline:', err);
      return { error: true, message: 'Gagal menyimpan cerita offline.' };
    }
  }


  // kalo online, langsung kirim ke API
  try {
    const res = await fetch(ENDPOINTS.STORIES, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    const json = await res.clone().json().catch(() => ({}));

    // kalo respons-nya buatan SW (offline)
    if (json?.message?.includes('Offline mode')) {
      console.warn('Offline mode terdeteksi, simpan ke IndexedDB...');
      await savePendingStory({ description, photoFile, lat, lon, token });
      return { error: false, message: 'Cerita disimpan offline.' };
    }


    if (!res.ok) throw new Error('Gagal menambah cerita');

    console.log('Cerita berhasil dikirim online:', json);
    return json;

  } catch (err) {
    console.error('addStory error:', err);
    return { error: true, message: err.message };
  }
}
