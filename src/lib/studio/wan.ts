const SPACE = "https://cbensimon-wan2-2-fp8da-aoti-preview2.hf.space";

const NEGATIVE =
  "static, blurry, watermark, text, logo, extra fingers, deformed face, frozen frame, low quality";

export function wanAllowance(): { key: string; used: number; max: number; ok: boolean } {
  const max = 2;
  const key = `miuniverso-wan-${new Date().toISOString().slice(0, 10)}`;
  const used = Number(localStorage.getItem(key) ?? "0") || 0;
  return { key, used, max, ok: used < max };
}

export function bumpWan(key: string) {
  const used = Number(localStorage.getItem(key) ?? "0") || 0;
  localStorage.setItem(key, String(used + 1));
}

export async function animateStill(image: Blob, signal: AbortSignal): Promise<string> {
  const form = new FormData();
  form.append("files", image, "plano.jpg");
  const uploaded = await fetch(`${SPACE}/gradio_api/upload`, { method: "POST", body: form, signal });
  if (!uploaded.ok) throw new Error("El modelo gratis no pudo recibir la imagen. Prueba más tarde.");
  const paths = (await uploaded.json()) as string[];
  const path = paths[0];
  if (!path) throw new Error("El modelo gratis no aceptó la imagen.");

  const file = {
    path,
    url: `${SPACE}/gradio_api/file=${path}`,
    orig_name: "plano.jpg",
    size: null,
    mime_type: "image/jpeg",
    meta: { _type: "gradio.FileData" },
  };
  const data = [
    file,
    null,
    "slow cinematic motion, the person breathes and turns slightly, cloth and cape move, continuous shot, not a frozen photo",
    6,
    NEGATIVE,
    3.5,
    1,
    1,
    42,
    true,
    6,
    "UniPCMultistep",
    3,
    16,
    false,
    true,
  ];
  const started = await fetch(`${SPACE}/gradio_api/call/generate_video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
    signal,
  });
  if (!started.ok) throw new Error("Hay cola en el modelo gratis. Prueba en unos minutos.");
  const { event_id: eventId } = (await started.json()) as { event_id?: string };
  if (!eventId) throw new Error("El modelo gratis no empezó el video.");

  const stream = await fetch(`${SPACE}/gradio_api/call/generate_video/${eventId}`, { signal });
  if (!stream.ok) throw new Error("Se cortó la espera del video.");
  const raw = await stream.text();
  const url = videoUrl(raw);
  if (!url) throw new Error("El modelo gratis no devolvió el video. La cola puede estar llena.");
  return url;
}

function videoUrl(raw: string): string | null {
  const blocks = raw.split("\n\n").filter(Boolean);
  for (const block of blocks.reverse()) {
    const event = block.match(/^event:\s*(\S+)/m)?.[1];
    const data = block.match(/^data:\s*(.+)$/m)?.[1];
    if (!event || !data) continue;
    if (event === "error") throw new Error("El modelo gratis no pudo rodar este plano.");
    if (event !== "complete") continue;
    const found = findMp4(JSON.parse(data) as unknown);
    if (found) return found.startsWith("http") ? found : `${SPACE}/gradio_api/file=${found}`;
  }
  return null;
}

function findMp4(value: unknown): string | null {
  if (typeof value === "string" && (value.includes(".mp4") || value.includes("/tmp/gradio"))) return value;
  if (!value || typeof value !== "object") return null;
  if ("url" in value && typeof value.url === "string") return value.url;
  if ("path" in value && typeof value.path === "string" && value.path.includes(".")) return value.path;
  for (const item of Object.values(value)) {
    const found = findMp4(item);
    if (found) return found;
  }
  return null;
}
