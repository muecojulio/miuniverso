import { getStudioCache, onStudioCacheCleared, setStudioCache } from "./db-indexed.ts";
import { sanitizeTextInput } from "./security.ts";

const TRANSLATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const inFlightTranslations = new Map<string, Promise<string>>();

onStudioCacheCleared(() => {
  inFlightTranslations.clear();
});

function translationCacheKey(query: string): string {
  return `tr:es-en:${query.toLocaleLowerCase("es")}`;
}

/**
 * Translate the background description for the image model.
 * Uses two-tier cache (L1 LRU + L2 IndexedDB `studio_cache`) in browser runtimes,
 * deduplicates concurrent identical calls, and falls back gracefully on errors.
 */
export async function translateBackground(
  text: string,
  signal?: AbortSignal,
  opts?: { cache?: boolean },
): Promise<string> {
  if (signal?.aborted) throw new DOMException("Cancelado", "AbortError");
  const original = sanitizeTextInput(text, 2400).trim();
  if (!original) return original;

  // MyMemory accepts at most 500 bytes per request; avoid splitting a UTF-8 character.
  let query = "";
  const encoder = new TextEncoder();
  for (const character of original) {
    if (encoder.encode(query + character).length > 480) break;
    query += character;
  }

  const useCache = opts?.cache ?? typeof indexedDB !== "undefined";
  const cacheKey = translationCacheKey(query);

  if (useCache) {
    const hit = await getStudioCache(cacheKey);
    if (hit) {
      if (signal?.aborted) throw new DOMException("Cancelado", "AbortError");
      return hit + original.slice(query.length);
    }
    const existing = inFlightTranslations.get(cacheKey);
    if (existing && !signal) {
      const shared = await existing;
      return shared + original.slice(query.length);
    }
  }

  const runFetch = async (): Promise<string> => {
    const url = new URL("https://api.mymemory.translated.net/get");
    url.searchParams.set("q", query);
    url.searchParams.set("langpair", "es|en");
    const timeout = AbortSignal.timeout(5000);
    const response = await fetch(url, {
      referrerPolicy: "no-referrer",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    });
    if (!response.ok) return query;
    const body = (await response.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: unknown };
    };
    const translated = body.responseData?.translatedText;
    if (body.responseStatus !== 200 || typeof translated !== "string" || !translated.trim()) {
      return query;
    }
    const clean = sanitizeTextInput(translated.trim(), 1200);
    if (useCache && clean) {
      void setStudioCache({
        key: cacheKey,
        kind: "translation",
        value: clean,
        ttlMs: TRANSLATION_TTL_MS,
      });
    }
    return clean;
  };

  try {
    if (useCache && !signal) {
      const pending = runFetch().finally(() => {
        inFlightTranslations.delete(cacheKey);
      });
      inFlightTranslations.set(cacheKey, pending);
      const translatedPrefix = await pending;
      return translatedPrefix + original.slice(query.length);
    }
    const translatedPrefix = await runFetch();
    return translatedPrefix + original.slice(query.length);
  } catch {
    if (signal?.aborted) throw new DOMException("Cancelado", "AbortError");
    return original;
  }
}
