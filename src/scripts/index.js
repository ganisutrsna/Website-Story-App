//import css
import '../styles/styles.css';
import '../styles/favorite.css';
import '../styles/auth.css';



import App from './pages/app';

document.addEventListener('DOMContentLoaded', () => {
  const app = new App({
    content: document.querySelector('#main-content'),
    drawerButton: document.querySelector('#drawer-button'),
    navigationDrawer: document.querySelector('#navigation-drawer'),
  });

  
  app.renderPage().catch((error) => {
    console.error('Gagal merender halaman awal:', error);
  });

  
  window.addEventListener('hashchange', async () => {
    try {
      
      const currentHash = location.hash;
      if (app.lastRenderedHash !== currentHash) {
        app.lastRenderedHash = currentHash;
        await app.renderPage();
      }
    } catch (error) {
      console.error('Gagal merender ulang halaman:', error);
    }
  });
});
