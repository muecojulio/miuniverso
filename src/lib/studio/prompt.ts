import { costumeLook, expandDescription, sanitizeForModel } from "@/lib/studio/inspired";
import type { Actor, Film } from "@/lib/studio/types";

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

export function motionLine(film: Film): string {
  const story = sanitizeForModel(film.story || film.title || "A quiet heroic dawn");
  return [
    "One continuous filmed shot.",
    `What happens: ${story}.`,
    "The person moves through that moment, walks, turns and reacts. Cloth and hair move. Not a frozen photo, not a slideshow.",
  ]
    .join(" ")
    .slice(0, 420);
}

export function portraitPrompt(actor: Actor): string {
  const desc = sanitizeForModel(expandDescription(actor.description, actor.role));
  return `This photo is the character. Keep this person's face recognizable: same eyes, nose, mouth and skin. Change only the costume. ${desc}. No mask over the face, no logos, no text.`;
}
