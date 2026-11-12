import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clearStudioCache,
  fromIndexedFilmRecord,
  LruCache,
  STUDIO_INDEXES,
  toIndexedFilmRecord,
} from "./db-indexed.ts";
import { gradioEvents } from "./gradio-events.ts";
import {
  safeFilename,
  sanitizeImageDataUrl,
  sanitizeTextInput,
  validateGradioMediaUrl,
  validatePhotoFile,
} from "./security.ts";
import { translateBackground } from "./translate.ts";

test("Gradio events support CRLF and multiline data", () => {
  const events = gradioEvents(
    ': keepalive\r\nevent: complete\r\ndata: {"image":\r\ndata: "abc"}\r\n\r\n',
  );
  assert.equal(events.length, 1);
  assert.equal(events[0]?.event, "complete");
  assert.deepEqual(JSON.parse(events[0]!.data), { image: "abc" });
});

test("translation uses anonymous API and falls back on errors", async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (input) => {
      const url = new URL(String(input));
      assert.equal(url.hostname, "api.mymemory.translated.net");
      assert.equal(url.searchParams.get("q"), "Una ciudad");
      return Response.json({ responseStatus: 200, responseData: { translatedText: "A city" } });
    };
    assert.equal(await translateBackground("Una ciudad"), "A city");
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    assert.equal(await translateBackground("Una ciudad"), "Una ciudad");
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(translateBackground("Una ciudad", controller.signal), {
      name: "AbortError",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("translation L1/L2 cache avoids duplicate upstream calls when enabled", async () => {
  await clearStudioCache();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls += 1;
      return Response.json({
        responseStatus: 200,
        responseData: { translatedText: "Golden rooftop" },
      });
    };
    assert.equal(
      await translateBackground("Azotea dorada", undefined, { cache: true }),
      "Golden rooftop",
    );
    assert.equal(
      await translateBackground("Azotea dorada", undefined, { cache: true }),
      "Golden rooftop",
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    await clearStudioCache();
  }
});

test("security guardrails block SVG XSS, unsafe URLs, and control characters", () => {
  assert.throws(
    () => validatePhotoFile({ name: "avatar.svg", type: "image/svg+xml", size: 200 }),
    /SVG/,
  );
  assert.throws(
    () => validatePhotoFile({ name: "huge.jpg", type: "image/jpeg", size: 15 * 1024 * 1024 }),
    /12 MB/,
  );
  assert.doesNotThrow(() =>
    validatePhotoFile({ name: "face.jpg", type: "image/jpeg", size: 250_000 }),
  );

  assert.throws(() => sanitizeImageDataUrl("data:image/svg+xml;base64,PHN2Zz4="));
  assert.throws(() => sanitizeImageDataUrl("javascript:alert(1)"));
  assert.equal(
    sanitizeImageDataUrl("data:image/png;base64,iVBORw0KGgo="),
    "data:image/png;base64,iVBORw0KGgo=",
  );

  const space = "https://cbensimon-wan2-2-fp8da-aoti-preview2.hf.space";
  assert.equal(
    validateGradioMediaUrl("/tmp/gradio/clip/out.mp4", space),
    `${space}/gradio_api/file=/tmp/gradio/clip/out.mp4`,
  );
  assert.throws(() => validateGradioMediaUrl("http://169.254.169.254/latest/meta-data", space));
  assert.throws(() => validateGradioMediaUrl("https://evil.example.com/clip.mp4", space));
  assert.throws(() => validateGradioMediaUrl("/tmp/../../etc/passwd", space));

  assert.equal(sanitizeTextInput("Hola\u0000\u202E Mundo", 20), "Hola Mundo");
  assert.equal(safeFilename("../Mi Película: #1!!"), "Mi-Película-1");
});

test("LRU cache and IndexedDB v2 index schema helpers preserve normalized records", () => {
  assert.equal(STUDIO_INDEXES.length, 5);
  assert.ok(STUDIO_INDEXES.includes("films_v2.by_updatedAt"));
  assert.ok(STUDIO_INDEXES.includes("films_v2.by_tone"));
  assert.ok(STUDIO_INDEXES.includes("studio_cache.by_expiresAt"));

  const lru = new LruCache<string, number>(4);
  lru.set("a", 1);
  lru.set("b", 2);
  lru.set("c", 3);
  lru.set("d", 4);
  assert.equal(lru.get("a"), 1); // promotes 'a'
  lru.set("e", 5); // evicts 'b'
  assert.equal(lru.get("b"), undefined);
  assert.equal(lru.get("a"), 1);

  const indexed = toIndexedFilmRecord({
    id: "f1",
    title: "  Amanecer Épico  ",
    story: "Luz en la ciudad.",
    duration: "medio",
    tone: "epico",
    subtitles: true,
    music: true,
    grain: true,
    cast: [],
    updatedAt: 100,
  });
  assert.equal(indexed.titleLower, "amanecer épico");
  const restored = fromIndexedFilmRecord(indexed);
  assert.equal("titleLower" in restored, false);
  assert.equal(restored.title, "  Amanecer Épico  ");
});
