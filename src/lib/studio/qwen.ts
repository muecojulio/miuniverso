const SPACE = "https://prithivmlmods-qwen-image-edit-2511-loras-fast.hf.space";

export function qwenAllowance(): { key: string; used: number; max: number; ok: boolean } {
  const max = 3;
  const key = `miuniverso-qwen-${new Date().toISOString().slice(0, 10)}`;
  const used = Number(localStorage.getItem(key) ?? "0") || 0;
  return { key, used, max, ok: used < max };
}

export function bumpQwen(key: string) {
  const used = Number(localStorage.getItem(key) ?? "0") || 0;
  localStorage.setItem(key, String(used + 1));
}

export async function dressPhoto(
  dataUrl: string,
  prompt: string,
  signal: AbortSignal,
  adapter = "Anything2Real",
): Promise<string> {
  const bare = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const data = [JSON.stringify([bare]), prompt.slice(0, 700), adapter, 1, false, 1, 4];
  const started = await fetch(`${SPACE}/gradio_api/call/edit_image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
    signal,
  });
  if (!started.ok) throw new Error("Hay cola en el modelo gratis. Prueba en unos minutos.");
  const { event_id: eventId } = (await started.json()) as { event_id?: string };
  if (!eventId) throw new Error("El modelo gratis no empezó el retrato.");
  const stream = await fetch(`${SPACE}/gradio_api/call/edit_image/${eventId}`, { signal });
  if (!stream.ok) throw new Error("Se cortó la espera del retrato.");
  return readPortrait(await stream.text());
}

function readPortrait(raw: string): string {
  const blocks = raw.split("\n\n").filter(Boolean);
  for (const block of blocks.reverse()) {
    const event = block.match(/^event:\s*(\S+)/m)?.[1];
    const data = block.match(/^data:\s*(.+)$/m)?.[1];
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
    const payload = JSON.parse(data) as { image?: string; status?: string } | [{ image?: string; status?: string }];
    const record = Array.isArray(payload) ? payload[0] : payload;
    if (record?.status === "blocked") throw new Error("Esa descripción no se puede usar.");
    if (!record?.image) throw new Error("El modelo gratis no devolvió el retrato.");
    return record.image.startsWith("data:") ? record.image : `data:image/png;base64,${record.image}`;
  }
  throw new Error("El modelo gratis no devolvió el retrato. La cola puede estar llena.");
}
