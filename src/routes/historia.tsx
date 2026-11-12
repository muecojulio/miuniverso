import { createFileRoute, Link } from "@tanstack/react-router";
import { Clapperboard, Film as FilmIcon, ScrollText, Sparkles, UserPlus } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { ChoiceRow } from "@/components/role-chips";
import { Shell } from "@/components/shell";
import { cn } from "@/lib/cn";
import { direct } from "@/lib/studio/director";
import {
  MOTION_LABEL,
  PLACE_META,
  STORY_TEMPLATES,
  TONE_META,
} from "@/lib/studio/presets";
import { useStudio } from "@/lib/studio/store";
import { TONE_LABEL, type Tone } from "@/lib/studio/types";

export const Route = createFileRoute("/historia")({ component: Historia });

const SCENE_SPARKS = [
  "En la azotea de la ciudad bajo el rayo.",
  "En el cosmos estelar se abre un portal dorado.",
  "En el antiguo templo las sombras retroceden.",
  "Sobre el océano ambos desatan su aura.",
];

function Historia() {
  const film = useStudio((s) => s.films.find((item) => item.id === s.activeId));
  const setTitle = useStudio((s) => s.setTitle);
  const setStory = useStudio((s) => s.setStory);
  const setTone = useStudio((s) => s.setTone);

  const scenes = useMemo(() => (film ? direct(film) : []), [film]);

  if (!film) return null;

  const toneMeta = TONE_META[film.tone];

  function insertSnippet(snippet: string) {
    if (!film) return;
    const base = film.story.trim();
    const separator = base && !/[.!?…]$/.test(base) ? ". " : base ? " " : "";
    setStory(`${base}${separator}${snippet}`);
  }

  return (
    <Shell>
      <div className="space-y-6">
        <header className="studio-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-brass uppercase">
                <ScrollText size={14} />
                SALA DE GUIONISTAS · STORYBOARD VIVO
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl">Escribe qué ocurre</h1>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Escribe en frases cortas. Cada oración se convierte en una escena dirigida: si
                nombras a alguien de tu elenco, la cámara lo enfoca automáticamente.
              </p>
            </div>
            <Link
              to="/rodaje"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-amber-300 via-brass to-amber-500 px-4 text-xs font-semibold text-ink shadow"
            >
              <Clapperboard size={14} />
              Llevar a Rodaje
            </Link>
          </div>
        </header>

        {/* 1-Click Story Inspiration Templates */}
        <section className="space-y-2.5">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">
            Plantillas cinematográficas (adaptadas a tu elenco):
          </p>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {STORY_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  setTitle(tpl.title);
                  setTone(tpl.tone);
                  setStory(tpl.build(film.cast));
                  toast.success(`Guion «${tpl.label}» cargado en escena.`);
                }}
                className="studio-card group p-3.5 text-left transition-all hover:border-brass/60"
              >
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-brass">
                  <Sparkles size={12} />
                  {TONE_LABEL[tpl.tone]}
                </span>
                <p className="mt-1 font-display text-base font-semibold text-paper group-hover:text-brass">
                  {tpl.label}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">{tpl.title}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Main Script Editor */}
        <section className="studio-card space-y-4 p-5 sm:p-6">
          <label className="block text-xs font-medium text-muted">
            Título de la película
            <input
              className="field mt-1.5 font-display text-lg"
              maxLength={100}
              placeholder="Ej. Amanecer en la azotea"
              value={film.title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-muted">Atmósfera y tono visual</p>
              <span className="text-xs text-brass">{toneMeta.subtitle}</span>
            </div>
            <ChoiceRow
              columns={4}
              value={film.tone}
              onChange={(tone: Tone) => setTone(tone)}
              options={(Object.keys(TONE_LABEL) as Tone[]).map((id) => ({
                id,
                label: TONE_LABEL[id],
              }))}
            />
          </div>

          {/* Clickable Cast Mention Chips */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted">
              Toca un personaje o chispa escénica para insertarlo en el guion:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {film.cast.map((actor) => (
                <button
                  key={actor.id}
                  type="button"
                  onClick={() => insertSnippet(`${actor.name} entra en escena.`)}
                  className="inline-flex items-center gap-1 rounded-full border border-brass/40 bg-brass/12 px-3 py-1 text-xs font-medium text-brass hover:bg-brass/20"
                >
                  <UserPlus size={12} />
                  {actor.name}
                </button>
              ))}
              {SCENE_SPARKS.map((spark) => (
                <button
                  key={spark}
                  type="button"
                  onClick={() => insertSnippet(spark)}
                  className="rounded-full border border-line bg-panel-2/80 px-3 py-1 text-xs text-muted hover:border-cyan/50 hover:text-cyan"
                >
                  + {spark}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-xs font-medium text-muted">
            Guion escena por escena ({film.story.length}/2400 caracteres)
            <textarea
              className="field mt-1.5 min-h-52 text-sm leading-relaxed"
              maxLength={2400}
              value={film.story}
              placeholder="En la azotea, Ana abre los ojos. Bruno sale de la sombra. Los dos chocan. Al final, el horizonte se queda en calma."
              onChange={(event) => setStory(event.target.value)}
            />
          </label>
        </section>

        {/* Live Storyboard Strip */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold tracking-wider text-cyan uppercase">
                Desglose del Director en Tiempo Real
              </p>
              <h2 className="text-2xl text-paper">Storyboard automático ({scenes.length} planos)</h2>
            </div>
          </div>

          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scenes.map((scene, index) => {
              const place = PLACE_META[scene.place];
              const featuredNames = scene.focusIds
                .map((id) => film.cast.find((c) => c.id === id)?.name)
                .filter(Boolean)
                .join(", ");
              return (
                <li
                  key={`${scene.kind}-${index}`}
                  className="studio-card flex flex-col justify-between gap-3 p-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="inline-flex items-center gap-1 font-mono text-brass">
                        <FilmIcon size={12} />
                        {scene.start.toFixed(1)}s – {scene.end.toFixed(1)}s
                      </span>
                      <span className={cn("rounded-full border px-2 py-0.5", place.color)}>
                        {place.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-paper">
                      {scene.kind === "title"
                        ? `Cartel inicial: «${scene.line}»`
                        : scene.kind === "end"
                          ? "Cartel de cierre: Fin y créditos"
                          : scene.line}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-muted">
                    <span>{MOTION_LABEL[scene.motion]}</span>
                    <span className="truncate font-medium text-paper/80">
                      {featuredNames || "Plano general"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </Shell>
  );
}
