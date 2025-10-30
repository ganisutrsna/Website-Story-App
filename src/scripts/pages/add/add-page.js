import { addStory } from '../../data/api';
import CONFIG from '../../config';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Idb from '../../utils/idb.js'; // 🧩 Tambahan: untuk cache offline

export default class AddPage {
  async render() {
    return `
      <main id="mainContent" tabindex="-1">
        <section class="container add-story-page">
          <img src="assets/icons/logo.svg" alt="" aria-hidden="true" />

          <h1 class="page-title">Tambah Cerita Baru</h1>

          <form id="addStoryForm" class="add-story-form" aria-label="Form tambah cerita baru">
            <label for="description">Deskripsi:</label>
            <textarea 
              id="description" 
              placeholder="Tuliskan ceritamu..." 
              required 
              aria-required="true"
              aria-describedby="descHelp"
            ></textarea>
            <small id="descHelp" class="sr-only">Tuliskan deskripsi cerita yang ingin kamu bagikan.</small>

            <label for="photo">Foto:</label>
            <input 
              type="file" 
              id="photo" 
              accept="image/*" 
              required 
              aria-required="true"
              aria-describedby="photoHelp"
            />
            <small id="photoHelp" class="sr-only">Pilih gambar dari galeri atau ambil foto langsung dari kamera.</small>
            
            <!-- Opsi ambil gambar dari kamera bawaan -->
            <div class="camera-section" aria-label="Ambil foto dari kamera">
              <button type="button" id="openCameraBtn" class="btn-secondary">Ambil Foto dari Kamera</button>
              <video 
                id="cameraStream" 
                autoplay 
                playsinline 
                style="display:none; width:100%; border-radius:8px; margin-top:8px;"
                aria-label="Tampilan kamera langsung"
              ></video>
              <div class="camera-actions">
                <button type="button" id="captureBtn" style="display:none;" class="btn-secondary">
                  Tangkap Gambar
                </button>
                <button type="button" id="cancelCameraBtn" style="display:none;" class="btn-secondary cancel-btn">
                  Tutup kamera
                </button>
              </div>
              <canvas id="cameraCanvas" style="display:none;" aria-hidden="true"></canvas>
            </div>

            <div class="location-section" aria-label="Pilih lokasi cerita di peta">
              <label for="useLocation">
                <input type="checkbox" id="useLocation" />
                Gunakan lokasi saya
              </label>
              <div 
                id="map" 
                class="map-container" 
                role="region" 
                aria-label="Peta untuk memilih lokasi cerita"
              ></div>
            </div>

            <button type="submit" class="submit-btn">
              <span class="btn-text">Kirim Cerita</span>
              <span class="loading-spinner" style="display:none;"></span>
            </button>
          </form>

          <div id="feedback" class="feedback" role="status" aria-live="polite"></div>
        </section>
      </main>
    `;
  }

  async afterRender() {
    const form = document.querySelector('#addStoryForm');
    const descriptionInput = document.querySelector('#description');
    const photoInput = document.querySelector('#photo');
    const feedback = document.querySelector('#feedback');
    const useLocation = document.querySelector('#useLocation');
    const submitBtn = document.querySelector('.submit-btn');
    const btnText = document.querySelector('.btn-text');
    const spinner = document.querySelector('.loading-spinner');

    let lat = null;
    let lon = null;
    let map, marker;

    // peta Leaflet
    map = L.map('map').setView([-2.5489, 118.0149], 5);
    const baseLayers = {
      'Default': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }),
      'Satellite': L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
      }),
    };
    baseLayers.Default.addTo(map);
    L.control.layers(baseLayers).addTo(map);

    map.on('click', (e) => {
      lat = e.latlng.lat;
      lon = e.latlng.lng;
      if (marker) map.removeLayer(marker);
      marker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(`📍 Lokasi dipilih<br>${lat.toFixed(4)}, ${lon.toFixed(4)}`)
        .openPopup();
    });

    // lokasi pengguna
    useLocation.addEventListener('change', (e) => {
      if (e.target.checked && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            lat = pos.coords.latitude;
            lon = pos.coords.longitude;
            map.setView([lat, lon], 13);
            if (marker) map.removeLayer(marker);
            marker = L.marker([lat, lon])
              .addTo(map)
              .bindPopup(`📍 Lokasi kamu<br>${lat.toFixed(4)}, ${lon.toFixed(4)}`)
              .openPopup();
          },
          () => alert('Tidak bisa mendapatkan lokasi kamu')
        );
      } else {
        lat = null;
        lon = null;
        if (marker) map.removeLayer(marker);
      }
    });

    // fitur kamera
    const openCameraBtn = document.querySelector('#openCameraBtn');
    const captureBtn = document.querySelector('#captureBtn');
    const video = document.querySelector('#cameraStream');
    const canvas = document.querySelector('#cameraCanvas');
    const cancelCameraBtn = document.querySelector('#cancelCameraBtn');
    let stream;

    openCameraBtn.addEventListener('click', async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.style.display = 'block';
        captureBtn.style.display = 'inline-block';
        cancelCameraBtn.style.display = 'inline-block';
        openCameraBtn.style.display = 'none';
        feedback.textContent = 'Kamera aktif';
        feedback.className = 'feedback info';
      } catch (err) {
        feedback.textContent = 'Tidak bisa mengakses kamera.';
        feedback.className = 'feedback error';
      }
    });

    captureBtn.addEventListener('click', () => {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        const file = new File([blob], 'camera-photo.png', { type: 'image/png' });
        const dt = new DataTransfer();
        dt.items.add(file);
        photoInput.files = dt.files;

        feedback.textContent = 'Foto dari kamera sudah ditangkap!';
        feedback.className = 'feedback success';
      });

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
      video.style.display = 'none';
      captureBtn.style.display = 'none';
      cancelCameraBtn.style.display = 'none';
      openCameraBtn.style.display = 'inline-block';
    });

    cancelCameraBtn.addEventListener('click', () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }

      video.style.display = 'none';
      captureBtn.style.display = 'none';
      cancelCameraBtn.style.display = 'none';
      openCameraBtn.style.display = 'inline-block';

      feedback.textContent = 'Kamera ditutup.';
      feedback.className = 'feedback info';
    });

    // 🟢 Submit handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const description = descriptionInput.value.trim();
  const photoFile = photoInput.files[0];

  if (!description || !photoFile) {
    feedback.textContent = 'Deskripsi dan foto wajib diisi!';
    feedback.className = 'feedback error';
    return;
  }

  submitBtn.disabled = true;
  spinner.style.display = 'inline-block';
  btnText.textContent = 'Mengirim...';

  try {
    const result = await addStory({ description, photoFile, lat, lon });
    feedback.textContent = '✅ Cerita berhasil dikirim!';
    feedback.className = 'feedback success';
    form.reset();
    if (marker) map.removeLayer(marker);
    setTimeout(() => (window.location.hash = '#/'), 1500);
  } catch {
    // Simpan offline
    await Idb.addPendingStory({
      description,
      photoFile,
      lat,
      lon,
      createdAt: new Date().toISOString(),
      token: localStorage.getItem('token'),
      clientId: crypto.randomUUID(),
    });

    feedback.textContent =
      '📦 Cerita disimpan offline dan akan di-sync otomatis saat online.';
    feedback.className = 'feedback warning';

    // 🟢 Daftarkan background sync (jika tersedia)
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.sync.register('sync-stories');
        console.log('📡 Background sync "sync-stories" terdaftar');
      } catch (err) {
        console.warn('⚠️ Gagal daftar background sync, fallback manual');
        navigator.serviceWorker.controller?.postMessage({ action: 'manual-sync' });
      }
    } else {
      // Fallback kalau browser tidak dukung SyncManager
      console.log('⚠️ Browser tidak dukung SyncManager, pakai manual sync');
      navigator.serviceWorker.controller?.postMessage({ action: 'manual-sync' });
    }
  } finally {
    submitBtn.disabled = false;
    spinner.style.display = 'none';
    btnText.textContent = 'Kirim Cerita';
  }
});

// 🟢 Jangan trigger manual-sync saat online, biarkan SW yang atur
window.addEventListener('online', () => {
  console.log('🌐 Online kembali — SW akan handle sync otomatis.');
});


    // matiin kamera kalo pindah halaman
    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
        feedback.textContent = 'Kamera dimatikan karena kamu berpindah halaman.';
        feedback.className = 'feedback info';
      }
    };

    window.addEventListener('online', async () => {
      console.log('🌐 Koneksi kembali online, memulai manual sync...');
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ action: 'manual-sync' });
      }
    });
    


    window.addEventListener('beforeunload', stopCamera);
    window.addEventListener('hashchange', stopCamera);

    // // 🟢 Sinkronisasi otomatis ketika kembali online
    // window.addEventListener('online', async () => {
    //   const pendingStories = await Idb.getAllPendingStories();
    //   if (pendingStories.length > 0) {
    //     feedback.textContent = `🔄 Mengirim ${pendingStories.length} cerita yang tertunda...`;
    //     feedback.className = 'feedback info';

    //     for (const story of pendingStories) {
    //       const res = await addStory(story);
    //       if (!res.error) {
    //         feedback.textContent = '✅ Cerita offline berhasil dikirim!';
    //       }
    //     }

    //     await Idb.clearPendingStories();
    //     feedback.textContent = '✅ Semua cerita offline berhasil disinkronkan!';
    //     feedback.className = 'feedback success';
    //   }
    // });
  }
}
