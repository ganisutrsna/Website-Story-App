import HomePage from '../pages/home/home-page';
import AboutPage from '../pages/about/about-page';
import DetailPage from '../pages/detail/detail-page';
import AddPage from '../pages/add/add-page';
import LoginPage from '../pages/auth/login-page';
import RegisterPage from '../pages/auth/register-page';

const routes = {
  '/': HomePage,
  '/home': HomePage,
  '/about': AboutPage,
  '/login': LoginPage,
  '/register': RegisterPage,
  '/detail/:id': DetailPage,
  '/add': AddPage,
};

export default routes;
