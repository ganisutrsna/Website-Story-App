import { loginUser } from '../../data/api.js';

export default class LoginPage {
  async render() {
    return `
      <section class="container auth-container">
        <h2>Login</h2>
        <form id="login-form">
          <input type="email" id="email" placeholder="Email" required />
          <input type="password" id="password" placeholder="Password" required />
          <button type="submit" class="submit-btn">Login</button>
        </form>
        <div id="login-spinner" class="spinner hidden" aria-hidden="true"></div>
        <p>Belum punya akun? <a href="#/register">Daftar di sini</a></p>
        <p id="login-message"></p>
      </section>
    `;
  }

  async afterRender() {
    const form = document.querySelector('#login-form');
    const messageEl = document.querySelector('#login-message');
    const spinner = document.querySelector('#login-spinner');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.querySelector('#email').value;
      const password = document.querySelector('#password').value;

      // tampilkan spinner
      spinner.classList.remove('hidden');
      messageEl.textContent = '';

      const result = await loginUser({ email, password });

      // sembunyikan spinner setelah selesai
      spinner.classList.add('hidden');

      if (!result.error) {
        localStorage.setItem('authToken', result.loginResult.token);
        localStorage.setItem('userName', result.loginResult.name);
        messageEl.textContent = 'Login berhasil! Mengalihkan ke beranda...';
        messageEl.style.color = 'green';
        setTimeout(() => (window.location.hash = '#/'), 1500);
      } else {
        messageEl.textContent = result.message;
        messageEl.style.color = 'red';
      }
    });
  }
}
