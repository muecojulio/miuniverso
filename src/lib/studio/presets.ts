import type { Actor, Place, Role, Tone } from "@/lib/studio/types";

export const TONE_META: Record<
  Tone,
  {
    label: string;
    subtitle: string;
    badge: string;
    gradient: string;
    glow: string;
    accent: string;
  }
> = {
  epico: {
    label: "Épico",
    subtitle: "Horizontes encendidos, bronce y leyenda",
    badge: "SUPERPRODUCCIÓN",
    gradient: "from-amber-500/25 via-rose-500/15 to-purple-900/25",
    glow: "shadow-[0_0_38px_-10px_rgba(245,180,75,0.45)]",
    accent: "#f5b84b",
  },
  intimo: {
    label: "Íntimo",
    subtitle: "Cámara cercana, emoción pura y silencios",
    badge: "CINE DE AUTOR",
    gradient: "from-rose-400/22 via-amber-400/12 to-stone-900/30",
    glow: "shadow-[0_0_38px_-10px_rgba(244,114,140,0.4)]",
    accent: "#f4728c",
  },
  oscuro: {
    label: "Oscuro",
    subtitle: "Neón nocturno, lluvia, misterio y contraste",
    badge: "NOIR CÓSMICO",
    gradient: "from-violet-600/25 via-rose-900/20 to-slate-950/40",
    glow: "shadow-[0_0_38px_-10px_rgba(167,139,250,0.45)]",
    accent: "#a78bfa",
  },
  luminoso: {
    label: "Luminoso",
    subtitle: "Cielo abierto, brisa marina y energía vibrante",
    badge: "SOLAR VIVA",
    gradient: "from-cyan-400/22 via-amber-300/16 to-emerald-900/25",
    glow: "shadow-[0_0_38px_-10px_rgba(56,189,248,0.45)]",
    accent: "#38bdf8",
  },
};

export const ROLE_META: Record<
  Role,
  {
    label: string;
    tagline: string;
    chipClass: string;
    ringClass: string;
  }
> = {
  heroe: {
    label: "Superhéroe",
    tagline: "Emblema radiante, capa al viento y presencia heroica",
    chipClass: "border-amber-400/45 bg-amber-400/15 text-amber-200",
    ringClass: "ring-amber-400/50",
  },
  villano: {
    label: "Villano",
    tagline: "Silueta imponente, hombreras asimétricas y aura magnética",
    chipClass: "border-rose-400/45 bg-rose-500/15 text-rose-200",
    ringClass: "ring-rose-400/50",
  },
  anime: {
    label: "Anime",
    tagline: "Traje estilizado, energía elemental y trazo dinámico",
    chipClass: "border-cyan-400/45 bg-cyan-400/15 text-cyan-200",
    ringClass: "ring-cyan-400/50",
  },
};

export const PLACE_META: Record<Place, { label: string; color: string }> = {
  cosmos: { label: "Cosmos estelar", color: "text-violet-300 border-violet-400/35 bg-violet-500/15" },
  ciudad: { label: "Azotea urbana", color: "text-amber-300 border-amber-400/35 bg-amber-500/15" },
  bosque: { label: "Bosque ancestral", color: "text-emerald-300 border-emerald-400/35 bg-emerald-500/15" },
  mar: { label: "Océano abierto", color: "text-cyan-300 border-cyan-400/35 bg-cyan-500/15" },
  templo: { label: "Santuario solar", color: "text-orange-300 border-orange-400/35 bg-orange-500/15" },
  trono: { label: "Salón del trono", color: "text-rose-300 border-rose-400/35 bg-rose-500/15" },
  dojo: { label: "Dojo de entrenamiento", color: "text-yellow-200 border-yellow-400/35 bg-yellow-500/15" },
  laboratorio: { label: "Laboratorio cuántico", color: "text-sky-300 border-sky-400/35 bg-sky-500/15" },
};

export const MOTION_LABEL: Record<"still" | "advance" | "power" | "faceoff", string> = {
  still: "Plano contemplativo",
  advance: "Travelling de avance",
  power: "Estallido de poder",
  faceoff: "Duelo frente a frente",
};

export type ActorPreset = {
  title: string;
  role: Role;
  name: string;
  description: string;
};

export const ACTOR_PRESETS: ActorPreset[] = [
  {
    title: "Guardián Solar",
    role: "heroe",
    name: "Aurelia Solís",
    description:
      "armadura dorada y carmesí, capa larga marfil, emblema de sol radiante, poder de luz cálida, cabello largo al viento",
  },
  {
    title: "Centinela Relámpago",
    role: "heroe",
    name: "Mateo Volt",
    description:
      "traje azul marino y plata, emblema de rayo eléctrico en el pecho, capa corta, energía de trueno celeste",
  },
  {
    title: "Sombra de Ébano",
    role: "villano",
    name: "Vesper Kael",
    description:
      "armadura negro ébano y violeta, cuello alto asimétrico, capucha oscura, emblema de ojo y poder de sombra",
  },
  {
    title: "Monarca Carmesí",
    role: "villano",
    name: "Dante Brasa",
    description:
      "abrigo de batalla carmesí y oro antiguo, emblema de corona, llamas y brasa alrededor de los hombros",
  },
  {
    title: "Espadachín Astral",
    role: "anime",
    name: "Ren Hoshino",
    description:
      "cabello en puntas turquesa, traje de combate índigo y blanco, emblema de estrella, aura de cosmos brillante",
  },
  {
    title: "Hechicera de Escarcha",
    role: "anime",
    name: "Kira Yukimura",
    description:
      "melena plateada, túnica de academia cian y plata, emblema de luna, cristales de hielo y viento",
  },
];

export const TRAIT_SPARKS: string[] = [
  "capa carmesí",
  "armadura dorada",
  "emblema de rayo",
  "aura de fuego",
  "cristales de hielo",
  "sombra y tinta",
  "cabello en puntas",
  "energía cósmica",
  "emblema de luna",
  "traje esmeralda",
];

export function randomCharacterSpark(role: Role): { name: string; description: string } {
  const pool = ACTOR_PRESETS.filter((p) => p.role === role);
  const base = pool[Math.floor(Math.random() * pool.length)] ?? ACTOR_PRESETS[0]!;
  const extra = TRAIT_SPARKS[Math.floor(Math.random() * TRAIT_SPARKS.length)]!;
  return {
    name: base.name,
    description: base.description.includes(extra)
      ? base.description
      : `${base.description}, ${extra}`,
  };
}

export type StoryTemplate = {
  id: string;
  label: string;
  tone: Tone;
  title: string;
  build: (cast: Actor[]) => string;
};

export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: "azotea-tormenta",
    label: "Duelo en la azotea",
    tone: "epico",
    title: "Relámpago sobre la metrópoli",
    build: (cast) => {
      const a = cast[0]?.name || "Aurelia";
      const b = cast[1]?.name || "Vesper";
      return `En la azotea de la ciudad, ${a} contempla el horizonte encendido bajo el rayo. ${b} emerge entre la sombra y desata su poder frente a las nubes. Los dos chocan en una chispa dorada que ilumina cada edificio. En el último instante, ${a} extiende la mano y devuelve la calma al cielo.`;
    },
  },
  {
    id: "pacto-cosmos",
    label: "Odisea cósmica",
    tone: "luminoso",
    title: "Más allá de las estrellas",
    build: (cast) => {
      const a = cast[0]?.name || "Ren";
      const b = cast[1]?.name || "Kira";
      return `En el cosmos abierto, ${a} despierta rodeado de constelaciones vivas. ${b} cruza la galaxia dejando una estela de aura brillante. Ambos unen su energía frente a una estrella naciente. El universo entero vibra en armonía mientras miran hacia un nuevo mundo.`;
    },
  },
  {
    id: "santuario-secreto",
    label: "Secreto en el templo",
    tone: "intimo",
    title: "El eco del santuario",
    build: (cast) => {
      const a = cast[0]?.name || "Sol";
      const b = cast[1]?.name || "Nox";
      return `En el antiguo templo del bosque, ${a} camina en silencio bajo la luz cálida. ${b} aguarda junto a las columnas de piedra sin levantar las armas. Una mirada basta para recordar quiénes fueron antes de la leyenda. Juntos deciden proteger lo que aún queda en pie.`;
    },
  },
  {
    id: "trono-sombra",
    label: "Rebelión nocturna",
    tone: "oscuro",
    title: "La corona de ceniza",
    build: (cast) => {
      const a = cast[0]?.name || "Dante";
      const b = cast[1]?.name || "Mateo";
      return `En el salón del trono del castillo, ${a} enciende una brasa carmesí en la penumbra. ${b} irrumpe desde el laboratorio secreto con un estallido de rayo azul. Fuego y trueno se enfrentan hasta que las sombras retroceden. Al amanecer, ninguna corona gobierna sobre ellos.`;
    },
  },
];
