import { getStoryById } from '../../data/api';
import { getUrlId } from '../../routes/url-parser';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// perbaikan marker peta
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
      container.innerHTML = '<p>Gagal memuat data.</p>';
      return;
    }

    container.innerHTML = `
      <article>
        <h2>${story.name}</h2>
        <img src="${story.photoUrl}" alt="${story.name} poster" style="max-width:300px">
        <p>${story.description}</p>
        <p>Dipost pada: ${new Date(story.createdAt).toLocaleString()}</p>
        <div id="detail-map" style="height:300px"></div>
      </article>
    `;

    if (story.lat && story.lon) {
      const map = L.map('detail-map').setView([story.lat, story.lon], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      L.marker([story.lat, story.lon]).addTo(map).bindPopup(`${story.name}`).openPopup();
    }
  }
}

export default DetailPage;
