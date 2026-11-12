import type { Film, Tone } from "./types.ts";

export const STUDIO_DB_NAME = "miuniverso";
export const STUDIO_DB_VERSION = 2;

export const FILMS_STORE = "films_v2";
export const META_STORE = "studio_meta";
export const CACHE_STORE = "studio_cache";
const LEGACY_STORE = "films";

export const STUDIO_INDEXES = [
  `${FILMS_STORE}.by_updatedAt`,
  `${FILMS_STORE}.by_tone`,
  `${FILMS_STORE}.by_title`,
  `${CACHE_STORE}.by_expiresAt`,
  `${CACHE_STORE}.by_kind`,
] as const;

export type CacheKind = "translation" | "still";

export type IndexedFilmRecord = Film & {
  titleLower: string;
};

export type StudioCacheRecord = {
  key: string;
  kind: CacheKind;
  value: string;
  createdAt: number;
  expiresAt: number;
};

type MetaRecord = {
  key: string;
  value: string;
};

type LegacySaved = {
  films?: Film[];
  activeId?: string;
};

/**
 * Fast bounded in-memory LRU cache (L1 tier before IndexedDB L2).
 */
export class LruCache<K, V> {
  private readonly max: number;
  private readonly map = new Map<K, V>();
  public hits = 0;
  public misses = 0;

  constructor(max = 64) {
    this.max = Math.max(4, max);
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) {
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    this.map.set(key, value);
  }

  delete(key: K): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

export function normalizeTitleKey(title: string): string {
  return title.trim().toLocaleLowerCase("es");
}

export function toIndexedFilmRecord(film: Film): IndexedFilmRecord {
  return {
    ...film,
    titleLower: normalizeTitleKey(film.title),
  };
}

export function fromIndexedFilmRecord(record: IndexedFilmRecord | Film): Film {
  const { titleLower: _ignored, ...rest } = record as IndexedFilmRecord;
  return rest;
}

const l1Cache = new LruCache<string, StudioCacheRecord>(96);

let dbPromise: Promise<IDBDatabase> | null = null;

function hasIndexedDb(): boolean {
  return typeof indexedDB !== "undefined";
}

/**
 * Open (and pool) the IndexedDB v2 database, creating normalized stores + B-tree
 * indexes and migrating any legacy v1 monolithic blob atomically.
 */
export function openStudioDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(STUDIO_DB_NAME, STUDIO_DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      const tx = req.transaction;

      let filmsStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(FILMS_STORE)) {
        filmsStore = db.createObjectStore(FILMS_STORE, { keyPath: "id" });
      } else {
        filmsStore = tx!.objectStore(FILMS_STORE);
      }
      if (!filmsStore.indexNames.contains("by_updatedAt")) {
        filmsStore.createIndex("by_updatedAt", "updatedAt", { unique: false });
      }
      if (!filmsStore.indexNames.contains("by_tone")) {
        filmsStore.createIndex("by_tone", "tone", { unique: false });
      }
      if (!filmsStore.indexNames.contains("by_title")) {
        filmsStore.createIndex("by_title", "titleLower", { unique: false });
      }

      let metaStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(META_STORE)) {
        metaStore = db.createObjectStore(META_STORE, { keyPath: "key" });
      } else {
        metaStore = tx!.objectStore(META_STORE);
      }

      let cacheStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        cacheStore = db.createObjectStore(CACHE_STORE, { keyPath: "key" });
      } else {
        cacheStore = tx!.objectStore(CACHE_STORE);
      }
      if (!cacheStore.indexNames.contains("by_expiresAt")) {
        cacheStore.createIndex("by_expiresAt", "expiresAt", { unique: false });
      }
      if (!cacheStore.indexNames.contains("by_kind")) {
        cacheStore.createIndex("by_kind", "kind", { unique: false });
      }

      // Migrate legacy v1 store ("films" -> "state") seamlessly if present.
      if (tx && db.objectStoreNames.contains(LEGACY_STORE)) {
        const legacy = tx.objectStore(LEGACY_STORE);
        const getReq = legacy.get("state");
        getReq.onsuccess = () => {
          const saved = getReq.result as LegacySaved | undefined;
          if (saved?.films?.length) {
            for (const film of saved.films) {
              filmsStore.put(toIndexedFilmRecord(film));
            }
          }
          if (saved?.activeId) {
            metaStore.put({ key: "activeId", value: saved.activeId } satisfies MetaRecord);
          }
          db.deleteObjectStore(LEGACY_STORE);
        };
      }
    };

    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    req.onerror = () => {
      dbPromise = null;
      reject(req.error ?? new Error("IndexedDB open failed"));
    };
  });

  return dbPromise;
}

/**
 * Load all films ordered by `by_updatedAt` descending via B-tree index cursor,
 * plus the persisted `activeId`.
 */
export async function loadStudioSnapshot(): Promise<{ films: Film[]; activeId: string | null } | null> {
  if (!hasIndexedDb()) return null;
  try {
    const db = await openStudioDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction([FILMS_STORE, META_STORE], "readonly");
      const idx = tx.objectStore(FILMS_STORE).index("by_updatedAt");
      const metaReq = tx.objectStore(META_STORE).get("activeId");
      const films: Film[] = [];

      const cursorReq = idx.openCursor(null, "prev");
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          films.push(fromIndexedFilmRecord(cursor.value as IndexedFilmRecord));
          cursor.continue();
        }
      };

      tx.oncomplete = () => {
        const meta = metaReq.result as MetaRecord | undefined;
        resolve({ films, activeId: meta?.value ?? null });
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return null;
  }
}

/**
 * Query films filtered by `tone` directly through the `by_tone` B-tree index.
 */
export async function queryFilmsByTone(tone: Tone): Promise<Film[]> {
  if (!hasIndexedDb()) return [];
  try {
    const db = await openStudioDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(FILMS_STORE, "readonly");
      const idx = tx.objectStore(FILMS_STORE).index("by_tone");
      const req = idx.getAll(IDBKeyRange.only(tone));
      req.onsuccess = () => {
        const rows = (req.result as IndexedFilmRecord[]).map(fromIndexedFilmRecord);
        rows.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(rows);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Persist a single modified film record + optional activeId without rewriting
 * untouched films (O(1) single-record write).
 */
export async function saveFilmRecord(film: Film, activeId?: string): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const db = await openStudioDb();
    await new Promise<void>((resolve, reject) => {
      const stores = activeId !== undefined ? [FILMS_STORE, META_STORE] : [FILMS_STORE];
      const tx = db.transaction(stores, "readwrite");
      tx.objectStore(FILMS_STORE).put(toIndexedFilmRecord(film));
      if (activeId !== undefined) {
        tx.objectStore(META_STORE).put({ key: "activeId", value: activeId } satisfies MetaRecord);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore quota/private-browsing write errors cleanly.
  }
}

export async function saveActiveId(activeId: string): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const db = await openStudioDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, "readwrite");
      tx.objectStore(META_STORE).put({ key: "activeId", value: activeId } satisfies MetaRecord);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore storage errors.
  }
}

export async function deleteFilmRecord(id: string, nextActiveId?: string): Promise<void> {
  if (!hasIndexedDb()) return;
  try {
    const db = await openStudioDb();
    await new Promise<void>((resolve, reject) => {
      const stores = nextActiveId !== undefined ? [FILMS_STORE, META_STORE] : [FILMS_STORE];
      const tx = db.transaction(stores, "readwrite");
      tx.objectStore(FILMS_STORE).delete(id);
      if (nextActiveId !== undefined) {
        tx.objectStore(META_STORE).put({ key: "activeId", value: nextActiveId } satisfies MetaRecord);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore storage errors.
  }
}

// ── Multi-tier Cache (L1 Memory LRU + L2 IndexedDB `studio_cache`) ──────────

const MAX_L2_CACHE_ENTRIES = 60;

/**
 * Read a cached value by key (checks L1 memory LRU first, then L2 IndexedDB).
 */
export async function getStudioCache(key: string): Promise<string | null> {
  const now = Date.now();
  const mem = l1Cache.get(key);
  if (mem) {
    if (mem.expiresAt > now) return mem.value;
    l1Cache.delete(key);
  }
  if (!hasIndexedDb()) return null;
  try {
    const db = await openStudioDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, "readonly");
      const req = tx.objectStore(CACHE_STORE).get(key);
      req.onsuccess = () => {
        const hit = req.result as StudioCacheRecord | undefined;
        if (!hit || hit.expiresAt <= now) {
          resolve(null);
          return;
        }
        l1Cache.set(key, hit);
        resolve(hit.value);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Store a value in both L1 memory LRU and L2 IndexedDB `studio_cache`,
 * sweeping expired records using the `by_expiresAt` index.
 */
export async function setStudioCache(opts: {
  key: string;
  kind: CacheKind;
  value: string;
  ttlMs: number;
}): Promise<void> {
  const now = Date.now();
  const entry: StudioCacheRecord = {
    key: opts.key,
    kind: opts.kind,
    value: opts.value,
    createdAt: now,
    expiresAt: now + opts.ttlMs,
  };
  l1Cache.set(entry.key, entry);

  if (!hasIndexedDb()) return;
  try {
    const db = await openStudioDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, "readwrite");
      const store = tx.objectStore(CACHE_STORE);
      store.put(entry);

      // Sweep expired entries via the `by_expiresAt` B-tree index.
      const expIdx = store.index("by_expiresAt");
      const sweepReq = expIdx.openCursor(IDBKeyRange.upperBound(now));
      sweepReq.onsuccess = () => {
        const cursor = sweepReq.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // Bound total cache size by evicting soonest-to-expire entries if needed.
      const countReq = store.count();
      countReq.onsuccess = () => {
        const overflow = countReq.result - MAX_L2_CACHE_ENTRIES;
        if (overflow > 0) {
          let removed = 0;
          const evictReq = expIdx.openCursor();
          evictReq.onsuccess = () => {
            const c = evictReq.result;
            if (c && removed < overflow) {
              c.delete();
              removed += 1;
              c.continue();
            }
          };
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore storage quota errors cleanly.
  }
}

export type StudioStorageStats = {
  dbVersion: number;
  indexes: readonly string[];
  l1MemoryItems: number;
  l1Hits: number;
  l1Misses: number;
  l2CacheTotal: number;
  l2Translations: number;
  l2Stills: number;
};

export async function getStudioStorageStats(): Promise<StudioStorageStats> {
  const base: StudioStorageStats = {
    dbVersion: STUDIO_DB_VERSION,
    indexes: STUDIO_INDEXES,
    l1Hits: l1Cache.hits,
    l1Misses: l1Cache.misses,
    l1MemoryItems: l1Cache.size,
    l2CacheTotal: 0,
    l2Translations: 0,
    l2Stills: 0,
  };
  if (!hasIndexedDb()) return base;
  try {
    const db = await openStudioDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(CACHE_STORE, "readonly");
      const store = tx.objectStore(CACHE_STORE);
      const kindIdx = store.index("by_kind");
      const totalReq = store.count();
      const trReq = kindIdx.count(IDBKeyRange.only("translation"));
      const stReq = kindIdx.count(IDBKeyRange.only("still"));
      tx.oncomplete = () => {
        resolve({
          ...base,
          l2CacheTotal: totalReq.result,
          l2Translations: trReq.result,
          l2Stills: stReq.result,
        });
      };
      tx.onerror = () => resolve(base);
    });
  } catch {
    return base;
  }
}

const cacheClearListeners = new Set<() => void>();

export function onStudioCacheCleared(listener: () => void): () => void {
  cacheClearListeners.add(listener);
  return () => {
    cacheClearListeners.delete(listener);
  };
}

export async function clearStudioCache(): Promise<void> {
  l1Cache.clear();
  for (const fn of cacheClearListeners) fn();
  if (!hasIndexedDb()) return;
  try {
    const db = await openStudioDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, "readwrite");
      tx.objectStore(CACHE_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore storage errors.
  }
}

export async function wipeAllStudioDatabase(): Promise<void> {
  l1Cache.clear();
  for (const fn of cacheClearListeners) fn();
  if (!hasIndexedDb()) return;
  try {
    const db = await openStudioDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([FILMS_STORE, META_STORE, CACHE_STORE], "readwrite");
      tx.objectStore(FILMS_STORE).clear();
      tx.objectStore(META_STORE).clear();
      tx.objectStore(CACHE_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore storage errors.
  }
}
