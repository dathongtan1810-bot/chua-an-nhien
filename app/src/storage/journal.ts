/** Nhật ký an lạc lưu IndexedDB (fallback bộ nhớ nếu không có IndexedDB). */
export type JournalKind = 'incense' | 'meditation' | 'fortune' | 'lantern' | 'bell' | 'beads' | 'bow' | 'fish' | 'mo';

export interface JournalEntry {
  id?: number;
  at: string; // ISO
  kind: JournalKind;
  /** Chi tiết: số nén, số phút, id quẻ + chủ đề, lời nguyện… */
  detail: Record<string, string | number>;
}

const DB = 'chua-an-nhien';
const STORE = 'journal';
let dbp: Promise<IDBDatabase | null> | null = null;
const memory: JournalEntry[] = [];

function open(): Promise<IDBDatabase | null> {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
          os.createIndex('at', 'at');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbp;
}

export async function addEntry(e: JournalEntry): Promise<void> {
  const db = await open();
  if (!db) {
    memory.push({ ...e, id: memory.length + 1 });
    return;
  }
  await new Promise<void>((res) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(e);
    tx.oncomplete = () => res();
    tx.onerror = () => res();
  });
}

export async function listEntries(limit = 200): Promise<JournalEntry[]> {
  const db = await open();
  if (!db) return [...memory].reverse().slice(0, limit);
  return new Promise((res) => {
    const out: JournalEntry[] = [];
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).index('at').openCursor(null, 'prev');
    req.onsuccess = () => {
      const c = req.result;
      if (c && out.length < limit) {
        out.push(c.value as JournalEntry);
        c.continue();
      } else res(out);
    };
    req.onerror = () => res(out);
  });
}

export async function clearJournal(): Promise<void> {
  memory.length = 0;
  const db = await open();
  if (!db) return;
  await new Promise<void>((res) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => res();
    tx.onerror = () => res();
  });
}

/** Chỉ dùng cho test. */
export function _resetJournalForTest(): void {
  dbp = null;
  memory.length = 0;
}
