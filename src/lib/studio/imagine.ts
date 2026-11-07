import { createServerFn } from "@tanstack/react-start";

const MAX_IMAGE = 1_400_000;
let lastSpend = 0;

function apiKey() {
  return process.env.XAI_API_KEY ?? "";
}

function spendGate(): string | null {
  const now = Date.now();
  if (now - lastSpend < 20_000) return "Espera unos segundos antes de otra toma.";
  lastSpend = now;
  return null;
}

function asImage(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("data:image/")) return null;
  if (value.length > MAX_IMAGE) return null;
  return value;
}

export const imagineReady = createServerFn({ method: "GET" }).handler(async () => {
  return { available: Boolean(apiKey()) };
});

export const createPortrait = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const data = input as { imageDataUrl?: unknown; prompt?: unknown };
    const imageDataUrl = asImage(data.imageDataUrl);
    const prompt = typeof data.prompt === "string" ? data.prompt.trim().slice(0, 800) : "";
    if (!imageDataUrl) throw new Error("La foto no es válida o pesa demasiado.");
    if (prompt.length < 3) throw new Error("Describe el personaje.");
    return { imageDataUrl, prompt };
  })
  .handler(async ({ data }) => {
    const key = apiKey();
    if (!key) return { ok: false as const, error: "La toma con Grok no está disponible ahora." };
    const wait = spendGate();
    if (wait) return { ok: false as const, error: wait };
    const res = await fetch("https://api.x.ai/v1/images/edits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "grok-imagine-image-2.0",
        prompt: data.prompt,
        image: { url: data.imageDataUrl, type: "image_url" },
        response_format: "b64_json",
        n: 1,
      }),
    });
    if (!res.ok) return { ok: false as const, error: `No se pudo crear el retrato (${res.status}).` };
    const body = (await res.json()) as {
      data?: { b64_json?: string; url?: string }[];
      b64_json?: string;
      url?: string;
    };
    const b64 = body.data?.[0]?.b64_json ?? body.b64_json;
    const url = body.data?.[0]?.url ?? body.url;
    if (b64) return { ok: true as const, image: `data:image/png;base64,${b64}` };
    if (url && url.startsWith("https://")) {
      const img = await fetch(url);
      if (!img.ok) return { ok: false as const, error: "El retrato no se pudo abrir." };
      const bytes = Buffer.from(await img.arrayBuffer());
      const type = img.headers.get("content-type")?.split(";")[0] || "image/png";
      return { ok: true as const, image: `data:${type};base64,${bytes.toString("base64")}` };
    }
    return { ok: false as const, error: "El retrato llegó vacío." };
  });

export const startFilmTake = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const data = input as { prompt?: unknown; keyframe?: unknown; references?: unknown };
    const prompt = typeof data.prompt === "string" ? data.prompt.trim().slice(0, 1200) : "";
    const keyframe = asImage(data.keyframe);
    const references = Array.isArray(data.references)
      ? data.references.map(asImage).filter((item): item is string => Boolean(item)).slice(0, 3)
      : [];
    if (prompt.length < 8) throw new Error("Falta la historia.");
    if (!keyframe && !references.length) throw new Error("Agrega al menos una foto o un fotograma.");
    return { prompt, keyframe, references };
  })
  .handler(async ({ data }) => {
    const key = apiKey();
    if (!key) return { ok: false as const, error: "La toma con Grok no está disponible ahora." };
    const wait = spendGate();
    if (wait) return { ok: false as const, error: wait };
    const payload: Record<string, unknown> = {
      model: "grok-imagine-video-1.5",
      prompt: data.prompt,
      duration: 8,
      resolution: "720p",
    };
    if (data.keyframe) payload.image = { url: data.keyframe };
    if (data.references.length) payload.reference_images = data.references.map((url) => ({ url }));
    const res = await fetch("https://api.x.ai/v1/videos/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false as const, error: `No se pudo empezar la toma (${res.status}).` };
    const body = (await res.json()) as { request_id?: string; id?: string };
    const requestId = body.request_id ?? body.id;
    if (!requestId) return { ok: false as const, error: "Grok no devolvió una toma." };
    return { ok: true as const, requestId };
  });

export const pollFilmTake = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const requestId = (input as { requestId?: unknown }).requestId;
    if (typeof requestId !== "string" || !/^[A-Za-z0-9_-]{6,160}$/.test(requestId)) {
      throw new Error("Solicitud no válida.");
    }
    return { requestId };
  })
  .handler(async ({ data }) => {
    const key = apiKey();
    if (!key) return { ok: false as const, error: "Sin acceso." };
    const res = await fetch(`https://api.x.ai/v1/videos/${data.requestId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return { ok: false as const, error: `No se pudo consultar la toma (${res.status}).` };
    const body = (await res.json()) as { status?: string; video?: { url?: string } };
    const url = body.video?.url ?? (body as { url?: string }).url;
    if (body.status === "done" && url) {
      const file = await fetch(url);
      if (file.ok) {
        const bytes = Buffer.from(await file.arrayBuffer());
        if (bytes.length > 0 && bytes.length < 14_000_000) {
          return { ok: true as const, status: "done" as const, url: `data:video/mp4;base64,${bytes.toString("base64")}` };
        }
      }
      return { ok: true as const, status: "done" as const, url };
    }
    if (body.status === "failed" || body.status === "expired") {
      return { ok: false as const, error: "La toma no se completó. Puedes intentarlo una vez más." };
    }
    return { ok: true as const, status: "pending" as const };
  });
