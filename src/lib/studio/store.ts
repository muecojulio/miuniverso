import { create } from "zustand";
import {
  clearStudioCache,
  deleteFilmRecord,
  loadStudioSnapshot,
  saveActiveId,
  saveFilmRecord,
  wipeAllStudioDatabase,
} from "@/lib/studio/db-indexed";
import { clearDailyAllowances, sanitizeTextInput } from "@/lib/studio/security";
import type { Actor, Duration, Film, Role, Tone } from "@/lib/studio/types";

export function uid(): string {
  return crypto.randomUUID();
}

function createSampleFilm(): Film {
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
    updatedAt: Date.now(),
  };
}

function emptyFilm(): Film {
  return {
    id: uid(),
    title: "Nueva producción",
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

const MAX_FILMS = 12;
const pendingSaves = new Map<string, ReturnType<typeof setTimeout>>();

function queueFilmSave(film: Film, activeId?: string) {
  const existing = pendingSaves.get(film.id);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    pendingSaves.delete(film.id);
    void saveFilmRecord(film, activeId);
  }, 220);
  pendingSaves.set(film.id, timer);
}

let bootPromise: Promise<void> | null = null;

type Studio = {
  ready: boolean;
  photoShareConsent: boolean;
  textShareConsent: boolean;
  films: Film[];
  activeId: string;
  load: () => Promise<void>;
  setActive: (id: string) => void;
  newFilm: () => void;
  duplicateFilm: (id: string) => void;
  removeFilm: (id: string) => void;
  patch: (recipe: (film: Film) => Film) => void;
  setTitle: (title: string) => void;
  setStory: (story: string) => void;
  setTone: (tone: Tone) => void;
  setDuration: (duration: Duration) => void;
  setFlag: (key: "subtitles" | "music" | "grain", value: boolean) => void;
  setConsentFlags: (next: { photo?: boolean; text?: boolean }) => void;
  revokeAllConsents: () => void;
  addActor: (actor: Actor) => void;
  updateActor: (id: string, recipe: (actor: Actor) => Actor) => void;
  removeActor: (id: string) => void;
  clearCache: () => Promise<void>;
  wipeEverything: () => Promise<void>;
};

export const useStudio = create<Studio>((set, get) => ({
  ready: false,
  photoShareConsent: false,
  textShareConsent: false,
  films: [createSampleFilm()],
  activeId: "film-amanecer",
  load: async () => {
    if (get().ready) return;
    if (bootPromise) return bootPromise;
    bootPromise = (async () => {
      const saved = await loadStudioSnapshot();
      if (saved && saved.films.length > 0) {
        const activeId =
          saved.activeId && saved.films.some((f) => f.id === saved.activeId)
            ? saved.activeId
            : saved.films[0]!.id;
        set({ films: saved.films, activeId, ready: true });
        return;
      }
      const film = createSampleFilm();
      set({ films: [film], activeId: film.id, ready: true });
      await saveFilmRecord(film, film.id);
    })().finally(() => {
      bootPromise = null;
    });
    return bootPromise;
  },
  setActive: (id) => {
    if (!get().films.some((f) => f.id === id)) return;
    set({ activeId: id });
    void saveActiveId(id);
  },
  newFilm: () => {
    const film = emptyFilm();
    const current = get().films;
    const next = [film, ...current];
    const evicted = next.slice(MAX_FILMS);
    const films = next.slice(0, MAX_FILMS);
    set({ films, activeId: film.id });
    void saveFilmRecord(film, film.id);
    for (const old of evicted) {
      void deleteFilmRecord(old.id);
    }
  },
  duplicateFilm: (id) => {
    const source = get().films.find((f) => f.id === id);
    if (!source) return;
    const copy: Film = {
      ...source,
      id: uid(),
      title: sanitizeTextInput(`${source.title || "Sin título"} (copia)`, 100),
      cast: source.cast.map((actor) => ({ ...actor, id: uid() })),
      updatedAt: Date.now(),
    };
    const next = [copy, ...get().films];
    const evicted = next.slice(MAX_FILMS);
    const films = next.slice(0, MAX_FILMS);
    set({ films, activeId: copy.id });
    void saveFilmRecord(copy, copy.id);
    for (const old of evicted) {
      void deleteFilmRecord(old.id);
    }
  },
  removeFilm: (id) => {
    const timer = pendingSaves.get(id);
    if (timer) {
      clearTimeout(timer);
      pendingSaves.delete(id);
    }
    const left = get().films.filter((f) => f.id !== id);
    if (left.length === 0) {
      const fresh = createSampleFilm();
      set({ films: [fresh], activeId: fresh.id });
      void deleteFilmRecord(id);
      void saveFilmRecord(fresh, fresh.id);
      return;
    }
    const activeId = get().activeId === id ? left[0]!.id : get().activeId;
    set({ films: left, activeId });
    void deleteFilmRecord(id, activeId);
  },
  patch: (recipe) => {
    const activeId = get().activeId;
    let updated: Film | null = null;
    const films = get().films.map((film) => {
      if (film.id !== activeId) return film;
      updated = { ...recipe(film), updatedAt: Date.now() };
      return updated;
    });
    set({ films });
    if (updated) queueFilmSave(updated);
  },
  setTitle: (title) =>
    get().patch((film) => ({ ...film, title: sanitizeTextInput(title, 100) })),
  setStory: (story) =>
    get().patch((film) => ({ ...film, story: sanitizeTextInput(story, 2400) })),
  setTone: (tone) => get().patch((film) => ({ ...film, tone })),
  setDuration: (duration) => get().patch((film) => ({ ...film, duration })),
  setFlag: (key, value) => get().patch((film) => ({ ...film, [key]: value })),
  setConsentFlags: (next) =>
    set((state) => ({
      photoShareConsent: next.photo ?? state.photoShareConsent,
      textShareConsent: next.text ?? state.textShareConsent,
    })),
  revokeAllConsents: () => set({ photoShareConsent: false, textShareConsent: false }),
  addActor: (actor) =>
    get().patch((film) => ({
      ...film,
      cast: [
        ...film.cast,
        {
          ...actor,
          name: sanitizeTextInput(actor.name, 60),
          description: sanitizeTextInput(actor.description, 600),
        },
      ].slice(0, 6),
    })),
  updateActor: (id, recipe) =>
    get().patch((film) => ({
      ...film,
      cast: film.cast.map((actor) => {
        if (actor.id !== id) return actor;
        const next = recipe(actor);
        return {
          ...next,
          name: sanitizeTextInput(next.name, 60),
          description: sanitizeTextInput(next.description, 600),
        };
      }),
    })),
  removeActor: (id) =>
    get().patch((film) => ({ ...film, cast: film.cast.filter((actor) => actor.id !== id) })),
  clearCache: async () => {
    await clearStudioCache();
  },
  wipeEverything: async () => {
    for (const timer of pendingSaves.values()) clearTimeout(timer);
    pendingSaves.clear();
    await wipeAllStudioDatabase();
    clearDailyAllowances();
    const fresh = createSampleFilm();
    set({
      films: [fresh],
      activeId: fresh.id,
      photoShareConsent: false,
      textShareConsent: false,
      ready: true,
    });
    await saveFilmRecord(fresh, fresh.id);
  },
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
