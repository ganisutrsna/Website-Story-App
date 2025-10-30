import { registerUser } from '../../data/api.js';

export default class RegisterPage {
  async render() {
    return `
      <section class="container auth-container">
        <h2>Daftar Akun</h2>
        <form id="register-form">
          <input type="text" id="name" placeholder="Nama" required />
          <input type="email" id="email" placeholder="Email" required />
          <input type="password" id="password" placeholder="Password (min 8 karakter)" required />
          <button type="submit" class="submit-btn">Daftar</button>
        </form>
        <div id="register-spinner" class="spinner hidden" aria-hidden="true"></div>
        <p>Sudah punya akun? <a href="#/login">Login di sini</a></p>
        <p id="register-message"></p>
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

      // tampilkan spinner
      spinner.classList.remove('hidden');
      messageEl.textContent = '';

      const result = await registerUser({ name, email, password });

      // sembunyikan spinner setelah selesai
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
