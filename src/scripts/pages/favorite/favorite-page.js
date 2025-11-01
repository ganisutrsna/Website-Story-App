import Idb from '../../utils/idb';

export default class FavoritePage {
  async render() {
    return `
      <section class="container">
        <h2>Cerita Favorit</h2>
        <p>Berikut adalah daftar cerita yang kamu simpan ke favorit.</p>
        <div id="favorite-list" class="favorite-list"></div>
      </section>
    `;
  }

  async afterRender() {
    const listContainer = document.querySelector('#favorite-list');

    try {
      // Ambil semua data favorit dari IndexedDB
      const favorites = await Idb.getAllFavoriteStories();

      if (!favorites || !favorites.length) {
        listContainer.innerHTML = `
          <p>Kamu belum menambahkan cerita ke favorit.</p>
        `;
        return;
      }

      // daftar cerita favorit
      listContainer.innerHTML = favorites
        .map(
          (story) => `
          <article class="favorite-item" data-id="${story.id}">
            <img 
              src="${story.photoUrl || '/images/fallback.jpg'}" 
              alt="Gambar cerita ${story.name || '(tanpa judul)'}" 
              class="fav-img"
              style="max-width:250px; border-radius:8px;"
            >
            <h3>${story.name || '(Tanpa Judul)'}</h3>
            <p>${story.description || '-'}</p>
            <div class="fav-actions">
              
              <button 
                class="delete-btn" 
                data-id="${story.id}" 
                aria-label="Hapus ${story.name} dari favorit">
                Hapus Favorite
              </button>
            </div>
          </article>
        `
        )
        .join('');

      
      document.querySelectorAll('.delete-btn').forEach((btn) =>
        btn.addEventListener('click', async (e) => {
          const id = e.target.dataset.id;
          if (!confirm('Hapus cerita ini dari favorit?')) return;

          try {
            await Idb.deleteFavoriteStory(id);
            const item = e.target.closest('.favorite-item');
            if (item) item.remove();

            if (!document.querySelectorAll('.favorite-item').length) {
              listContainer.innerHTML = `
                <p>Tidak ada cerita favorit lagi</p>
              `;
            }

            console.log('✅ Cerita dihapus dari favorit:', id);
          } catch (err) {
            console.error('❌ Gagal hapus cerita favorit:', err);
            alert('Terjadi kesalahan saat menghapus cerita.');
          }
        })
      );
    } catch (err) {
      console.error('❌ Gagal memuat daftar favorit:', err);
      listContainer.innerHTML = `
        <p>Gagal memuat cerita favorit. Silakan coba lagi nanti.</p>
      `;
    }
  }
}
