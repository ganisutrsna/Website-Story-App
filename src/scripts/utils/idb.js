import { openDB } from 'idb';

const DATABASE_NAME = 'story-app-db';
let DATABASE_VERSION = 2; // starting version
const STORE_NAME = 'stories';
const PENDING_STORE = 'pendingStories';
const FAVORITE_STORE = 'favoriteStories';

let _cachedDb = null;

/**
 * Buka DB versi tertentu dan buat object stores yang diperlukan di upgrade.
 * @param {number} version
 */
async function _openWithUpgrade(version) {
  return openDB(DATABASE_NAME, version, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(PENDING_STORE)) {
        db.createObjectStore(PENDING_STORE, { keyPath: 'clientId' });
      }
      if (!db.objectStoreNames.contains(FAVORITE_STORE)) {
        db.createObjectStore(FAVORITE_STORE, { keyPath: 'id' });
      }
    },
  });
}

/**
 * Pastikan DB memiliki semua object store yang kita butuhkan.
 * Jika ada yang hilang, reopen DB dengan version+1 untuk memicu upgrade.
 */
async function getDb() {
  if (_cachedDb) return _cachedDb;

  // Coba buka dengan versi yang kita tahu
  let db;
  try {
    db = await _openWithUpgrade(DATABASE_VERSION);
  } catch (err) {
    // Jika gagal buka (tidak mungkin biasa), rethrow
    throw err;
  }

  // Jika ada object store yang hilang (mis. karena DB sudah ada dan upgrade tidak dijalankan),
  // lakukan reopen dengan bump version untuk menjalankan upgrade callback.
  const missing = [];
  if (!db.objectStoreNames.contains(STORE_NAME)) missing.push(STORE_NAME);
  if (!db.objectStoreNames.contains(PENDING_STORE)) missing.push(PENDING_STORE);
  if (!db.objectStoreNames.contains(FAVORITE_STORE)) missing.push(FAVORITE_STORE);

  if (missing.length > 0) {
    // tutup db lalu buka ulang dengan version+1
    try {
      db.close();
    } catch (e) {}
    DATABASE_VERSION += 1;
    db = await _openWithUpgrade(DATABASE_VERSION);
  }

  _cachedDb = db;
  return db;
}

const Idb = {
  
  async getAllStories() {
    const db = await getDb();
    return db.getAll(STORE_NAME);
  },

  async putStory(story) {
    if (!story || !story.id) return;
    const db = await getDb();
    return db.put(STORE_NAME, story);
  },

  async deleteStory(id) {
    const db = await getDb();
    return db.delete(STORE_NAME, id);
  },

 
  async addPendingStory(storyData) {
    storyData.clientId = storyData.clientId || crypto.randomUUID();
    const db = await getDb();
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    await tx.store.put(storyData);
    await tx.done;
  },

  async getAllPendingStories() {
    const db = await getDb();
    return db.getAll(PENDING_STORE);
  },

  async clearPendingStories() {
    const db = await getDb();
    return db.clear(PENDING_STORE);
  },

  async deletePendingStory(clientId) {
    const db = await getDb();
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    const store = tx.objectStore(PENDING_STORE);

    const allItems = await store.getAll();
    const allKeys = await store.getAllKeys();

    const index = allItems.findIndex((item) => item.clientId === clientId);

    if (index === -1) {
      console.warn('⚠️ Tidak ditemukan story dengan clientId:', clientId);
      await tx.done;
      return false;
    }

    const keyToDelete = allKeys[index];
    console.log('🗑 Menghapus story pending dengan key:', keyToDelete, 'clientId:', clientId);

    await store.delete(keyToDelete);
    await tx.done;

    return true;
  },

  // tambahan untuk idb favorit
  async saveFavoriteStory(story) {
    if (!story || !story.id) return;
    const db = await getDb();
    const tx = db.transaction(FAVORITE_STORE, 'readwrite');
    await tx.store.put(story);
    await tx.done;
    console.log('💾 Story disimpan ke favorit:', story);
  },

  async getAllFavoriteStories() {
    const db = await getDb();
    return db.getAll(FAVORITE_STORE);
  },

  async deleteFavoriteStory(id) {
    const db = await getDb();
    const tx = db.transaction(FAVORITE_STORE, 'readwrite');
    await tx.store.delete(id);
    await tx.done;
    console.log('🗑 Story dihapus dari favorit:', id);
  },

  async isStoryFavorited(id) {
    const db = await getDb();
    const story = await db.get(FAVORITE_STORE, id);
    return !!story;
  },
};

export default Idb;
