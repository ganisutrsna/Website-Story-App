import HomePage from '../pages/home/home-page';
import AboutPage from '../pages/about/about-page';
import DetailPage from '../pages/detail/detail-page';
import AddPage from '../pages/add/add-page';
import LoginPage from '../pages/auth/login-page';
import RegisterPage from '../pages/auth/register-page';
import PendingPage from '../pages/pending/pending-page';
import FavoritePage from '../pages/favorite/favorite-page';

const routes = {
  '/': HomePage,
  '/home': HomePage,
  '/about': AboutPage,
  '/login': LoginPage,
  '/register': RegisterPage,
  '/detail/:id': DetailPage,
  '/add': AddPage,
  '/pending': PendingPage,
  '/favorite': FavoritePage,
};

export default routes;
