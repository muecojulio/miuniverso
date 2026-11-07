import type { Role } from "@/lib/studio/types";

const INSPIRED: { test: RegExp; traits: string; look: string }[] = [
  {
    test: /spider-?man|spiderman|hombre araña|hombre arana/i,
    traits: "traje ceñido rojo y azul oscuro, emblema de red geométrica, máscara abierta que no tapa la cara, ágil",
    look: "tight athletic bodysuit, deep red torso and dark blue sides, fine web pattern woven into the fabric, chest mark is a geometric spider shape with no letters, open face, no mask over the eyes",
  },
  {
    test: /\bbatman\b|bruce wayne/i,
    traits: "capa larga negra, traje oscuro, emblema de ala, ciudad de noche",
    look: "matte black tactical armor, long black cape, pointed cowl that frames the eyes but leaves the real face visible, night rooftop, small black bat-shaped chest plate with no letters",
  },
  {
    test: /super-?man|superman|clark kent/i,
    traits: "capa larga, traje azul y rojo, emblema de diamante, vuelo, luz",
    look: "fitted royal-blue suit, long red cape, red boots, gold and red diamond chest plate with no letters, bright daylight, heroic stance",
  },
  {
    test: /iron man|hombre de hierro|tony stark/i,
    traits: "armadura roja y oro, emblema circular, tecnología, luz en el pecho",
    look: "red and gold metal armor, segmented plates, circular glowing chest light, helmet lifted so the real face is fully visible",
  },
  {
    test: /\bgoku\b|kakaroto/i,
    traits: "pelo en puntas, traje de combate naranja y azul, aura de energía, emblema circular",
    look: "spiky black hair, orange martial gi over a blue undershirt, wristbands, circular chest mark, warm energy glow, face fully visible",
  },
  {
    test: /\bnaruto\b/i,
    traits: "pelo en puntas rubio, traje naranja, emblema en espiral, viento",
    look: "spiky blond hair, orange jacket, dark pants, spiral mark on the back not on the face, wind, face fully visible",
  },
  {
    test: /sailor moon|guerrera lunar/i,
    traits: "cabello largo, traje de combate claro con lazo, emblema de luna, luz",
    look: "long hair, white and gold combat dress with a bow, moon-shaped brooch, soft light, face fully visible",
  },
  {
    test: /\bjoker\b|el guasón|el guason/i,
    traits: "abrigo largo, traje oscuro con acento verde, sonrisa contenida, villano de ciudad",
    look: "long coat, dark suit with a green vest, city night, restrained smile, real skin, no painted mask",
  },
  {
    test: /wonder woman|mujer maravilla/i,
    traits: "armadura dorada y roja, emblema de ala, fuerza, capa corta",
    look: "red and gold armor, short cape, eagle-like chest plate with no letters, warrior stance, face fully visible",
  },
  {
    test: /\bthanos\b/i,
    traits: "armadura oscura y oro, presencia enorme, villano cósmico, emblema de círculo",
    look: "massive dark armor with gold trim, cosmic villain, circular chest plate, face uncovered",
  },
  {
    test: /\bluffy\b|one piece/i,
    traits: "cabello corto, chaleco abierto rojo, emblema de sombrero circular, mar y fuerza",
    look: "short black hair, open red vest, scar under one eye only if described, sea light, face fully visible",
  },
  {
    test: /\bgojo\b|satoru/i,
    traits: "cabello claro, traje oscuro de academia, venda que enmarca la mirada sin tapar la cara, energía",
    look: "white hair, dark academy uniform, blindfold pushed up so both eyes are visible, pale energy",
  },
  {
    test: /tanjiro|demon slayer|cazador de demonios/i,
    traits: "cabello oscuro, haori a cuadros, espada, emblema de sol, bosque",
    look: "dark hair, checkered haori, sword, sun-shaped earring, forest light, face fully visible",
  },
  {
    test: /darth vader|vader/i,
    traits: "capa negra, armadura oscura, respiración grave, villano, emblema de ala",
    look: "black cape, dark armor, chest panel, helmet removed so the real face is visible, low red light",
  },
  {
    test: /\bhulk\b/i,
    traits: "figura enorme, traje rasgado verde, fuerza, emblema de puño",
    look: "huge figure, torn olive shirt, green color only in the clothes not the skin, clenched fist, face fully visible",
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

function defaultLook(role: Role): string {
  if (role === "villano") return "high black collar, asymmetric shoulder armor, shadow, a simple eye-shaped chest mark, face fully visible";
  if (role === "anime") return "spiky hair, tailored combat outfit, a simple star mark, real skin, face fully visible, not a cartoon";
  return "long cape, warm metal, a simple sun-shaped chest mark with no letters, heroic stance, face fully visible";
}

export function costumeLook(raw: string, role: Role): string {
  const hit = INSPIRED.find((item) => item.test.test(raw));
  const extra = sanitizeForModel(raw);
  const base = hit?.look ?? defaultLook(role);
  if (!extra || extra === "personaje original") return base;
  return `${base}. Extra detail: ${extra}`;
}
