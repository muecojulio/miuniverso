import { LruCache } from "@/lib/studio/db-indexed";
import { placeOf } from "@/lib/studio/look";
import type { Film, Place, Tone } from "@/lib/studio/types";

type Motion = "still" | "advance" | "power" | "faceoff";

export type DirectedScene = {
  kind: "title" | "scene" | "end";
  line: string;
  place: Place;
  focusIds: string[];
  motion: Motion;
  start: number;
  end: number;
};

const directMemo = new LruCache<string, DirectedScene[]>(32);

export function direct(film: Film): DirectedScene[] {
  const castSig = film.cast.map((c) => `${c.id}:${c.name}`).join(",");
  const memoKey = `${film.id}|${film.duration}|${film.tone}|${film.title}|${castSig}|${film.story}`;
  const cached = directMemo.get(memoKey);
  if (cached) return cached;

  const count = film.duration === "corto" ? 3 : film.duration === "largo" ? 7 : 5;
  const sceneLen = film.duration === "corto" ? 3.1 : film.duration === "largo" ? 3.7 : 3.45;
  const lines = beats(film, count);
  const fallback = tonePlace(film.tone);
  let t = 0;
  const titleLen = 1.7;
  const endLen = 1.9;
  const scenes: DirectedScene[] = [
    {
      kind: "title",
      line: film.title.trim() || "Sin título",
      place: placeOf(film.story) ?? fallback,
      focusIds: film.cast.map((c) => c.id),
      motion: "still",
      start: 0,
      end: titleLen,
    },
  ];
  t = titleLen;
  lines.forEach((line, i) => {
    const focusIds = focusFor(line, film, i);
    scenes.push({
      kind: "scene",
      line,
      place: placeOf(line) ?? placeOf(film.story) ?? fallback,
      focusIds,
      motion: motionFor(line, i, lines.length, focusIds.length),
      start: t,
      end: t + sceneLen,
    });
    t += sceneLen;
  });
  scenes.push({
    kind: "end",
    line: "Fin",
    place: placeOf(film.story) ?? fallback,
    focusIds: film.cast.map((c) => c.id).slice(0, 3),
    motion: "still",
    start: t,
    end: t + endLen,
  });
  directMemo.set(memoKey, scenes);
  return scenes;
}

export function totalDuration(scenes: DirectedScene[]): number {
  return scenes.at(-1)?.end ?? 0;
}

function tonePlace(tone: Tone): Place {
  if (tone === "intimo") return "dojo";
  if (tone === "oscuro") return "trono";
  if (tone === "luminoso") return "mar";
  return "ciudad";
}

function beats(film: Film, count: number): string[] {
  const raw = film.story
    .split(/\n+|(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
  const names = film.cast.map((c) => c.name.trim()).filter(Boolean);
  const a = names[0] ?? "Alguien";
  const b = names[1] ?? "el otro";
  const fillers = [
    `${a} aparece cuando el horizonte se enciende.`,
    `${a} sostiene el poder sin alardear.`,
    names[1] ? `${b} sale de la sombra y no aparta la mirada.` : `${a} da un paso al frente.`,
    `El lugar contiene el aliento.`,
    names[1] ? `${a} y ${b} comparten el mismo cielo.` : `${a} mira el cielo abierto.`,
    `El poder se abre, breve y claro.`,
    `${a} elige no romper lo que importa.`,
  ];
  if (raw.length >= count) {
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      const idx = Math.round((i * (raw.length - 1)) / Math.max(1, count - 1));
      out.push(raw[idx] ?? raw[0] ?? fillers[0]!);
    }
    return out;
  }
  const out = [...raw];
  let i = 0;
  while (out.length < count) {
    out.push(fillers[i % fillers.length] ?? fillers[0]!);
    i += 1;
  }
  return out;
}

function focusFor(line: string, film: Film, index: number): string[] {
  const mentioned = film.cast.filter(
    (c) => c.name && line.toLowerCase().includes(c.name.toLowerCase()),
  );
  if (/juntos|ambos|las dos|los dos|enfrent/i.test(line) && film.cast.length > 1) {
    return film.cast.slice(0, 3).map((c) => c.id);
  }
  if (mentioned.length) return mentioned.slice(0, 3).map((c) => c.id);
  if (!film.cast.length) return [];
  return [film.cast[index % film.cast.length]!.id];
}

function motionFor(line: string, index: number, total: number, focusCount: number): Motion {
  if (/choc|luch|poder|fuego|rayo|grito|estalla|aura/i.test(line)) {
    return focusCount > 1 ? "faceoff" : "power";
  }
  if (focusCount > 1) return "faceoff";
  if (index === total - 1) return "still";
  if (index % 2 === 0) return "advance";
  return "still";
}
