import { openDB } from 'idb';

const DATABASE_NAME = 'story-app-db';
const DATABASE_VERSION = 2;
const STORE_NAME = 'stories';
const PENDING_STORE = 'pendingStories';

const dbPromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
  upgrade(database, oldVersion) {
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
    if (!database.objectStoreNames.contains(PENDING_STORE)) {
      database.createObjectStore(PENDING_STORE, { keyPath: 'clientId' }); // 🔑 pakai clientId agar unik
    }
  },
});

const Idb = {
  // 📚 Ambil semua cerita tersimpan (online cache)
  async getAllStories() {
    return (await dbPromise).getAll(STORE_NAME);
  },

  // 💾 Simpan/update cerita ke cache utama
  async putStory(story) {
    if (!story || !story.id) return;
    return (await dbPromise).put(STORE_NAME, story);
  },

  // ❌ Hapus cerita dari cache
  async deleteStory(id) {
    return (await dbPromise).delete(STORE_NAME, id);
  },

  // 🕓 Tambah cerita pending (offline upload)
  async addPendingStory(storyData) {
  storyData.clientId = storyData.clientId || crypto.randomUUID(); // ✅ penting
  return (await dbPromise).put(PENDING_STORE, storyData);
},

  // 📤 Ambil semua cerita yang menunggu dikirim ke server
  async getAllPendingStories() {
    return (await dbPromise).getAll(PENDING_STORE);
  },

  // 🧹 Bersihkan semua pending story setelah sukses di-sync
  async clearPendingStories() {
    return (await dbPromise).clear(PENDING_STORE);
  },
};

export default Idb;
