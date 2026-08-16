const DB_NAME = 'ntarei-checkin';
// If this ever needs to change, add matching logic in onupgradeneeded below
// that migrates existing records forward — never one that recreates or
// clears the store, or every tablet's saved attendees would be lost on
// next launch.
const DB_VERSION = 1;
const STORE_NAME = 'attendees';

let dbPromise = null;

function openDatabase(indexedDBImpl = globalThis.indexedDB) {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDBImpl.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'record_id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function withStore(mode, callback, indexedDBImpl) {
  return openDatabase(indexedDBImpl).then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const result = callback(store);

        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export function putRecord(record, indexedDBImpl) {
  return withStore(
    'readwrite',
    (store) => {
      store.put(record);
    },
    indexedDBImpl
  );
}

export function getAllRecords(indexedDBImpl) {
  return openDatabase(indexedDBImpl).then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

export function countRecords(indexedDBImpl) {
  return openDatabase(indexedDBImpl).then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

export function clearAllRecords(indexedDBImpl) {
  return withStore(
    'readwrite',
    (store) => {
      store.clear();
    },
    indexedDBImpl
  );
}

// Exposed for tests that need a fresh connection against a fresh fake-indexeddb instance.
export function _resetConnectionForTests() {
  dbPromise = null;
}
