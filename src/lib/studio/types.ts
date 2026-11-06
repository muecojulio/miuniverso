export type Role = "heroe" | "villano" | "anime";
export type Tone = "epico" | "intimo" | "oscuro" | "luminoso";
export type Duration = "corto" | "medio" | "largo";
export type Place =
  | "cosmos"
  | "ciudad"
  | "bosque"
  | "mar"
  | "templo"
  | "trono"
  | "dojo"
  | "laboratorio";

export type Actor = {
  id: string;
  name: string;
  role: Role;
  description: string;
  photo: string | null;
  frame: number;
  forged: boolean;
  portrait: string | null;
};

export type Film = {
  id: string;
  title: string;
  story: string;
  duration: Duration;
  tone: Tone;
  subtitles: boolean;
  music: boolean;
  grain: boolean;
  cast: Actor[];
  updatedAt: number;
};

export const ROLE_LABEL: Record<Role, string> = {
  heroe: "Superhéroe",
  villano: "Villano",
  anime: "Anime",
};

export const TONE_LABEL: Record<Tone, string> = {
  epico: "Épico",
  intimo: "Íntimo",
  oscuro: "Oscuro",
  luminoso: "Luminoso",
};

export const DURATION_LABEL: Record<Duration, string> = {
  corto: "Corto",
  medio: "Medio",
  largo: "Largo",
};
