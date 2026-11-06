import type { Role } from "@/lib/studio/types";

const INSPIRED: { test: RegExp; traits: string }[] = [
  {
    test: /spider-?man|spiderman|hombre araña|hombre arana/i,
    traits: "traje ceñido rojo y azul oscuro, emblema de red geométrica, máscara abierta que no tapa la cara, ágil",
  },
  {
    test: /\bbatman\b|bruce wayne/i,
    traits: "capa larga negra, traje oscuro, emblema de ala, ciudad de noche",
  },
  {
    test: /super-?man|superman|clark kent/i,
    traits: "capa larga, traje azul y rojo, emblema de diamante, vuelo, luz",
  },
  {
    test: /iron man|hombre de hierro|tony stark/i,
    traits: "armadura roja y oro, emblema circular, tecnología, luz en el pecho",
  },
  {
    test: /\bgoku\b|kakaroto/i,
    traits: "pelo en puntas, traje de combate naranja y azul, aura de energía, emblema circular",
  },
  {
    test: /\bnaruto\b/i,
    traits: "pelo en puntas rubio, traje naranja, emblema en espiral, viento",
  },
  {
    test: /sailor moon|guerrera lunar/i,
    traits: "cabello largo, traje de combate claro con lazo, emblema de luna, luz",
  },
  {
    test: /\bjoker\b|el guasón|el guason/i,
    traits: "abrigo largo, traje oscuro con acento verde, sonrisa contenida, villano de ciudad",
  },
  {
    test: /wonder woman|mujer maravilla/i,
    traits: "armadura dorada y roja, emblema de ala, fuerza, capa corta",
  },
  {
    test: /\bthanos\b/i,
    traits: "armadura oscura y oro, presencia enorme, villano cósmico, emblema de círculo",
  },
  {
    test: /\bluffy\b|one piece/i,
    traits: "cabello corto, chaleco abierto rojo, emblema de sombrero circular, mar y fuerza",
  },
  {
    test: /\bgojo\b|satoru/i,
    traits: "cabello claro, traje oscuro de academia, venda que enmarca la mirada sin tapar la cara, energía",
  },
  {
    test: /tanjiro|demon slayer|cazador de demonios/i,
    traits: "cabello oscuro, haori a cuadros, espada, emblema de sol, bosque",
  },
  {
    test: /darth vader|vader/i,
    traits: "capa negra, armadura oscura, respiración grave, villano, emblema de ala",
  },
  {
    test: /\bhulk\b/i,
    traits: "figura enorme, traje rasgado verde, fuerza, emblema de puño",
  },
];

export function expandDescription(raw: string, role: Role): string {
  const text = raw.trim();
  const extra = INSPIRED.filter((item) => item.test.test(text)).map((item) => item.traits);
  const base = text || defaultTraits(role);
  return [base, ...extra].join(". ");
}

export function sanitizeForModel(raw: string): string {
  let text = raw;
  for (const item of INSPIRED) text = text.replace(item.test, "personaje original");
  return text.replace(/\s+/g, " ").trim().slice(0, 700);
}

function defaultTraits(role: Role): string {
  if (role === "villano") return "cuello alto negro, hombro asimétrico, sombra, emblema de ojo";
  if (role === "anime") return "cabello en puntas, traje de combate, emblema de estrella, línea de tinta";
  return "capa larga, emblema de sol, luz cálida, postura firme";
}
