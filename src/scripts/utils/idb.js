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
      database.createObjectStore(PENDING_STORE, { keyPath: 'clientId' }); // pakai clientId agar unik
    }
  },
});

const Idb = {
  
  async getAllStories() {
    return (await dbPromise).getAll(STORE_NAME);
  },

  
  async putStory(story) {
    if (!story || !story.id) return;
    return (await dbPromise).put(STORE_NAME, story);
  },

  
  async deleteStory(id) {
    return (await dbPromise).delete(STORE_NAME, id);
  },

  
  async addPendingStory(storyData) {
    storyData.clientId = storyData.clientId || crypto.randomUUID();
    const db = await dbPromise;
    const tx = db.transaction(PENDING_STORE, 'readwrite');
    await tx.store.put(storyData);
    await tx.done;
  },

  
  async getAllPendingStories() {
    return (await dbPromise).getAll(PENDING_STORE);
  },

  
  async clearPendingStories() {
    return (await dbPromise).clear(PENDING_STORE);
  },

  async deletePendingStory(clientId) {
    const db = await dbPromise;
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
    console.log('Menghapus story sesuai dengan key:', keyToDelete, 'clientId:', clientId);

    await store.delete(keyToDelete);
    await tx.done;

    return true;
  },

};

export default Idb;
