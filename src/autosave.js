// Guardado automático en IndexedDB (con respaldo en localStorage).
const DB_NAME = 'creador3d';
const STORE = 'autosave';
const KEY = 'current';
const LS_KEY = 'creador3d.autosave';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('Sin IndexedDB'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function saveAutosave(text) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(text, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return { ok: true };
  } catch {
    try {
      localStorage.setItem(LS_KEY, text);
      return { ok: true, fallback: true };
    } catch (err) {
      return { ok: false, error: err };
    }
  }
}

export async function loadAutosave() {
  try {
    const db = await openDB();
    const text = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (text) return text;
  } catch { /* seguimos con localStorage */ }
  try {
    return localStorage.getItem(LS_KEY);
  } catch {
    return null;
  }
}

export async function clearAutosave() {
  try {
    const db = await openDB();
    await new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch { /* nada */ }
  try { localStorage.removeItem(LS_KEY); } catch { /* nada */ }
}
