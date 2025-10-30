import HomePresenter from '../../presenter/home-presenter';

export default class HomePage {
  async render() {
  return `
    <main id="mainContent" tabindex="-1">
      <section class="container">
        <h1 class="page-title">Cerita Sekitar Kita</h1>
        <a href="#/add" class="btn-add">Tambah Cerita</a>

        <!-- 🔍 Input pencarian -->
        <input 
          type="text" 
          id="searchInput" 
          placeholder="Cari cerita berdasarkan nama atau deskripsi..." 
          aria-label="Cari cerita"
          class="search-input"
        />

        <div id="map" class="map-container"></div>
        <div id="stories-list" class="stories-grid"></div>
      </section>
    </main>
  `;
}

  async afterRender() {
    const mapContainer = document.querySelector('#map');
    const listContainer = document.querySelector('#stories-list');
    HomePresenter.init({ mapContainer, listContainer });
  }
}
