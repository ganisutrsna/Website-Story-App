import { registerUser } from '../../data/api.js';

export default class RegisterPage {
  async render() {
    return `
      <section class="container auth-container">
        <h2>Daftar Akun</h2>
        <form id="register-form">
          <div class="form-group">
            <label for="name">Nama:</label>
            <input 
              type="text" 
              id="name" 
              name="name" 
              placeholder="Masukkan nama lengkap kamu" 
              required 
              aria-required="true"
            />
          </div>

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
              placeholder="Minimal 8 karakter" 
              required 
              aria-required="true"
            />
          </div>

          <button 
            type="submit" 
            class="submit-btn" 
            aria-label="Buat akun baru">
            Daftar
          </button>
        </form>

        <div id="register-spinner" class="spinner hidden" aria-hidden="true"></div>
        <p>Sudah punya akun? <a href="#/login">Login di sini</a></p>
        <p id="register-message" role="alert"></p>
      </section>
    `;
  }

  async afterRender() {
    const form = document.querySelector('#register-form');
    const messageEl = document.querySelector('#register-message');
    const spinner = document.querySelector('#register-spinner');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.querySelector('#name').value;
      const email = document.querySelector('#email').value;
      const password = document.querySelector('#password').value;

      spinner.classList.remove('hidden');
      messageEl.textContent = '';

      const result = await registerUser({ name, email, password });

      spinner.classList.add('hidden');

      if (!result.error) {
        messageEl.textContent = 'Registrasi berhasil! Silakan login.';
        messageEl.style.color = 'green';
        setTimeout(() => (window.location.hash = '#/login'), 2000);
      } else {
        messageEl.textContent = result.message;
        messageEl.style.color = 'red';
      }
    });
  }
}
