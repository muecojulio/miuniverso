import { test } from "node:test";
import assert from "node:assert/strict";
import { translateBackground } from "./translate.ts";
import { gradioEvents } from "./gradio-events.ts";

test("Gradio events support CRLF and multiline data", () => {
  const events = gradioEvents(': keepalive\r\nevent: complete\r\ndata: {"image":\r\ndata: "abc"}\r\n\r\n');
  assert.equal(events.length, 1);
  assert.equal(events[0].event, "complete");
  assert.deepEqual(JSON.parse(events[0].data), { image: "abc" });
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
    globalThis.fetch = async () => { throw new Error("offline"); };
    assert.equal(await translateBackground("Una ciudad"), "Una ciudad");
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(translateBackground("Una ciudad", controller.signal), { name: "AbortError" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
