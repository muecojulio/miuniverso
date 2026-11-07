import { costumeLook, expandDescription, sanitizeForModel } from "@/lib/studio/inspired";
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
    "One continuous filmed shot. The people walk, turn and react. Not a still photo, not a slideshow.",
  ].join(" ");
}

export function realPersonPrompt(actor: Actor): string {
  const costume = costumeLook(actor.description, actor.role);
  return [
    "The person in this photo is the character. Keep their face exactly: same eyes, nose, mouth, jaw, skin tone and age.",
    "Do not invent a different face. Only change the clothes and the light.",
    `Put this same person in this costume, chest up, facing camera: ${costume}.`,
    "Natural neck and shoulders. Bare face, no mask, no helmet, no text, no logo, no letters. Photoreal, one person.",
  ]
    .join(" ")
    .slice(0, 780);
}

export function portraitPrompt(actor: Actor): string {
  const desc = sanitizeForModel(expandDescription(actor.description, actor.role));
  return `This photo is the character. Keep this person's face recognizable: same eyes, nose, mouth and skin. Change only the costume. ${desc}. No mask over the face, no logos, no text.`;
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
