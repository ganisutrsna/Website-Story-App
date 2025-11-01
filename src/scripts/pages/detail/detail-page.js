import { getStoryById } from '../../data/api';
import { getUrlId } from '../../routes/url-parser';
import Idb from '../../utils/idb';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// konfigurasi ikon peta
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

class DetailPage {
  async render() {
    return `
      <section id="detail" aria-live="polite"></section>
    `;
  }

  async afterRender() {
    const id = getUrlId();
    const container = document.getElementById('detail');
    if (!id) {
      container.innerHTML = '<p>ID tidak ditemukan di URL.</p>';
      return;
    }

    const story = await getStoryById(id);
    if (!story) {
      container.innerHTML = '<p>Gagal memuat data cerita.</p>';
      return;
    }

    container.innerHTML = `
      <article>
        <h2>${story.name}</h2>
        <img 
          src="${story.photoUrl}" 
          alt="${story.name}" 
          style="max-width:300px; border-radius:8px;" 
        >
        <p>${story.description}</p>
        <p>Dipost pada: ${new Date(story.createdAt).toLocaleString()}</p>
        <button id="fav-btn" class="submit-btn">💖 Simpan ke Favorit</button>
        <div id="detail-map" style="height:300px; margin-top:20px;"></div>
      </article>
    `;

    // 🗺 tampilkan peta
    if (story.lat && story.lon) {
      const map = L.map('detail-map').setView([story.lat, story.lon], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      L.marker([story.lat, story.lon]).addTo(map).bindPopup(`${story.name}`).openPopup();
    }

    // 💾 tombol simpan ke favorit
    const favBtn = document.getElementById('fav-btn');

    // cek apakah sudah difavoritkan
const isFavorited = await Idb.isStoryFavorited(story.id);
if (isFavorited) {
  favBtn.textContent = '✅ Sudah di Favorit';
  favBtn.disabled = true;
}

    favBtn.addEventListener('click', async () => {
      try {
        // simpan data ke IndexedDB
        await Idb.saveFavoriteStory(story);
        favBtn.textContent = '✅ Tersimpan di Favorit';
        favBtn.disabled = true;
        console.log('💾 Cerita disimpan ke favorit:', story);
        alert('Cerita berhasil disimpan ke Favorit!');
      } catch (err) {
        console.error('❌ Gagal simpan ke favorit:', err);
        alert('Terjadi kesalahan saat menyimpan ke favorit.');
      }
    });
  }
}

export default DetailPage;
