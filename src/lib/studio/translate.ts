/** Translate the background description for the image model. Translation is optional:
 * MyMemory's anonymous service can be unavailable or rate limited. */
export async function translateBackground(text: string, signal?: AbortSignal): Promise<string> {
  const original = text.trim();
  if (!original) return original;
  // MyMemory accepts at most 500 bytes per request; avoid splitting a UTF-8 character.
  let query = "";
  const encoder = new TextEncoder();
  for (const character of original) {
    if (encoder.encode(query + character).length > 480) break;
    query += character;
  }
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", query);
  url.searchParams.set("langpair", "es|en");
  try {
    const timeout = AbortSignal.timeout(5000);
    const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
    if (!response.ok) return original;
    const body = await response.json() as { responseStatus?: number; responseData?: { translatedText?: unknown } };
    const translated = body.responseData?.translatedText;
    if (body.responseStatus !== 200 || typeof translated !== "string" || !translated.trim()) return original;
    // Preserve any remainder rather than silently discarding part of the story.
    return translated.trim() + original.slice(query.length);
  } catch (error) {
    if (signal?.aborted) throw new DOMException("Cancelado", "AbortError");
    return original;
  }
}
