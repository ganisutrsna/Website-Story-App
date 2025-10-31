import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #navList = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;
    this.#navList = document.getElementById('nav-list');

    this._setupDrawer();
    this._setupAuthNav();
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      const isOpen = this.#navigationDrawer.classList.toggle('open');
      this.#drawerButton.setAttribute('aria-expanded', isOpen);
    });

    document.body.addEventListener('click', (event) => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#navigationDrawer.classList.remove('open');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.#navigationDrawer.classList.remove('open');
    });
  }

  _setupAuthNav() {
    const updateNav = () => {
      const token = localStorage.getItem('authToken');
      const logoutLink = document.getElementById('logout-link');

      if (!token) {
        if (logoutLink) logoutLink.parentElement.remove();
        const loginItem = this.#navList.querySelector('a[href="#/login"]');
        if (!loginItem) {
          const li = document.createElement('li');
          li.innerHTML = `<a href="#/login" aria-label="Menu Login">Login</a>`;
          this.#navList.appendChild(li);
        }
      } else {
        if (!logoutLink) {
          const li = document.createElement('li');
          li.innerHTML = `<a href="#" id="logout-link" class="logout-link" aria-label="Logout">Logout</a>`;
          this.#navList.appendChild(li);

          // 🟠 Tambahkan unsubscribe otomatis saat logout
          document.getElementById('logout-link').addEventListener('click', async (e) => {
            e.preventDefault();

            // Hapus token
            localStorage.removeItem('authToken');

            // 🔕 Unsubscribe Push Notification
            if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.ready;
              const sub = await reg.pushManager.getSubscription();
              if (sub) {
                try {
                  await fetch('https://story-api.dicoding.dev/v1/notifications/subscribe', {
                    method: 'DELETE',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
                    },
                    body: JSON.stringify({ endpoint: sub.endpoint }),
                  });
                } catch (err) {
                  console.warn('⚠️ Gagal hapus subscription di server:', err);
                }

                await sub.unsubscribe();
                console.log('🔕 Push subscription dihapus saat logout');
                localStorage.setItem('notifEnabled', 'false');
              }
            }

            // Redirect ke login
            window.location.hash = '#/login';
            updateNav();
          });
        }

        const loginItem = this.#navList.querySelector('a[href="#/login"]');
        if (loginItem) loginItem.parentElement.remove();
      }
    };

    updateNav();
    window.addEventListener('hashchange', updateNav);
  }

  async renderPage() {
    const url = getActiveRoute();
    const Page = routes[url];
    const token = localStorage.getItem('authToken');

    const publicRoutes = ['#/login', '#/register'];
    if (!token && !publicRoutes.includes(window.location.hash)) {
      window.location.hash = '#/login';
      return;
    }

    if (!Page) {
      this.#content.innerHTML = `<section class="container"><h2>404 Page Not Found</h2></section>`;
      return;
    }

    const page = new Page();

    const renderContent = async () => {
      this.#content.classList.add('fade-out');
      await new Promise((resolve) => setTimeout(resolve, 150));

      this.#content.innerHTML = await page.render();
      await page.afterRender();

      this.#content.classList.remove('fade-out');
      this.#content.classList.add('fade-in');
      setTimeout(() => this.#content.classList.remove('fade-in'), 150);

      // 🔔 Sembunyikan tombol notifikasi di halaman login/register
      const notifBtn = document.getElementById('notifToggleBtn');
      if (notifBtn) {
        if (publicRoutes.includes(window.location.hash)) {
          notifBtn.style.display = 'none';
        } else {
          notifBtn.style.display = 'inline-block';
        }
      }
    };

    if (document.startViewTransition) {
      document.startViewTransition(() => renderContent());
    } else {
      await renderContent();
    }
  }
}

export default App;

// =============================================================
// SKIP TO CONTENT
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
  const skipLink = document.querySelector('.skip-to-content');
  const mainContent = document.querySelector('#mainContent');

  if (skipLink && mainContent) {
    skipLink.addEventListener('click', (event) => {
      event.preventDefault();
      mainContent.focus();
    });
  }
});

// =============================================================
// SERVICE WORKER & PUSH NOTIFICATION SETUP
// =============================================================
if ('serviceWorker' in navigator && 'PushManager' in window) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker terdaftar:', registration);

      const swReady = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('🔔 Izin notifikasi diberikan');
        subscribeUserToPush(swReady);
      } else {
        console.warn('⚠️ Izin notifikasi ditolak');
      }
    } catch (error) {
      console.error('❌ Gagal registrasi SW:', error);
    }
  });
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data;
    if (data?.type === 'SYNC_COMPLETED') {
      console.log('🔄 Sinkronisasi offline selesai:', data.message);

      if (window.location.hash === '#/' || window.location.hash === '#/home') {
        if (window.appInstance && typeof window.appInstance.renderPage === 'function') {
          window.appInstance.renderPage();
        } else {
          window.location.reload();
        }
      }
      alert(data.message);
    }
  });
}

// =============================================================
// PUSH NOTIFICATION FUNCTIONS
// =============================================================
async function subscribeUserToPush(registration) {
  const vapidPublicKey = 'BCCs2eonMI-6H2ctvFaWg-UYdDv387Vno_bzUzALpB442r2lCnsHmtrx8biyPi_E-1fSGABK_Qs_GlvPoJJqxbk';
  const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
    console.log('🔔 Push subscription dibuat:', subscription);

    await sendSubscriptionToServer(subscription);
  } catch (err) {
    console.error('❌ Gagal berlangganan push:', err);
  }
}

async function sendSubscriptionToServer(subscription) {
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.warn('⚠️ Tidak ada token, user belum login.');
    return;
  }

  const subscriptionData = subscription.toJSON();

  try {
    const response = await fetch('https://story-api.dicoding.dev/v1/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        endpoint: subscriptionData.endpoint,
        keys: {
          p256dh: subscriptionData.keys.p256dh,
          auth: subscriptionData.keys.auth,
        },
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Gagal mengirim subscription ke server.');
    console.log('✅ Subscription berhasil dikirim ke server:', result);
  } catch (error) {
    console.error('❌ Gagal mengirim subscription ke server:', error);
  }
}

// =============================================================
// TOGGLE NOTIFICATION BUTTON
// =============================================================
const notifToggleBtn = document.getElementById('notifToggleBtn');

if (notifToggleBtn) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();

    const savedStatus = localStorage.getItem('notifEnabled') === 'true';
    const isActive = !!subscription || savedStatus;
    updateNotifButton(isActive);

    notifToggleBtn.addEventListener('click', async () => {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Izin notifikasi belum diberikan.');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const currentSub = await reg.pushManager.getSubscription();

      if (currentSub) {
        // 🔕 Unsubscribe
        const unsubscribed = await currentSub.unsubscribe();
        if (unsubscribed) {
          console.log('❎ Notifikasi dinonaktifkan');
          alert('Push Notification dinonaktifkan.');

          await fetch('https://story-api.dicoding.dev/v1/notifications/subscribe', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            },
            body: JSON.stringify({ endpoint: currentSub.endpoint }),
          });

          updateNotifButton(false);
          localStorage.setItem('notifEnabled', 'false');
        }
      } else {
        // 🔔 Subscribe
        await subscribeUserToPush(reg);
        console.log('✅ Notifikasi diaktifkan');
        alert('Push Notification diaktifkan!');
        updateNotifButton(true);
        localStorage.setItem('notifEnabled', 'true');
      }
    });
  });
}

function updateNotifButton(isActive) {
  const btn = document.getElementById('notifToggleBtn');
  if (!btn) return;
  btn.textContent = isActive ? '🔕 Nonaktifkan Notifikasi' : '🔔 Aktifkan Notifikasi';
  btn.classList.toggle('active', isActive);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
