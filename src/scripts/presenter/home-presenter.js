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
      this._stories = stories;
      this._map = map;
      this._markers = markers;

      
      stories.forEach((story) => Idb.putStory(story));

      this._setupCardEvents(listContainer);
      this._setupFavoriteButton(listContainer); // tambahan faforit
    } catch (err) {
      console.warn('⚠️ Tidak bisa ambil data API, pakai data dari IndexedDB');

      const cachedStories = await Idb.getAllStories();
      if (cachedStories.length) {
        HomeView.renderStories(listContainer, cachedStories);
        const { map, markers } = HomeView.renderMap(mapContainer, cachedStories);
        this._stories = cachedStories;
        this._map = map;
        this._markers = markers;

        this._setupCardEvents(listContainer);
        this._setupFavoriteButton(listContainer); 
      } else {
        listContainer.innerHTML = '<p class="error">Tidak ada data offline tersimpan.</p>';
      }
    }
  },

  
  _setupFavoriteButton(listContainer) {
    listContainer.addEventListener('click', async (e) => {
      const favBtn = e.target.closest('.fav-btn');
      if (!favBtn) return;

      const storyId = favBtn.dataset.id;
      const story = this._stories.find((s) => String(s.id) === String(storyId));
      if (!story) return;

      try {
        await Idb.saveFavoriteStory(story);
        favBtn.textContent = 'Disimpan';
        favBtn.disabled = true;
        console.log('💾 Story ditambahkan ke favorit:', story);
      } catch (err) {
        console.error('❌ Gagal menyimpan favorit:', err);
      }
    });

    // cek yang sudah jadi favorit 
    this._stories.forEach(async (story) => {
      const isFav = await Idb.isStoryFavorited(story.id);
      if (isFav) {
        const btn = listContainer.querySelector(`.fav-btn[data-id="${story.id}"]`);
        if (btn) {
          btn.textContent = 'Favorit';
          btn.disabled = true;
        }
      }
    });
  },

  
  _setupCardEvents(listContainer) {
    if (this._cardClickHandler) {
      listContainer.removeEventListener('click', this._cardClickHandler);
      listContainer.removeEventListener('keydown', this._cardKeyHandler);
    }

    const focusStory = async (card) => {
      try {
        const map = this._map;
        const markers = this._markers || [];
        const found = markers.find((m) => String(m.id) === String(card.dataset.id));
        if (!map || !map._loaded || !found?.marker) return;
        await new Promise((resolve) => map._loaded ? resolve() : map.whenReady(resolve));

        map.invalidateSize();
        const latLng = found.marker.getLatLng?.();
        if (!latLng) return;
        map.setView(latLng, 10, { animate: false });
        found.marker.openPopup?.();
      } catch (err) {
        console.error('❌ Gagal fokus ke marker:', err);
      }
    };

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

  _setupSearchFeature(searchInput, listContainer, mapContainer) {
    if (!searchInput) return;
    searchInput.addEventListener('input', async (e) => {
      const query = e.target.value.toLowerCase();
      const stories = this._stories || (await Idb.getAllStories());
      const filtered = stories.filter(
        (s) => s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)
      );

      if (this._map?.remove) {
        try { this._map.off(); this._map.remove(); } catch {}
      }

      mapContainer.innerHTML = '';
      HomeView.renderStories(listContainer, filtered);
      const { map, markers } = HomeView.renderMap(mapContainer, filtered);
      this._map = map;
      this._markers = markers;

      this._setupCardEvents(listContainer);
      this._setupFavoriteButton(listContainer); // supaya tetap aktif setelah search
    });
  },

  _setupOnlineOfflineIndicator() {
  let indicator = document.querySelector('#networkStatus');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'networkStatus';
    indicator.className = 'network-status';
    document.body.appendChild(indicator);
  }

  const update = () => {
    if (navigator.onLine) {
      indicator.innerHTML = `<i class="fa-solid fa-circle-check"></i> Online`;
      indicator.classList.remove('offline');
      indicator.classList.add('online');
    } else {
      indicator.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Offline`;
      indicator.classList.remove('online');
      indicator.classList.add('offline');
    }
  };

  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
},

};

export default HomePresenter;
