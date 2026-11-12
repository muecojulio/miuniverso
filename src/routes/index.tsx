import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  Clapperboard,
  Copy,
  Film as FilmIcon,
  Plus,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  WandSparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ActorAvatarCanvas } from "@/components/actor-avatar-canvas";
import { Stage } from "@/components/stage";
import { Combobox } from "@/components/ui/combobox";
import { HorizontalScroll } from "@/components/ui/horizontal-scroll";
import { SwipeActions } from "@/components/ui/swipe-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { normalizeSearch } from "@/lib/ui/gestures";
import { direct, totalDuration } from "@/lib/studio/director";
import { TONE_META } from "@/lib/studio/presets";
import { useStudio } from "@/lib/studio/store";
import { DURATION_LABEL, type Tone } from "@/lib/studio/types";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const films = useStudio((s) => s.films);
  const activeId = useStudio((s) => s.activeId);
  const setActive = useStudio((s) => s.setActive);
  const newFilm = useStudio((s) => s.newFilm);
  const duplicateFilm = useStudio((s) => s.duplicateFilm);
  const removeFilm = useStudio((s) => s.removeFilm);

  const [toneFilter, setToneFilter] = useState<Tone | "all">("all");
  const [search, setSearch] = useState("");

  const activeFilm = useMemo(
    () => films.find((f) => f.id === activeId) ?? films[0],
    [films, activeId],
  );

  const filteredFilms = useMemo(() => {
    const q = normalizeSearch(search);
    return films.filter((f) => {
      if (toneFilter !== "all" && f.tone !== toneFilter) return false;
      if (!q) return true;
      return (
        normalizeSearch(f.title).includes(q) ||
        normalizeSearch(f.story).includes(q) ||
        f.cast.some((c) => normalizeSearch(c.name).includes(q))
      );
    });
  }, [films, toneFilter, search]);

  const activeScenes = useMemo(() => (activeFilm ? direct(activeFilm) : []), [activeFilm]);
  const activeSeconds = useMemo(() => Math.round(totalDuration(activeScenes)), [activeScenes]);

  const hasCast = (activeFilm?.cast.length ?? 0) > 0;
  const hasStory = Boolean(activeFilm?.story.trim());

  return (
    <>
      <div className="space-y-8">
        {/* Hero Cinema Marquee */}
        <section className="studio-card relative overflow-hidden p-5 sm:p-7">
          <div className="film-sprocket mb-5 opacity-80" />

          <div className="grid items-center gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-brass/35 bg-brass/12 px-3.5 py-1 text-xs font-semibold tracking-wider text-brass">
                <Sparkles size={13} />
                GRAN ATELIER DE CINE INTERACTIVO
              </div>

              <h1 className="text-4xl leading-[1.06] font-semibold sm:text-5xl">
                Dirige una película viva{" "}
                <span className="text-marquee-gradient">con tu propia cara</span>
              </h1>

              <p className="max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                Conviértete en superhéroe, villano cósmico o leyenda de anime. Diseña vestuarios
                dinámicos, arma tu storyboard automático y rueda la historia en tu dispositivo con
                privacidad blindada.
              </p>

              {/* Interactive Production Pipeline */}
              <div className="grid gap-2.5 sm:grid-cols-3">
                <Link
                  to="/elenco"
                  className="group card-hover rounded-2xl border border-line bg-panel-2/70 p-3 transition-all hover:border-brass/55 hover:bg-panel-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex size-7 items-center justify-center rounded-lg bg-amber-400/15 text-brass">
                      <Users size={15} />
                    </span>
                    <CheckCircle2 size={15} className={hasCast ? "text-emerald" : "text-line"} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-paper group-hover:text-brass">
                    1. Elenco y Forja
                  </p>
                  <p className="text-xs text-muted">
                    {activeFilm?.cast.length ?? 0} personajes activos
                  </p>
                </Link>

                <Link
                  to="/historia"
                  className="group card-hover rounded-2xl border border-line bg-panel-2/70 p-3 transition-all hover:border-crimson/55 hover:bg-panel-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex size-7 items-center justify-center rounded-lg bg-rose-500/15 text-crimson">
                      <ScrollText size={15} />
                    </span>
                    <CheckCircle2 size={15} className={hasStory ? "text-emerald" : "text-line"} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-paper group-hover:text-crimson">
                    2. Guion y Planos
                  </p>
                  <p className="text-xs text-muted">
                    {activeScenes.length} escenas · ~{activeSeconds}s
                  </p>
                </Link>

                <Link
                  to="/rodaje"
                  className="group card-hover rounded-2xl border border-line bg-panel-2/70 p-3 transition-all hover:border-cyan/55 hover:bg-panel-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex size-7 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan">
                      <Clapperboard size={15} />
                    </span>
                    <span className="rounded-full bg-brass/20 px-2 py-0.5 text-[10px] font-bold text-brass">
                      SET
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-paper group-hover:text-cyan">
                    3. Rodar Película
                  </p>
                  <p className="text-xs text-muted">Local o animación IA</p>
                </Link>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <Link to="/rodaje" className="control control-primary px-6">
                  <Clapperboard size={16} />
                  Entrar al Set de Rodaje
                </Link>
                <Link to="/forja" className="control control-quiet">
                  <WandSparkles size={16} className="text-brass" />
                  Forjar personaje
                </Link>
              </div>
            </div>

            {/* Live Compact Cinema Stage Preview right on Home */}
            <div>
              <Stage compact={true} />
            </div>
          </div>

          <div className="film-sprocket mt-6 opacity-80" />
        </section>

        {/* Active Cast Strip */}
        {activeFilm && activeFilm.cast.length > 0 ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold tracking-wider text-brass uppercase">
                  Reparto estelar en «{activeFilm.title || "Sin título"}»
                </p>
                <h2 className="text-2xl text-paper">Protagonistas en escena</h2>
              </div>
              <Link
                to="/elenco"
                className="inline-flex min-h-11 items-center text-xs font-medium text-brass underline decoration-brass/40 underline-offset-4 hover:text-amber-200"
              >
                Editar reparto
              </Link>
            </div>

            <HorizontalScroll
              as="ul"
              label="Reparto de la producción activa"
              className="card-carousel sm:grid-cols-3 md:grid-cols-4"
              hint
            >
              {activeFilm.cast.map((actor) => (
                <Link
                  key={actor.id}
                  to={actor.forged ? "/forja" : "/elenco"}
                  className="studio-card card-hover group block p-2.5"
                >
                  {actor.portrait ? (
                    <img
                      src={actor.portrait}
                      alt={actor.name}
                      className="aspect-[13/16] w-full rounded-xl object-cover"
                    />
                  ) : (
                    <ActorAvatarCanvas actor={actor} />
                  )}
                  <p className="mt-2 truncate text-center font-display text-sm font-semibold text-paper group-hover:text-brass">
                    {actor.name}
                  </p>
                </Link>
              ))}
            </HorizontalScroll>
          </section>
        ) : null}

        {/* 3 Creative Pillars */}
        <section className="grid gap-3.5 sm:grid-cols-3">
          <article className="studio-card stagger-item border-t-2 border-t-emerald/60 p-4">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald/15 text-emerald">
              <ShieldCheck size={18} />
            </span>
            <h2 className="mt-3 text-xl">1. Privacidad Local-First</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Tus fotos y películas viven en la base indexada de tu dispositivo. El motor de cine
              local dibuja y exporta MP4 sin subir tu rostro.
            </p>
          </article>

          <article className="studio-card stagger-item border-t-2 border-t-brass/70 p-4">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-brass/15 text-brass">
              <WandSparkles size={18} />
            </span>
            <h2 className="mt-3 text-xl">2. Vestuario y Caché Viva</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Genera retratos con trajes épicos o anime sin gastar cuota, respaldados por caché
              multinivel para traducciones y fotogramas instantáneos.
            </p>
          </article>

          <article className="studio-card stagger-item border-t-2 border-t-crimson/70 p-4">
            <span className="inline-flex size-9 items-center justify-center rounded-xl bg-crimson/15 text-crimson">
              <FilmIcon size={18} />
            </span>
            <h2 className="mt-3 text-xl">3. Dirección Automática</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Cada frase de tu historia elige escenario, iluminación, encuadre y música ambiental de
              sintetizador cinematográfico.
            </p>
          </article>
        </section>

        {/* Cartelera de Películas (IndexedDB v2 Powered) */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-wider text-brass uppercase">
                Archivo del Estudio · IndexedDB v2
              </p>
              <h2 className="text-3xl text-paper">Cartelera de producciones</h2>
            </div>
            <Button
              onClick={() => {
                newFilm();
                toast.success("Nueva producción abierta en la mesa de dirección.");
              }}
            >
              <Plus size={16} />
              Nueva película
            </Button>
          </div>

          <Combobox
            label="Producción en el set"
            value={activeId}
            onChange={setActive}
            options={films.map((item) => ({
              value: item.id,
              label: item.title || "Película sin título",
              description: `${TONE_META[item.tone].label} · ${item.cast.length} personajes`,
              keywords: item.cast.map((actor) => actor.name).join(" "),
            }))}
            placeholder="Buscar una producción…"
            emptyText="No hay producciones con ese nombre o personaje."
            className="sm:max-w-sm"
          />

          {/* Native, keyboard-accessible tone chips; scrolling never selects a chip. */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between">
            <HorizontalScroll label="Filtros de tono" className="gap-1.5" selectionKey={toneFilter}>
              {(["all", "epico", "intimo", "oscuro", "luminoso"] as const).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  aria-pressed={toneFilter === tone}
                  onClick={() => setToneFilter(tone)}
                  className="chip"
                >
                  {toneFilter === tone ? <CheckCircle2 size={13} aria-hidden="true" /> : null}
                  {tone === "all" ? "Todas" : TONE_META[tone].label}
                </button>
              ))}
            </HorizontalScroll>
            <div className="sm:w-64">
              <label htmlFor="film-search" className="mb-1.5 block text-xs font-medium text-muted">
                Buscar en la cartelera
              </label>
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
                <input
                  id="film-search"
                  type="search"
                  autoComplete="off"
                  enterKeyHint="search"
                  placeholder="Título, historia o personaje…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="field pl-9 text-xs"
                />
              </div>
            </div>
          </div>
          <p role="status" aria-live="polite" className="text-xs text-muted">
            {filteredFilms.length}{" "}
            {filteredFilms.length === 1 ? "producción encontrada" : "producciones encontradas"}
          </p>

          {/* Cards retain visible desktop actions and a named toggle on touch. */}
          <ul className="grid gap-3.5 sm:grid-cols-2">
            {filteredFilms.map((film) => {
              const isOpen = film.id === activeId;
              const meta = TONE_META[film.tone];
              const title = film.title || "Película sin título";
              const actions = (
                <>
                  <Button
                    variant="quiet"
                    size="compact"
                    aria-label={`Duplicar ${title}`}
                    onClick={() => {
                      duplicateFilm(film.id);
                      toast.success("Copia creada en la cartelera.");
                    }}
                  >
                    <Copy size={14} aria-hidden="true" />
                    Duplicar
                  </Button>
                  {films.length > 1 ? (
                    <Button
                      variant="ghost"
                      size="compact"
                      className="text-crimson"
                      aria-label={`Eliminar ${title}`}
                      onClick={() => {
                        removeFilm(film.id);
                        toast.message("Producción eliminada del archivo local.");
                      }}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Quitar
                    </Button>
                  ) : null}
                </>
              );
              return (
                <li key={film.id} className="min-w-0" aria-current={isOpen ? "true" : undefined}>
                  <SwipeActions
                    label={title}
                    actions={actions}
                    className={cn("studio-card h-full", isOpen && `border-brass/70 ${meta.glow}`)}
                  >
                    <div className="relative space-y-3 p-4 pr-14 md:pr-4">
                      <div
                        className={cn(
                          "pointer-events-none absolute inset-x-0 top-0 h-20 rounded-t-card bg-gradient-to-b opacity-80",
                          meta.gradient,
                        )}
                      />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActive(film.id)}
                          aria-pressed={isOpen}
                          aria-label={`${isOpen ? "En el set" : "Abrir producción"}: ${title}`}
                          className="min-h-11 min-w-0 w-full rounded-lg text-left"
                        >
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-brass uppercase">
                            {meta.badge}
                            {isOpen ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald/20 px-2 py-0.5 text-[10px] text-emerald">
                                <CheckCircle2 size={11} aria-hidden="true" />
                                EN SET
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 block truncate font-display text-2xl text-paper">
                            {title}
                          </span>
                        </button>
                      </div>
                      <p className="line-clamp-2 min-h-9 text-xs text-muted">
                        {film.story.trim() ||
                          "Guion en blanco — escribe qué ocurre en la pestaña Guion."}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3 text-xs">
                        <span className="text-muted">
                          {film.cast.length} {film.cast.length === 1 ? "actor" : "actores"} ·{" "}
                          {DURATION_LABEL[film.duration]}
                        </span>
                        {!isOpen ? (
                          <Button
                            variant="quiet"
                            size="compact"
                            onClick={() => setActive(film.id)}
                            aria-label={`Abrir ${title}`}
                          >
                            Abrir
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </SwipeActions>
                </li>
              );
            })}
          </ul>

          {filteredFilms.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted">
              No hay producciones que coincidan con ese filtro.
            </p>
          ) : null}
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/70 bg-panel/70 px-4 py-3 text-xs text-muted">
          <span>Tus rostros nunca salen sin activar expresamente el interruptor de envío.</span>
          <span className="flex items-center gap-3 font-medium">
            <Link
              to="/privacidad"
              className="inline-flex min-h-11 items-center text-brass hover:underline"
            >
              Política de Privacidad y Derechos ARCO
            </Link>
            <span>·</span>
            <Link
              to="/instalar"
              className="inline-flex min-h-11 items-center text-paper hover:underline"
            >
              Instalar App
            </Link>
          </span>
        </footer>
      </div>
    </>
  );
}
