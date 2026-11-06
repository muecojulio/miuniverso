import { expandDescription, sanitizeForModel } from "@/lib/studio/inspired";
import type { Actor, Film } from "@/lib/studio/types";

export function modelPrompt(film: Film): string {
  const people = film.cast.slice(0, 3).map((actor, index) => {
    const desc = sanitizeForModel(expandDescription(actor.description, actor.role));
    return `Person ${index + 1}, ${actor.name || "someone"}, original character: ${desc}. If a reference photo is present, keep that real face recognizable.`;
  });
  const story = sanitizeForModel(film.story || film.title || "A quiet heroic dawn");
  return [
    "Cinematic 8 second shot. No logos, no trademarks, no subtitles, no watermark.",
    "Original characters only. Do not copy an existing franchise costume.",
    people.join(" "),
    `Story: ${story}.`,
    "Natural skin, dramatic warm light, slow camera move.",
  ].join(" ");
}

export function portraitPrompt(actor: Actor): string {
  const desc = sanitizeForModel(expandDescription(actor.description, actor.role));
  return `Turn this photo into an original character portrait. Keep the same person's face recognizable. Costume and mood: ${desc}. No logos, no copied franchise suits, no text.`;
}

export function dayAllowance(kind: "video" | "still"): { key: string; used: number; max: number; ok: boolean } {
  const max = kind === "video" ? 4 : 8;
  const key = `miuniverso-${kind}-${new Date().toISOString().slice(0, 10)}`;
  const used = Number(localStorage.getItem(key) ?? "0") || 0;
  return { key, used, max, ok: used < max };
}

export function bumpAllowance(key: string) {
  const used = Number(localStorage.getItem(key) ?? "0") || 0;
  localStorage.setItem(key, String(used + 1));
}
