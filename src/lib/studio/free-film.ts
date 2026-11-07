import { costumeLook, sanitizeForModel } from "@/lib/studio/inspired";
import { loadImage } from "@/lib/studio/photo";
import type { Film } from "@/lib/studio/types";

const TONE: Record<Film["tone"], string> = {
  epico: "epic scale, warm rim light",
  intimo: "intimate close light",
  oscuro: "low key, deep shadow",
  luminoso: "bright warm air",
};

export type FacePlace = { x: number; y: number; scale: number };
export type FaceFocus = { x: number; y: number };

export type FreeBeat = { prompt: string; actorId: string | null };

export type FreePlate = {
  still: HTMLImageElement;
  actorId: string | null;
  base: FacePlace;
  face: HTMLCanvasElement | null;
};

const DEFAULT_PLACE: FacePlace = { x: 0.5, y: 0.33, scale: 0.5 };

export function sceneBeats(film: Film): FreeBeat[] {
  const featured = film.cast.filter((actor) => actor.description.trim() || actor.photo).slice(0, 3);
  const pool = featured.length ? featured : film.cast.slice(0, 1);
  const story = sanitizeForModel(film.story || film.title || "a quiet heroic dawn");
  const people = pool.length ? pool : [null];
  return people.map((actor) => {
    const costume = actor ? costumeLook(actor.description, actor.role) : "long cape, structured collar, a simple sun-shaped chest plate, real fabric";
    const prompt = [
      `Photoreal movie costume, chest-up portrait, vertical 9:16. ${costume}.`,
      "Sharp suit, armor, cape and collar, with cloth weight, stitching and metal. Shoulders and neckline fully in frame.",
      "One person facing camera. Bare human face from hairline to chin, eyes nose and mouth clear.",
      "No mask, no visor, no helmet, no letters, no logo, no watermark.",
      "Soft light on the skin. The costume stays in focus.",
      TONE[film.tone],
      `Background only: ${story}.`,
    ].join(" ");
    return { prompt, actorId: actor?.id ?? null };
  });
}

export function freeAllowance(): { key: string; used: number; max: number; ok: boolean } {
  const max = 3;
  const key = `miuniverso-gratis-${new Date().toISOString().slice(0, 10)}`;
  const used = Number(localStorage.getItem(key) ?? "0") || 0;
  return { key, used, max, ok: used < max };
}

export function bumpFreeAllowance(key: string) {
  const used = Number(localStorage.getItem(key) ?? "0") || 0;
  localStorage.setItem(key, String(used + 1));
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Cancelado", "AbortError"));
      },
      { once: true },
    );
  });
}

export async function fetchFreeStill(
  prompt: string,
  seed: number,
  onWait: (seconds: number) => void,
  signal?: AbortSignal,
): Promise<HTMLImageElement> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=540&height=960&nologo=true&seed=${seed}`;
  let res = await fetch(url, { signal });
  if (res.status === 402) {
    const wait = Math.min(50, Math.max(1, Number(res.headers.get("retry-after") || "45")));
    onWait(wait);
    await sleep((wait + 1) * 1000, signal);
    res = await fetch(url, { signal });
  }
  if (!res.ok) {
    throw new Error(
      res.status === 402
        ? "La API gratis sigue en pausa. Espera un minuto y vuelve a intentar."
        : `La API gratis no respondió (${res.status}).`,
    );
  }
  const blob = await res.blob();
  if (!blob.type.startsWith("image/")) throw new Error("La API gratis no devolvió una imagen.");
  const objectUrl = URL.createObjectURL(blob);
  try {
    return await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function loadCastFaces(film: Film): Promise<{
  photos: Map<string, HTMLImageElement>;
  focus: Map<string, FaceFocus>;
}> {
  const photos = new Map<string, HTMLImageElement>();
  const focus = new Map<string, FaceFocus>();
  for (const actor of film.cast) {
    if (!actor.photo) continue;
    try {
      const img = await loadImage(actor.photo);
      photos.set(actor.id, img);
      const found = skinFocus(img);
      focus.set(actor.id, found ? { x: found.x, y: found.y } : { x: 0.5, y: 0.36 + actor.frame * 0.18 });
    } catch {
      // A broken photo is skipped. The still stays as the generator drew it.
    }
  }
  return { photos, focus };
}

export function placed(base: FacePlace, nudge: FacePlace): FacePlace {
  return {
    x: clamp(base.x + nudge.x, 0.18, 0.82),
    y: clamp(base.y + nudge.y, 0.14, 0.72),
    scale: clamp(base.scale + nudge.scale, 0.28, 0.72),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function skinFocus(img: CanvasImageSource & { width: number; height: number }): FacePlace | null {
  if (!img.width || !img.height) return null;
  const w = 90;
  const h = Math.max(1, Math.round((w * img.height) / img.width));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const skin = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
    if (y > 60 && cb > 77 && cb < 135 && cr > 130 && cr < 180) skin[i] = 1;
  }
  const ww = 18;
  const hh = 22;
  let best = 0;
  let bx = Math.round((w - ww) / 2);
  let by = Math.round(h * 0.18);
  for (let y0 = 0; y0 + hh < h * 0.78; y0 += 2) {
    for (let x0 = 0; x0 + ww < w; x0 += 2) {
      let count = 0;
      for (let yy = y0; yy < y0 + hh; yy++) {
        for (let xx = x0; xx < x0 + ww; xx++) count += skin[yy * w + xx];
      }
      if (count > best) {
        best = count;
        bx = x0;
        by = y0;
      }
    }
  }
  if (best < ww * hh * 0.28) return null;
  return { x: (bx + ww / 2) / w, y: (by + hh / 2) / h, scale: 0.5 };
}

function sampleGain(img: HTMLImageElement, place: FacePlace) {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 1;
  const sw = img.width * 0.08;
  const sh = img.height * 0.08;
  ctx.drawImage(img, place.x * img.width - sw / 2, place.y * img.height - sh / 2, sw, sh, 0, 0, 8, 8);
  const data = ctx.getImageData(0, 0, 8, 8).data;
  let y = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) y += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  return clamp(y / n / 150, 0.92, 1.08);
}

export function makePlate(
  still: HTMLImageElement,
  actorId: string | null,
  photo: HTMLImageElement | undefined,
  focus: FaceFocus,
): FreePlate {
  const base = skinFocus(still) ?? { ...DEFAULT_PLACE };
  return { still, actorId, base, face: photo ? bakeFace(photo, focus, sampleGain(still, base)) : null };
}

function bakeFace(photo: HTMLImageElement, focus: FaceFocus, gain: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 680;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas;
  const coverScale = Math.max(canvas.width / photo.width, canvas.height / photo.height) * 1.05;
  const dw = photo.width * coverScale;
  const dh = photo.height * coverScale;
  ctx.drawImage(photo, canvas.width * 0.5 - focus.x * dw, canvas.height * 0.4 - focus.y * dh, dw, dh);
  if (gain !== 1) {
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      pixels.data[i] = Math.min(255, pixels.data[i] * gain);
      pixels.data[i + 1] = Math.min(255, pixels.data[i + 1] * gain);
      pixels.data[i + 2] = Math.min(255, pixels.data[i + 2] * gain);
    }
    ctx.putImageData(pixels, 0, 0);
  }
  return canvas;
}

let scratch: HTMLCanvasElement | null = null;

function faceLayer(width: number, height: number) {
  if (!scratch || scratch.width !== width || scratch.height !== height) {
    scratch = document.createElement("canvas");
    scratch.width = width;
    scratch.height = height;
  }
  return scratch;
}

function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const scale = Math.max(cw / img.width, ch / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (cw - w) / 2, (ch - h) / 2, w, h);
}

function headPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.32, cy + ry * 1.28);
  ctx.lineTo(cx - rx * 0.4, cy + ry * 0.62);
  ctx.bezierCurveTo(cx - rx * 0.98, cy + ry * 0.2, cx - rx * 1.05, cy - ry * 0.55, cx - rx * 0.52, cy - ry * 1.02);
  ctx.bezierCurveTo(cx - rx * 0.16, cy - ry * 1.28, cx + rx * 0.16, cy - ry * 1.28, cx + rx * 0.52, cy - ry * 1.02);
  ctx.bezierCurveTo(cx + rx * 1.05, cy - ry * 0.55, cx + rx * 0.98, cy + ry * 0.2, cx + rx * 0.4, cy + ry * 0.62);
  ctx.lineTo(cx + rx * 0.32, cy + ry * 1.28);
  ctx.closePath();
}

function pasteFace(ctx: CanvasRenderingContext2D, plate: FreePlate, place: FacePlace) {
  if (!plate.face) return;
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  const cx = place.x * cw;
  const cy = place.y * ch;
  const rx = place.scale * cw * 0.52;
  const ry = rx * 1.18;
  const layer = faceLayer(cw, ch);
  const g = layer.getContext("2d");
  if (!g) return;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cw, ch);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  g.save();
  headPath(g, cx, cy, rx, ry);
  g.clip();
  const boxH = ry * 2.7;
  const boxW = boxH * (plate.face.width / plate.face.height);
  g.drawImage(plate.face, cx - boxW / 2, cy - boxH * 0.4, boxW, boxH);
  g.globalCompositeOperation = "soft-light";
  g.globalAlpha = 0.32;
  g.filter = "blur(10px)";
  cover(g, plate.still);
  g.filter = "none";
  g.restore();
  g.globalAlpha = 1;
  g.globalCompositeOperation = "destination-in";
  const fade = g.createLinearGradient(cx, cy - ry * 1.2, cx, cy + ry * 1.3);
  fade.addColorStop(0, "rgba(0,0,0,0.2)");
  fade.addColorStop(0.16, "rgba(0,0,0,1)");
  fade.addColorStop(0.7, "rgba(0,0,0,1)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = fade;
  g.fillRect(0, 0, cw, ch);
  g.save();
  g.translate(cx, cy);
  g.scale(1, 1.25);
  const side = g.createRadialGradient(0, -ry * 0.1, rx * 0.45, 0, 0, rx * 1.05);
  side.addColorStop(0, "rgba(0,0,0,1)");
  side.addColorStop(0.72, "rgba(0,0,0,0.95)");
  side.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = side;
  g.fillRect(-rx * 2, -ry * 2, rx * 4, ry * 4);
  g.restore();
  ctx.drawImage(layer, 0, 0);
}

function drawPlate(ctx: CanvasRenderingContext2D, plate: FreePlate, nudge: FacePlace, zoom: number) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-cw / 2, -ch / 2);
  cover(ctx, plate.still);
  if (plate.face) pasteFace(ctx, plate, placed(plate.base, nudge));
  ctx.restore();
}

export function paintFreeTake(
  ctx: CanvasRenderingContext2D,
  plates: FreePlate[],
  nudge: FacePlace,
  time: number,
  duration: number,
  grain: boolean,
) {
  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  ctx.fillStyle = "#100e0c";
  ctx.fillRect(0, 0, cw, ch);
  if (!plates.length) return;
  const slot = duration / plates.length;
  const index = Math.min(plates.length - 1, Math.floor(time / slot));
  const local = (time - index * slot) / Math.max(0.001, slot);
  drawPlate(ctx, plates[index], nudge, 1 + local * 0.06);
  const fade = 0.22;
  if (index + 1 < plates.length && local > 1 - fade) {
    ctx.globalAlpha = (local - (1 - fade)) / fade;
    drawPlate(ctx, plates[index + 1], nudge, 1);
    ctx.globalAlpha = 1;
  }
  if (grain) {
    ctx.fillStyle = "rgba(244,240,230,0.045)";
    for (let i = 0; i < 90; i++) {
      const x = (i * 97 + Math.floor(time * 13)) % cw;
      const y = (i * 53 + Math.floor(time * 9)) % ch;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const vignette = ctx.createRadialGradient(cw / 2, ch / 2, ch * 0.28, cw / 2, ch / 2, ch * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, cw, ch);
}

export { DEFAULT_PLACE };
