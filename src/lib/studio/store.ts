import { create } from "zustand";
import type { Actor, Duration, Film, Role, Tone } from "@/lib/studio/types";

const DB = "miuniverso";
const KEY = "films";

export function uid(): string {
  return crypto.randomUUID();
}

export function sampleFilm(): Film {
  return {
    id: "film-amanecer",
    title: "Amanecer en la azotea",
    story:
      "En la azotea, Sol Varela abre los ojos cuando el disco de bronce rompe la noche. Nox Quill sale de la sombra del tanque de agua y le ofrece un pacto. Los dos chocan: luz contra tinta. La ciudad contiene el aliento. Sol no destruye a Nox: lo nombra, y el horizonte se queda en calma.",
    duration: "medio",
    tone: "epico",
    subtitles: true,
    music: true,
    grain: true,
    cast: [
      {
        id: "sol",
        name: "Sol Varela",
        role: "heroe",
        description: "heroína de capa marfil, emblema de sol, luz cálida, cabello largo",
        photo: null,
        frame: 0.34,
        forged: true,
        portrait: null,
      },
      {
        id: "nox",
        name: "Nox Quill",
        role: "villano",
        description: "villano de cuello alto negro, hombro asimétrico, sombra y tinta, capucha",
        photo: null,
        frame: 0.34,
        forged: true,
        portrait: null,
      },
    ],
    updatedAt: 0,
  };
}

function emptyFilm(): Film {
  return {
    id: uid(),
    title: "Película sin título",
    story: "",
    duration: "medio",
    tone: "epico",
    subtitles: true,
    music: true,
    grain: true,
    cast: [],
    updatedAt: Date.now(),
  };
}

type Saved = { films: Film[]; activeId: string };

async function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(KEY)) db.createObjectStore(KEY);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<Saved | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(KEY, "readonly");
      const req = tx.objectStore(KEY).get("state");
      req.onsuccess = () => resolve((req.result as Saved | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(saved: Saved): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(KEY, "readwrite");
    tx.objectStore(KEY).put(saved, "state");
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function queueSave(films: Film[], activeId: string) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void idbSet({ films, activeId });
  }, 250);
}

type Studio = {
  ready: boolean;
  films: Film[];
  activeId: string;
  load: () => Promise<void>;
  active: () => Film;
  setActive: (id: string) => void;
  newFilm: () => void;
  removeFilm: (id: string) => void;
  patch: (recipe: (film: Film) => Film) => void;
  setTitle: (title: string) => void;
  setStory: (story: string) => void;
  setTone: (tone: Tone) => void;
  setDuration: (duration: Duration) => void;
  setFlag: (key: "subtitles" | "music" | "grain", value: boolean) => void;
  addActor: (actor: Actor) => void;
  updateActor: (id: string, recipe: (actor: Actor) => Actor) => void;
  removeActor: (id: string) => void;
};

export const useStudio = create<Studio>((set, get) => ({
  ready: false,
  films: [sampleFilm()],
  activeId: "film-amanecer",
  active: () => get().films.find((f) => f.id === get().activeId) ?? get().films[0] ?? sampleFilm(),
  load: async () => {
    const saved = await idbGet();
    if (saved?.films?.length) {
      const activeId = saved.films.some((f) => f.id === saved.activeId) ? saved.activeId : saved.films[0]!.id;
      set({ films: saved.films, activeId, ready: true });
      return;
    }
    const film = sampleFilm();
    set({ films: [film], activeId: film.id, ready: true });
    await idbSet({ films: [film], activeId: film.id });
  },
  setActive: (id) => {
    set({ activeId: id });
    queueSave(get().films, id);
  },
  newFilm: () => {
    const film = emptyFilm();
    const films = [film, ...get().films].slice(0, 12);
    set({ films, activeId: film.id });
    queueSave(films, film.id);
  },
  removeFilm: (id) => {
    const left = get().films.filter((f) => f.id !== id);
    const films = left.length ? left : [sampleFilm()];
    const activeId = get().activeId === id ? films[0]!.id : get().activeId;
    set({ films, activeId });
    queueSave(films, activeId);
  },
  patch: (recipe) => {
    const films = get().films.map((film) =>
      film.id === get().activeId ? { ...recipe(film), updatedAt: Date.now() } : film,
    );
    set({ films });
    queueSave(films, get().activeId);
  },
  setTitle: (title) => get().patch((film) => ({ ...film, title })),
  setStory: (story) => get().patch((film) => ({ ...film, story })),
  setTone: (tone) => get().patch((film) => ({ ...film, tone })),
  setDuration: (duration) => get().patch((film) => ({ ...film, duration })),
  setFlag: (key, value) => get().patch((film) => ({ ...film, [key]: value })),
  addActor: (actor) =>
    get().patch((film) => ({ ...film, cast: [...film.cast, actor].slice(0, 6) })),
  updateActor: (id, recipe) =>
    get().patch((film) => ({
      ...film,
      cast: film.cast.map((actor) => (actor.id === id ? recipe(actor) : actor)),
    })),
  removeActor: (id) =>
    get().patch((film) => ({ ...film, cast: film.cast.filter((actor) => actor.id !== id) })),
}));

export function blankActor(role: Role, forged: boolean): Actor {
  return {
    id: uid(),
    name: "",
    role,
    description: "",
    photo: null,
    frame: 0.34,
    forged,
    portrait: null,
  };
}
