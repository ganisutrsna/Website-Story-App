export default class AboutPage {
  async render() {
    return `
      <section class="container about-page">
        <h1 class="page-title">Tentang Aplikasi</h1>
        <p class="about-description">
          Cerita-cerita ini akan tersimpan dalam bentuk arsip narasi yang dapat diakses kembali kapan saja, baik oleh publik maupun secara privat sesuai preferensi pengguna. 
          Aplikasi ini menggunakan teknologi <em>Single Page Application (SPA)</em> dengan dukungan Web API dan prinsip aksesibilitas sesuai standar <em>WCAG</em>.
        </p>
      </section>
    `;
  }

  async afterRender() {
    // Tidak perlu ada JS tambahan untuk halaman ini
  }
}
