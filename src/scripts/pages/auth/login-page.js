import { loginUser } from '../../data/api.js';

export default class LoginPage {
  async render() {
    return `
      <section class="container auth-container">
        <h2>Login</h2>
        <form id="login-form">
          <div class="form-group">
            <label for="email">Email:</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              placeholder="Masukkan email kamu" 
              required 
              aria-required="true"
            />
          </div>

          <div class="form-group">
            <label for="password">Kata Sandi:</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              placeholder="Masukkan kata sandi kamu" 
              required 
              aria-required="true"
            />
          </div>

          <button 
            type="submit" 
            class="submit-btn" 
            aria-label="Masuk ke akun">
            Login
          </button>
        </form>

        <div id="login-spinner" class="spinner hidden" aria-hidden="true"></div>
        <p>Belum punya akun? <a href="#/register">Daftar di sini</a></p>
        <p id="login-message" role="alert"></p>
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

      spinner.classList.remove('hidden');
      messageEl.textContent = '';

      const result = await loginUser({ email, password });

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
