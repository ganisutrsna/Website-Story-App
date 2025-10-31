import Idb from '../../utils/idb';

export default class PendingPage {
  async render() {
    return `
      <section class="container">
        <h2>Cerita Offline (Pending)</h2>
        <p>Berikut daftar cerita yang belum dikirim karena kamu sedang offline.</p>
        <div id="pending-list" class="pending-list"></div>
        <button id="sync-now-btn" class="submit-btn">Sinkronkan Sekarang</button>
      </section>
    `;
  }

  async afterRender() {
    const listContainer = document.querySelector('#pending-list');
    const syncBtn = document.querySelector('#sync-now-btn');

    const pendingStories = await Idb.getAllPendingStories();

    if (!pendingStories.length) {
      listContainer.innerHTML = `<p>Tidak ada cerita yang pending</p>`;
      syncBtn.style.display = 'none';
      return;
    }

    // tampilkan daftar cerita pending
    listContainer.innerHTML = pendingStories
      .map(
        (story) => `
        <article class="pending-item" data-clientid="${story.clientId}">
          <p><strong>Deskripsi:</strong> ${story.description}</p>
          ${
            story.photoFile
              ? `<p><strong>Foto:</strong> <em>Tersimpan offline</em></p>`
              : ''
          }
          <button class="delete-btn" data-id="${story.clientId}">Hapus</button>
        </article>
      `
      )
      .join('');

    // fungsiohapus data pending dari IndexedDB
    document.querySelectorAll('.delete-btn').forEach((btn) =>
      btn.addEventListener('click', async (e) => {
        const clientId = e.target.dataset.id;
        if (!clientId) return;

        if (!confirm('Yakin mau hapus cerita ini dari penyimpanan offline?')) return;

        try {
          await Idb.deletePendingStory(clientId); 
          const item = e.target.closest('.pending-item');
          if (item) item.remove(); 

          // kalau sudah tidak ada pending lagi, tampilkan pesan
          if (!document.querySelectorAll('.pending-item').length) {
            listContainer.innerHTML = `<p>Tidak ada cerita yang pending 🎉</p>`;
            syncBtn.style.display = 'none';
          }

          console.log('Cerita pending berhasil dihapus:', clientId);
        } catch (err) {
          console.error('Gagal hapus pending story:', err);
          alert('Gagal menghapus cerita offline.');
        }
      })
    );

    
    syncBtn.addEventListener('click', async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration.active) {
            registration.active.postMessage({ action: 'manual-sync' });
            alert('Sinkronisasi sedang dijalankan di background...');
          } else {
            alert('Service Worker belum aktif.');
          }
        } catch (err) {
          console.error('Gagal trigger sync:', err);
          alert('Gagal memulai sinkronisasi.');
        }
      } else {
        alert('Browser tidak mendukung Service Worker.');
      }
    });
  }
}
