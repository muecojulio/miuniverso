import { direct, totalDuration, type DirectedScene } from "@/lib/studio/director";
import { shade, toLook, type Look } from "@/lib/studio/look";
import type { Film } from "@/lib/studio/types";

export const FRAME_W = 720;
export const FRAME_H = 1280;

type Images = Map<string, CanvasImageSource & { width: number; height: number }>;

let noise: HTMLCanvasElement | null = null;

function noiseTile(): HTMLCanvasElement | null {
  if (noise) return noise;
  if (typeof document === "undefined") return null;
  const c = document.createElement("canvas");
  c.width = 180;
  c.height = 180;
  const g = c.getContext("2d");
  if (!g) return null;
  const img = g.createImageData(180, 180);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 80 + Math.random() * 140;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 28;
  }
  g.putImageData(img, 0, 0);
  noise = c;
  return c;
}

export function paintFilm(
  ctx: CanvasRenderingContext2D,
  film: Film,
  images: Images,
  time: number,
) {
  const scenes = direct(film);
  const scene = scenes.find((s) => time >= s.start && time < s.end) ?? scenes.at(-1);
  if (!scene) return;
  const w = FRAME_W;
  const h = FRAME_H;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#100e0c";
  ctx.fillRect(0, 0, w, h);
  const span = Math.max(0.2, scene.end - scene.start);
  const local = (time - scene.start) / span;
  const vis = Math.min(1, (time - scene.start) / 0.28, (scene.end - time) / 0.28);
  ctx.save();
  ctx.globalAlpha = Math.max(0, vis);
  const zoom = scene.motion === "advance" ? 1 + local * 0.07 : scene.motion === "power" ? 1.03 : 1;
  ctx.translate(w / 2, h / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-w / 2, -h / 2);
  drawPlace(ctx, scene.place, time, w, h);
  if (scene.kind !== "title") {
    const ids = scene.focusIds.length ? scene.focusIds : film.cast.slice(0, 1).map((a) => a.id);
    const actors = ids
      .map((id) => film.cast.find((a) => a.id === id))
      .filter((a): a is Film["cast"][number] => Boolean(a))
      .slice(0, 3);
    actors.forEach((actor, index) => {
      const look = toLook(actor);
      const x = actors.length === 1 ? w / 2 : actors.length === 2 ? (index === 0 ? w * 0.34 : w * 0.66) : w * (0.22 + index * 0.28);
      drawActor(ctx, look, images.get(actor.id) ?? null, actor.frame, x, h * 0.8, actors.length === 1 ? 1.42 : actors.length === 2 ? 1.12 : 0.92, time + index, scene.motion === "power" || scene.motion === "faceoff");
    });
  }
  if (film.grain) drawGrain(ctx, time, w, h);
  ctx.restore();
  drawChrome(ctx, film, scene, scenes, vis, w, h);
}

function drawChrome(
  ctx: CanvasRenderingContext2D,
  film: Film,
  scene: DirectedScene,
  scenes: DirectedScene[],
  vis: number,
  w: number,
  h: number,
) {
  ctx.save();
  ctx.globalAlpha = Math.max(vis, 0.15);
  ctx.fillStyle = "#e0b15a";
  ctx.fillRect(48, 56, 36, 2);
  ctx.beginPath();
  ctx.arc(96, 57, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "500 18px Outfit, sans-serif";
  ctx.fillStyle = "#a39c90";
  ctx.fillText("MI UNIVERSO", 112, 63);
  if (scene.kind === "title") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4f0e6";
    ctx.font = "600 64px Fraunces, serif";
    wrap(ctx, scene.line, w - 120).forEach((line, i) => ctx.fillText(line, w / 2, h * 0.42 + i * 74));
    ctx.font = "400 22px Outfit, sans-serif";
    ctx.fillStyle = "#e0b15a";
    ctx.fillText("una película con tu cara", w / 2, h * 0.42 + 150);
  }
  if (scene.kind === "end") {
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4f0e6";
    ctx.font = "600 72px Fraunces, serif";
    ctx.fillText("Fin", w / 2, h * 0.46);
    ctx.font = "400 22px Outfit, sans-serif";
    ctx.fillStyle = "#a39c90";
    const names = film.cast.map((a) => a.name).filter(Boolean).join("  ·  ");
    if (names) ctx.fillText(names, w / 2, h * 0.46 + 56);
  }
  if (scene.kind === "scene" && film.subtitles) {
    ctx.textAlign = "center";
    const boxW = w - 80;
    ctx.font = "500 28px Outfit, sans-serif";
    const lines = wrap(ctx, scene.line, boxW - 48).slice(0, 3);
    const boxH = 36 + lines.length * 36;
    const y = h - 150 - boxH;
    round(ctx, 40, y, boxW, boxH, 22);
    ctx.fillStyle = "rgba(244,240,230,0.94)";
    ctx.fill();
    ctx.fillStyle = "#100e0c";
    lines.forEach((line, i) => ctx.fillText(line, w / 2, y + 44 + i * 36));
  }
  const index = Math.max(0, scenes.findIndex((s) => s === scene));
  ctx.textAlign = "left";
  ctx.fillStyle = "#a39c90";
  ctx.font = "500 16px Outfit, sans-serif";
  ctx.fillText(`${index + 1} / ${scenes.length}`, 48, h - 48);
  ctx.restore();
}

function drawPlace(ctx: CanvasRenderingContext2D, place: DirectedScene["place"], time: number, w: number, h: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  const palettes: Record<DirectedScene["place"], [string, string, string]> = {
    cosmos: ["#141822", "#243044", "#100e0c"],
    ciudad: ["#2a211c", "#6a4632", "#120e0c"],
    bosque: ["#1a2420", "#2d4636", "#101410"],
    mar: ["#1c2c38", "#3d6d86", "#101418"],
    templo: ["#241c16", "#5a4632", "#120e0c"],
    trono: ["#1a1214", "#4a2430", "#100c0c"],
    dojo: ["#2a2420", "#8a7560", "#161310"],
    laboratorio: ["#161a1e", "#2c3a44", "#0e1012"],
  };
  const [top, mid, bot] = palettes[place];
  sky.addColorStop(0, top);
  sky.addColorStop(0.55, mid);
  sky.addColorStop(1, bot);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  if (place === "cosmos" || place === "ciudad" || place === "mar") {
    for (let i = 0; i < 40; i++) {
      const x = (i * 97 + time * (12 + (i % 5))) % w;
      const y = (i * 53) % (h * 0.48);
      ctx.globalAlpha = 0.25 + Math.abs(Math.sin(time + i)) * 0.5;
      ctx.fillStyle = "#f4f0e6";
      ctx.fillRect(x, y, i % 8 === 0 ? 2.4 : 1.3, i % 8 === 0 ? 2.4 : 1.3);
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = place === "mar" ? "#16303a" : "#14110f";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.78);
  if (place === "ciudad") {
    for (let x = 0; x <= w; x += 46) {
      const bh = 80 + ((x * 13) % 180);
      ctx.lineTo(x, h * 0.78 - bh);
      ctx.lineTo(x + 32, h * 0.78 - bh);
      ctx.lineTo(x + 32, h * 0.78);
    }
  } else if (place === "bosque") {
    for (let x = 20; x < w; x += 54) {
      ctx.moveTo(x, h * 0.78);
      ctx.lineTo(x + 10, h * 0.5 + ((x * 3) % 40));
      ctx.lineTo(x + 22, h * 0.78);
    }
  } else if (place === "templo" || place === "trono") {
    for (let x = 70; x < w; x += 140) {
      ctx.rect(x, h * 0.48, 28, h * 0.3);
    }
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.fill();
  ctx.strokeStyle = "#e0b15a";
  ctx.globalAlpha = 0.45;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72 + Math.sin(time * 0.4) * 4);
  ctx.lineTo(w, h * 0.72 + Math.sin(time * 0.4) * 4);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawActor(
  ctx: CanvasRenderingContext2D,
  look: Look,
  image: (CanvasImageSource & { width: number; height: number }) | null,
  frame: number,
  x: number,
  feet: number,
  scale: number,
  time: number,
  power: boolean,
) {
  ctx.save();
  ctx.translate(x, feet + Math.sin(time * 2.1) * 4);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, 8, 54, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (look.cape) {
    ctx.fillStyle = shade(look.primary, -30);
    ctx.beginPath();
    ctx.moveTo(-26, -168);
    ctx.quadraticCurveTo(-120 + Math.sin(time * 1.6) * 18, -40, -78, 10);
    ctx.lineTo(18, -20);
    ctx.quadraticCurveTo(-10, -120, 22, -168);
    ctx.fill();
  }
  limb(ctx, -16, -70, -22, -8, 16, shade(look.primary, -15));
  limb(ctx, 16, -70, 22, -8, 16, shade(look.primary, -15));
  ctx.fillStyle = look.primary;
  round(ctx, -42, -176, 84, 112, 18);
  ctx.fill();
  if (look.role === "anime") {
    ctx.strokeStyle = "#f4f0e6";
    ctx.lineWidth = 3;
    round(ctx, -42, -176, 84, 112, 18);
    ctx.stroke();
  }
  ctx.fillStyle = look.secondary;
  if (look.role === "villano") {
    ctx.beginPath();
    ctx.moveTo(-18, -188);
    ctx.lineTo(-52, -146);
    ctx.lineTo(-16, -146);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(18, -188);
    ctx.lineTo(58, -132);
    ctx.lineTo(16, -146);
    ctx.closePath();
    ctx.fill();
  }
  const arm = power ? -230 : -150;
  limb(ctx, -36, -156, -70, arm, 14, look.primary);
  limb(ctx, 36, -156, 70, power ? -210 : -120, 14, look.primary);
  drawEmblem(ctx, look, -6, -128);
  if (look.hair === "hood" || look.hair === "long") {
    ctx.fillStyle = shade(look.primary, -45);
    ctx.beginPath();
    ctx.arc(0, -230, 62, Math.PI, 0);
    ctx.quadraticCurveTo(70, -180, 48, look.hair === "long" ? -90 : -150);
    ctx.lineTo(-48, look.hair === "long" ? -90 : -150);
    ctx.quadraticCurveTo(-70, -180, -62, -230);
    ctx.fill();
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, -230, 46, 0, Math.PI * 2);
  ctx.clip();
  if (image) {
    const iw = image.width;
    const ih = image.height;
    const cover = Math.max(92 / iw, 92 / ih);
    const dw = iw * cover;
    const dh = ih * cover;
    ctx.drawImage(image, -dw / 2, -276 - (dh - 92) * (0.15 + frame * 0.45), dw, dh);
    ctx.fillStyle = look.primary;
    ctx.globalAlpha = 0.14;
    ctx.fillRect(-46, -276, 92, 92);
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = look.skin;
    ctx.fillRect(-46, -276, 92, 92);
    ctx.strokeStyle = shade(look.primary, -40);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-16, -236);
    ctx.lineTo(-6, -236);
    ctx.moveTo(8, -236);
    ctx.lineTo(18, -236);
    ctx.moveTo(-8, -210);
    ctx.quadraticCurveTo(0, -204, 8, -210);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = look.metal;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, -230, 46, 0, Math.PI * 2);
  ctx.stroke();
  if (look.hair === "spiky" || look.hair === "short") {
    ctx.fillStyle = shade(look.secondary, -50);
    ctx.beginPath();
    if (look.hair === "spiky") {
      ctx.moveTo(-40, -246);
      ctx.lineTo(-28, -292);
      ctx.lineTo(-8, -250);
      ctx.lineTo(6, -304);
      ctx.lineTo(18, -248);
      ctx.lineTo(36, -286);
      ctx.lineTo(44, -240);
      ctx.closePath();
    } else {
      ctx.arc(0, -250, 40, Math.PI, 0);
      ctx.fill();
    }
    ctx.fill();
  }
  if (look.mask) {
    ctx.strokeStyle = look.metal;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, -238, 34, 12, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (power) {
    for (let i = 0; i < 16; i++) {
      const ang = time * 1.5 + i;
      const r = 78 + (i % 4) * 16;
      ctx.fillStyle = look.metal;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * r * 0.7, -180 + Math.sin(ang) * r * 0.45, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = "#f4f0e6";
  ctx.font = "600 16px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(look.name, 0, 36);
  ctx.restore();
}

function drawEmblem(ctx: CanvasRenderingContext2D, look: Look, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = look.metal;
  ctx.fillStyle = look.metal;
  ctx.lineWidth = 2;
  if (look.emblem === "sol" || look.emblem === "estrella") {
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
      ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
      ctx.stroke();
    }
  } else if (look.emblem === "red") {
    ctx.strokeRect(-10, -10, 20, 20);
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(10, 0);
    ctx.moveTo(0, -10);
    ctx.lineTo(0, 10);
    ctx.stroke();
  } else if (look.emblem === "ala") {
    ctx.beginPath();
    ctx.moveTo(-16, 4);
    ctx.quadraticCurveTo(-4, -14, 0, 0);
    ctx.quadraticCurveTo(4, -14, 16, 4);
    ctx.stroke();
  } else if (look.emblem === "ojo") {
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (look.emblem === "luna") {
    ctx.beginPath();
    ctx.arc(2, 0, 10, 0.6, Math.PI * 1.4);
    ctx.stroke();
  } else if (look.emblem === "hoja") {
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 12, -0.6, 0, Math.PI * 2);
    ctx.stroke();
  } else if (look.emblem === "rayo") {
    ctx.beginPath();
    ctx.moveTo(4, -14);
    ctx.lineTo(-4, 0);
    ctx.lineTo(3, 0);
    ctx.lineTo(-4, 14);
    ctx.stroke();
  } else if (look.emblem === "corona") {
    ctx.strokeRect(-12, 0, 24, 8);
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.lineTo(-8, -10);
    ctx.lineTo(0, -2);
    ctx.lineTo(8, -10);
    ctx.lineTo(12, 0);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawGrain(ctx: CanvasRenderingContext2D, time: number, w: number, h: number) {
  const tile = noiseTile();
  if (!tile) return;
  ctx.save();
  ctx.globalAlpha = 0.18;
  const ox = Math.round((time * 30) % 40);
  for (let y = -40; y < h; y += 180) {
    for (let x = -40; x < w; x += 180) ctx.drawImage(tile, x + ox, y);
  }
  ctx.restore();
}

function limb(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, width: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function round(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const next = cur ? `${cur} ${word}` : word;
    if (ctx.measureText(next).width > max && cur) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

export function filmLength(film: Film): number {
  return totalDuration(direct(film));
}
