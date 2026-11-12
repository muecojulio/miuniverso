import { gradioEvents } from "./gradio-events.ts";
import { bumpDailyAllowance, readDailyAllowance, sanitizeImageDataUrl } from "./security.ts";

const SPACE = "https://prithivmlmods-qwen-image-edit-2511-loras-fast.hf.space";

export function qwenAllowance(): { key: string; used: number; max: number; ok: boolean } {
  return readDailyAllowance("qwen", 3);
}

export function bumpQwen(key: string) {
  bumpDailyAllowance(key);
}

export async function dressPhoto(
  dataUrl: string,
  prompt: string,
  signal: AbortSignal,
  adapter = "Anything2Real",
): Promise<string> {
  const safeInput = sanitizeImageDataUrl(dataUrl);
  const bare = safeInput.includes(",") ? safeInput.split(",")[1]! : safeInput;
  const data = [JSON.stringify([bare]), prompt.slice(0, 700), adapter, 1, false, 1, 4];
  const started = await fetch(`${SPACE}/gradio_api/call/edit_image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    referrerPolicy: "no-referrer",
    body: JSON.stringify({ data }),
    signal,
  });
  if (!started.ok) throw new Error("Hay cola en el modelo gratis. Prueba en unos minutos.");
  const { event_id: eventId } = (await started.json()) as { event_id?: string };
  if (!eventId || !/^[A-Za-z0-9_-]{4,120}$/.test(eventId)) {
    throw new Error("El modelo gratis no empezó el retrato.");
  }
  const stream = await fetch(`${SPACE}/gradio_api/call/edit_image/${eventId}`, {
    referrerPolicy: "no-referrer",
    signal,
  });
  if (!stream.ok) throw new Error("Se cortó la espera del retrato.");
  return readPortrait(await stream.text());
}

function readPortrait(raw: string): string {
  for (const { event, data } of gradioEvents(raw).reverse()) {
    if (!event || !data || data === "null") continue;
    if (event === "error") {
      const info = JSON.parse(data) as { error?: string };
      const message = info.error ?? "";
      if (/quota|ZeroGPU|limit/i.test(message)) {
        throw new Error("El modelo gratis llegó a su límite de hoy. Se renueva mañana.");
      }
      throw new Error("El modelo gratis no pudo vestir esta foto.");
    }
    if (event !== "complete") continue;
    const payload = JSON.parse(data) as
      | { image?: string; status?: string }
      | [{ image?: string; status?: string }];
    const record = Array.isArray(payload) ? payload[0] : payload;
    if (record?.status === "blocked") throw new Error("Esa descripción no se puede usar.");
    if (!record?.image) throw new Error("El modelo gratis no devolvió el retrato.");
    const normalized = record.image.startsWith("data:")
      ? record.image
      : `data:image/png;base64,${record.image}`;
    return sanitizeImageDataUrl(normalized);
  }
  throw new Error("El modelo gratis no devolvió el retrato. La cola puede estar llena.");
}
