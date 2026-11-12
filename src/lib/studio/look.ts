import { LruCache } from "@/lib/studio/db-indexed";
import { expandDescription } from "@/lib/studio/inspired";
import type { Actor, Place, Role } from "@/lib/studio/types";

export type Power =
  | "luz"
  | "sombra"
  | "fuego"
  | "hielo"
  | "rayo"
  | "naturaleza"
  | "agua"
  | "viento"
  | "tecnologia"
  | "cosmos"
  | "fuerza";

export type Emblem =
  | "sol"
  | "luna"
  | "red"
  | "ala"
  | "ojo"
  | "estrella"
  | "hoja"
  | "rayo"
  | "corona"
  | "circulo";

export type Look = {
  id: string;
  name: string;
  role: Role;
  primary: string;
  secondary: string;
  metal: string;
  skin: string;
  power: Power;
  hair: "short" | "long" | "spiky" | "hood";
  cape: boolean;
  mask: boolean;
  emblem: Emblem;
};

const DYES = ["#9c3428", "#1d4ed8", "#15803d", "#7e22ce", "#be123c", "#b45309"];

const COLOR_WORDS: [RegExp, string][] = [
  [/carmes[ií]|rojo|escarlata|bermell[oó]n/i, "#b82e2e"],
  [/azul|marino|[ií]ndigo/i, "#244c82"],
  [/oro|dorado|bronce/i, "#d8ac54"],
  [/negro|[eé]bano/i, "#1c1c20"],
  [/blanco|marfil|plata|plateado/i, "#ece6da"],
  [/verde|esmeralda/i, "#227a50"],
  [/naranja|[aá]mbar/i, "#db6d28"],
  [/rosa|magenta/i, "#cf5278"],
  [/violeta|p[uú]rpura|morado/i, "#6a4ea8"],
  [/cian|turquesa|hielo/i, "#58b8cc"],
];

const lookMemo = new LruCache<string, Look>(64);

export function toLook(actor: Actor): Look {
  const memoKey = `${actor.id}|${actor.role}|${actor.name}|${actor.description}`;
  const cached = lookMemo.get(memoKey);
  if (cached) return cached;

  const text = expandDescription(actor.description, actor.role);
  const found = COLOR_WORDS.filter(([re]) => re.test(text)).map(([, hex]) => hex);
  const dye = DYES[hash(actor.name + text) % DYES.length] ?? DYES[0]!;
  const primary = found[0] ?? dye;
  let secondary = found[1] ?? shade(primary, actor.role === "villano" ? -20 : 36);
  if (primary.toLowerCase() === "#1c1c20") secondary = found[1] ?? "#9e3442";
  const metal = /plata|plateado|hielo/i.test(text) ? "#dbd6cc" : "#f0be5b";
  const computed: Look = {
    id: actor.id,
    name: actor.name.trim() || "Sin nombre",
    role: actor.role,
    primary,
    secondary,
    metal,
    skin: "#e7c8a8",
    power: powerOf(text),
    hair: hairOf(text, actor.role),
    cape: actor.role === "heroe" || /capa/i.test(text),
    mask: /m[aá]scara|antifaz|casco|venda/i.test(text),
    emblem: emblemOf(text, actor.role),
  };
  lookMemo.set(memoKey, computed);
  return computed;
}

export function shade(hex: string, amt: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amt);
  const g = clamp(((n >> 8) & 255) + amt);
  const b = clamp((n & 255) + amt);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function powerOf(text: string): Power {
  if (/fuego|llama|brasa/i.test(text)) return "fuego";
  if (/hielo|escarcha|fr[ií]o/i.test(text)) return "hielo";
  if (/rayo|trueno|el[eé]ctric/i.test(text)) return "rayo";
  if (/sombra|tiniebla|oscuro|tinta/i.test(text)) return "sombra";
  if (/agua|mar|ola/i.test(text)) return "agua";
  if (/viento|aire|aura/i.test(text)) return "viento";
  if (/planta|hoja|bosque|naturaleza/i.test(text)) return "naturaleza";
  if (/tecno|robot|armadura|mecha/i.test(text)) return "tecnologia";
  if (/cosmos|estrella|galaxia|espacio/i.test(text)) return "cosmos";
  if (/fuerza|puño|golpe/i.test(text)) return "fuerza";
  if (/luz|sol|brillo/i.test(text)) return "luz";
  return "luz";
}

function hairOf(text: string, role: Role): Look["hair"] {
  if (/capucha|yelmo|hood/i.test(text)) return "hood";
  if (/largo|melena/i.test(text)) return "long";
  if (/punta|eriz|spike/i.test(text) || role === "anime") return "spiky";
  return "short";
}

function emblemOf(text: string, role: Role): Emblem {
  if (/araña|red/i.test(text)) return "red";
  if (/sol/i.test(text)) return "sol";
  if (/luna/i.test(text)) return "luna";
  if (/ala|murci[eé]lago/i.test(text)) return "ala";
  if (/ojo/i.test(text)) return "ojo";
  if (/estrella/i.test(text)) return "estrella";
  if (/hoja|planta/i.test(text)) return "hoja";
  if (/rayo/i.test(text)) return "rayo";
  if (/corona|rey|reina/i.test(text)) return "corona";
  if (role === "villano") return "ojo";
  if (role === "anime") return "estrella";
  return "circulo";
}

export function placeOf(text: string): Place | null {
  if (/mar|oc[eé]ano|playa|ola|muelle/i.test(text)) return "mar";
  if (/bosque|selva|[aá]rbol|jungla/i.test(text)) return "bosque";
  if (/ciudad|calle|azotea|edificio|avenida/i.test(text)) return "ciudad";
  if (/templo|ruina|santuario/i.test(text)) return "templo";
  if (/dojo|escuela|academia|sal[oó]n/i.test(text)) return "dojo";
  if (/laboratorio|ciencia/i.test(text)) return "laboratorio";
  if (/trono|castillo|reino|palacio/i.test(text)) return "trono";
  if (/espacio|cosmos|estrella|galaxia|cielo/i.test(text)) return "cosmos";
  return null;
}
