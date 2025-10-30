import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const HomeView = {
    renderBase({ mapContainer, listContainer }) {
        mapContainer.innerHTML = 'Loading map...';
        listContainer.innerHTML = 'Memuat cerita...';
    },

    renderStories(listContainer, listStory) {
        listContainer.innerHTML = listStory.map((story) => {
            const date = new Date(story.createdAt).toLocaleDateString('id-ID', {
                year: 'numeric', month: 'long', day: 'numeric',
            });
            return `
        <article class="story-card" data-id="${story.id}" tabindex="0">
          <img src="${story.photoUrl}" alt="Foto ${story.name}" class="story-image"/>
          <h3>${story.name}</h3>
          <p>${story.description || '(tidak ada deskripsi)'}</p>
          <small class="story-date">${date}</small>
        </article>
      `;
        }).join('');
    },

    renderMap(mapContainer, listStory) {
        const baseLayers = {
            '🌏 Default': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
            '🌙 Dark': L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'),
        };

        const map = L.map(mapContainer, {
            center: [-2.5489, 118.0149],
            zoom: 5,
            layers: [baseLayers['🌏 Default']],
        });
        L.control.layers(baseLayers).addTo(map);

        const markers = [];

        listStory.forEach((story) => {
            if (story.lat && story.lon) {
                const formattedDate = new Date(story.createdAt).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                });

                const marker = L.marker([story.lat, story.lon]).addTo(map);
                marker.bindPopup(`
                    <div style="min-width:150px; max-width:200px;">
                        <b>${story.name}</b><br>
                        <small>${formattedDate}</small><br>
                        <p style="margin:4px 0;">${story.description || '(tidak ada deskripsi)'}</p>
                        <img 
                        src="${story.photoUrl}" 
                        alt="Foto cerita ${story.name}" 
                        style="
                            width: 100%;
                            max-height: 100px;
                            object-fit: cover;
                            border-radius: 6px;
                            margin-top: 4px;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                        "
                        />
                    </div>
                    `);

                markers.push({ id: story.id, marker });
            }
        });

        return { map, markers };
    },
};

export default HomeView;
