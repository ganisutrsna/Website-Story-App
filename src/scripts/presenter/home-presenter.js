import HomeModel from '../model/home-model';
import HomeView from '../view/home-view';
import Idb from '../utils/idb.js';

const HomePresenter = {
  async init({ mapContainer, listContainer }) {
    const token = localStorage.getItem('token');
    if (!token) {
      listContainer.innerHTML = '<p class="error">Kamu belum login</p>';
      return;
    }

    HomeView.renderBase({ mapContainer, listContainer });

    const searchInput = document.querySelector('#searchInput');
    this._setupOnlineOfflineIndicator();
    this._setupSearchFeature(searchInput, listContainer, mapContainer);

    try {
      const stories = await HomeModel.getStories(token);

      HomeView.renderStories(listContainer, stories);
      const { map, markers } = HomeView.renderMap(mapContainer, stories);

      stories.forEach((story) => Idb.putStory(story));

      this._stories = stories;
      this._map = map;
      this._markers = markers;

      this._setupCardEvents(listContainer);
    } catch (err) {
      console.warn('⚠️ Tidak bisa ambil data dari API, gunakan data offline');

      const cachedStories = await Idb.getAllStories();
      if (cachedStories.length > 0) {
        HomeView.renderStories(listContainer, cachedStories);
        const { map, markers } = HomeView.renderMap(mapContainer, cachedStories);

        this._stories = cachedStories;
        this._map = map;
        this._markers = markers;

        this._setupCardEvents(listContainer);
      } else {
        listContainer.innerHTML = '<p class="error">Tidak ada data offline tersimpan.</p>';
      }
    }
  },

  // 🎯 Event klik/enter untuk fokus marker
  _setupCardEvents(listContainer) {
    // 🧹 Bersihkan semua event listener lama dengan clone listener function
    if (this._cardClickHandler) {
      listContainer.removeEventListener('click', this._cardClickHandler);
      listContainer.removeEventListener('keydown', this._cardKeyHandler);
    }

    const focusStory = async (card) => {
      try {
        const map = this._map;
        const markers = this._markers || [];
        const found = markers.find((m) => String(m.id) === String(card.dataset.id));

        if (!map || !map._loaded || !found || !found.marker) {
          console.warn('⚠️ Map belum siap atau marker tidak ditemukan.');
          return;
        }

        await new Promise((resolve) => {
          if (map._loaded) resolve();
          else map.whenReady(resolve);
        });

        try { map.invalidateSize(); } catch {}

        const latLng = found.marker.getLatLng?.();
        if (!latLng) {
          console.warn('⚠️ Marker tidak punya koordinat.');
          return;
        }

        map.setView(latLng, 10, { animate: false });
        found.marker.openPopup?.();
      } catch (err) {
        console.error('❌ Gagal fokus ke marker:', err);
      }
    };

    // Simpan handler agar bisa dilepas nanti
    this._cardClickHandler = (e) => {
      const card = e.target.closest('.story-card');
      if (card) focusStory(card);
    };
    this._cardKeyHandler = (e) => {
      if (e.key === 'Enter') {
        const card = e.target.closest('.story-card');
        if (card) focusStory(card);
      }
    };

    listContainer.addEventListener('click', this._cardClickHandler);
    listContainer.addEventListener('keydown', this._cardKeyHandler);
  },

  // 🔍 Pencarian cerita
  _setupSearchFeature(searchInput, listContainer, mapContainer) {
    if (!searchInput) return;

    searchInput.addEventListener('input', async (e) => {
      const query = e.target.value.toLowerCase().trim();
      const stories = this._stories || (await Idb.getAllStories());
      const filtered = stories.filter(
        (story) =>
          story.name.toLowerCase().includes(query) ||
          story.description.toLowerCase().includes(query)
      );

      if (this._map && this._map.remove) {
        try {
          this._map.off();
          this._map.remove();
        } catch (err) {
          console.warn('⚠️ Gagal hapus map lama:', err);
        }
      }

      mapContainer.innerHTML = '';
      HomeView.renderStories(listContainer, filtered);
      const { map, markers } = HomeView.renderMap(mapContainer, filtered);

      this._map = map;
      this._markers = markers;

      this._setupCardEvents(listContainer);
    });
  },

  

  // ⚡ Indikator Online/Offline
  _setupOnlineOfflineIndicator() {
    let indicator = document.querySelector('#networkStatus');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'networkStatus';
      Object.assign(indicator.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        padding: '8px 14px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
        zIndex: '1000',
      });
      document.body.appendChild(indicator);
    }

    const updateStatus = () => {
      if (navigator.onLine) {
        indicator.textContent = '🟢 Online';
        indicator.style.background = 'green';
      } else {
        indicator.textContent = '🔴 Offline';
        indicator.style.background = 'crimson';
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  },
};

export default HomePresenter;
