import { Camera, Dices, Sparkles, Trash2, WandSparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ActorAvatarCanvas } from "@/components/actor-avatar-canvas";
import { RoleChips } from "@/components/role-chips";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/cn";
import { toLook } from "@/lib/studio/look";
import { compressPhoto } from "@/lib/studio/photo";
import {
  ACTOR_PRESETS,
  ROLE_META,
  TRAIT_SPARKS,
  randomCharacterSpark,
} from "@/lib/studio/presets";
import { portraitPrompt } from "@/lib/studio/prompt";
import { bumpQwen, dressPhoto, qwenAllowance } from "@/lib/studio/qwen";
import { blankActor, useStudio } from "@/lib/studio/store";
import type { Actor } from "@/lib/studio/types";

function bustLine(text: string): string {
  const clean = text.trim();
  return clean.length > 155 ? `${clean.slice(0, 152)}…` : clean;
}

export function CastEditor({ forged }: { forged: boolean }) {
  const film = useStudio((s) => s.films.find((item) => item.id === s.activeId));
  const photoConsent = useStudio((s) => s.photoShareConsent);
  const setConsentFlags = useStudio((s) => s.setConsentFlags);
  const addActor = useStudio((s) => s.addActor);
  const updateActor = useStudio((s) => s.updateActor);
  const removeActor = useStudio((s) => s.removeActor);

  const [draft, setDraft] = useState<Actor>(() =>
    blankActor(forged ? "villano" : "heroe", forged),
  );
  const [error, setError] = useState("");
  const [busyActorId, setBusyActorId] = useState<string | null>(null);
  const portraitAbortRef = useRef<AbortController | null>(null);

  const people = (film?.cast ?? []).filter((actor) => actor.forged === forged);
  const draftLook = toLook(draft);
  const qwen = qwenAllowance();

  async function onFile(file: File | undefined, apply: (photo: string) => void) {
    if (!file) return;
    try {
      const compressed = await compressPhoto(file);
      apply(compressed);
      setError("");
      toast.success("Foto procesada localmente en tu dispositivo.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Esa foto no se pudo leer. Prueba con una foto JPG o PNG.",
      );
    }
  }

  function appendTrait(trait: string) {
    const current = draft.description.trim();
    if (current.toLowerCase().includes(trait.toLowerCase())) return;
    const next = current ? `${current}, ${trait}` : trait;
    setDraft({ ...draft, description: next });
  }

  function applySurprise() {
    const spark = randomCharacterSpark(draft.role);
    setDraft({
      ...draft,
      name: draft.name.trim() || spark.name,
      description: spark.description,
    });
    setError("");
  }

  async function generatePortrait(actor: Actor) {
    if (!actor.photo) {
      toast.error("Añade primero una foto a este personaje.");
      return;
    }
    if (!photoConsent) {
      toast.error("Activa primero el consentimiento expreso para enviar la foto al modelo.");
      return;
    }
    const slot = qwenAllowance();
    if (!slot.ok) {
      toast.error(`Hoy ya usaste tus ${slot.max} retratos gratis. Se renuevan mañana.`);
      return;
    }

    portraitAbortRef.current?.abort();
    const controller = new AbortController();
    portraitAbortRef.current = controller;
    setBusyActorId(actor.id);

    try {
      const portrait = await dressPhoto(
        actor.photo,
        portraitPrompt(actor),
        controller.signal,
        actor.role === "anime" ? "Photo-to-Anime" : "Anything2Real",
      );
      bumpQwen(slot.key);
      updateActor(actor.id, (current) => ({ ...current, portrait }));
      toast.success("Retrato IA listo y guardado localmente en tu personaje.");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(err instanceof Error ? err.message : "No se pudo crear el retrato.");
    } finally {
      setBusyActorId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Live Character Designer Console */}
      <form
        className="studio-card overflow-hidden p-4 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.name.trim()) {
            setError("Ponle un nombre memorable a tu personaje.");
            return;
          }
          if (!draft.description.trim()) {
            setError(
              forged
                ? "Describe los colores, emblema y poder del personaje."
                : "Describe en qué héroe, villano o anime se transforma.",
            );
            return;
          }
          addActor({
            ...draft,
            name: draft.name.trim(),
            description: draft.description.trim(),
          });
          setDraft(blankActor(draft.role, forged));
          setError("");
          toast.success("Personaje sumado a la producción.");
        }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold tracking-wider text-brass uppercase">
              {forged ? "Mesa de Diseño Original" : "Cabina de Casting"}
            </span>
            <h2 className="mt-0.5 text-2xl text-paper">
              {forged ? "Moldea un personaje inédito" : "Transforma a una persona real"}
            </h2>
          </div>
          <Button variant="quiet" onClick={applySurprise} className="min-h-9 px-3.5 text-xs">
            <Dices size={15} className="text-brass" />
            ¡Sorpréndeme!
          </Button>
        </div>

        <div className="grid gap-5 md:grid-cols-[230px_1fr]">
          {/* Live Procedural Character Preview */}
          <div className="space-y-2.5">
            <ActorAvatarCanvas actor={draft} animate={true} />
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
              <span className="rounded-full border border-brass/35 bg-brass/12 px-2.5 py-0.5 font-medium text-brass">
                Poder: {draftLook.power}
              </span>
              <span className="rounded-full border border-violet-400/35 bg-violet-500/12 px-2.5 py-0.5 font-medium text-violet-200">
                Emblema: {draftLook.emblem}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-3.5">
            <RoleChips value={draft.role} onChange={(role) => setDraft({ ...draft, role })} />

            {/* Quick Archetype Presets */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">
                Arquetipos rápidos (1 clic):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ACTOR_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...draft,
                        role: preset.role,
                        name: draft.name.trim() || preset.name,
                        description: preset.description,
                      })
                    }
                    className="rounded-full border border-line bg-panel-2/80 px-3 py-1 text-xs text-paper transition-colors hover:border-brass/60 hover:text-brass"
                  >
                    <Sparkles size={11} className="mr-1 inline text-brass" />
                    {preset.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-muted">
                Nombre en pantalla
                <input
                  className="field mt-1.5"
                  maxLength={60}
                  placeholder="Ej. Sol Varela, Akira, Sombra…"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </label>

              <label className="block text-xs font-medium text-muted">
                {forged ? "Rostro opcional (local)" : "Foto de frente (local)"}
                <span className="mt-1.5 flex min-h-[2.85rem] items-center justify-between gap-2 rounded-[0.95rem] border border-dashed border-brass/50 bg-panel-2/60 px-3 py-1.5 text-xs text-paper transition-colors hover:border-brass">
                  <span className="flex items-center gap-2 truncate">
                    <Camera size={15} className="shrink-0 text-brass" />
                    <span className="truncate">
                      {draft.photo ? "Cambiar foto cargada" : "Subir JPG / PNG / WebP"}
                    </span>
                  </span>
                  <input
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
                    capture="user"
                    onChange={(event) =>
                      void onFile(event.target.files?.[0], (photo) =>
                        setDraft({ ...draft, photo }),
                      )
                    }
                  />
                </span>
              </label>
            </div>

            {draft.photo ? (
              <div className="flex items-center gap-3 rounded-2xl border border-line bg-panel-2/50 px-3 py-2">
                <img
                  src={draft.photo}
                  alt="Rostro seleccionado"
                  className="size-12 shrink-0 rounded-full border border-brass/50 object-cover"
                />
                <label className="min-w-0 flex-1 text-xs text-muted">
                  Encuadre vertical del rostro
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={draft.frame}
                    onChange={(e) => setDraft({ ...draft, frame: Number(e.target.value) })}
                    className="mt-1 block h-6 w-full accent-brass"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, photo: null })}
                  className="rounded-full p-1.5 text-muted hover:bg-panel hover:text-crimson"
                  title="Quitar foto"
                >
                  <X size={15} />
                </button>
              </div>
            ) : null}

            <label className="block text-xs font-medium text-muted">
              Traje, colores, emblema y poder
              <textarea
                className="field mt-1.5 min-h-24 text-sm"
                maxLength={600}
                placeholder={
                  forged
                    ? "Describe colores, poder, capa y silueta. Ej: armadura dorada y carmesí, emblema de rayo, cabello en puntas."
                    : "En qué héroe, villano o anime se convierte. Ej: capa marfil, emblema de sol, aura luminosa."
                }
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </label>

            {/* Trait Spark Pills */}
            <div className="flex flex-wrap gap-1.5">
              {TRAIT_SPARKS.map((spark) => (
                <button
                  key={spark}
                  type="button"
                  onClick={() => appendTrait(spark)}
                  className="rounded-full border border-line/80 bg-ink/60 px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-cyan/50 hover:text-cyan"
                >
                  + {spark}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button type="submit">
                <WandSparkles size={16} />
                Sumar al elenco ({(film?.cast.length ?? 0)}/6)
              </Button>
              {error ? <p className="text-xs font-medium text-crimson">{error}</p> : null}
            </div>
          </div>
        </div>
      </form>

      {/* Consent Gate for Optional AI Portrait Dressing */}
      {people.some((p) => p.photo) ? (
        <div className="space-y-2">
          <Toggle
            checked={photoConsent}
            onChange={(photo) => setConsentFlags({ photo })}
            accent="emerald"
            label="Autorizo enviar la foto al generar «Retrato IA gratis»"
            hint={`Sin este interruptor tu foto jamás sale del dispositivo. Retratos IA disponibles hoy: ${Math.max(0, qwen.max - qwen.used)} de ${qwen.max}.`}
          />
        </div>
      ) : null}

      {/* Cast Trading Cards Grid */}
      {people.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {people.map((actor) => {
            const look = toLook(actor);
            const roleMeta = ROLE_META[actor.role];
            const isBusy = busyActorId === actor.id;
            return (
              <li
                key={actor.id}
                className="studio-card flex flex-col justify-between gap-4 p-4"
              >
                <div className="grid grid-cols-[108px_1fr] gap-3.5">
                  {actor.portrait ? (
                    <img
                      src={actor.portrait}
                      alt={`Retrato de ${actor.name}`}
                      className="aspect-[13/16] w-full rounded-2xl border border-brass/40 object-cover"
                    />
                  ) : (
                    <ActorAvatarCanvas actor={actor} animate={false} />
                  )}

                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                          roleMeta.chipClass,
                        )}
                      >
                        {roleMeta.label}
                      </span>
                      <span className="rounded-full border border-line bg-panel-2 px-2 py-0.5 text-[11px] text-muted">
                        {look.power}
                      </span>
                    </div>

                    <h3 className="truncate font-display text-xl text-paper">{actor.name}</h3>
                    <p className="text-xs leading-relaxed text-muted">
                      {bustLine(actor.description)}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-3">
                  <div className="flex flex-wrap gap-2">
                    {actor.photo ? (
                      isBusy ? (
                        <Button
                          variant="quiet"
                          onClick={() => {
                            portraitAbortRef.current?.abort();
                            setBusyActorId(null);
                          }}
                          className="min-h-9 px-3.5 text-xs"
                        >
                          Cancelar retrato…
                        </Button>
                      ) : (
                        <Button
                          variant="quiet"
                          disabled={!photoConsent}
                          onClick={() => void generatePortrait(actor)}
                          className="min-h-9 px-3.5 text-xs"
                        >
                          <Sparkles size={14} className="text-brass" />
                          {actor.portrait ? "Renovar retrato IA" : "Retrato IA gratis"}
                        </Button>
                      )
                    ) : (
                      <label className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-panel-2 px-3.5 text-xs text-paper hover:border-brass/50">
                        <Camera size={13} className="text-brass" />
                        Añadir rostro
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
                          className="sr-only"
                          onChange={(e) =>
                            void onFile(e.target.files?.[0], (photo) =>
                              updateActor(actor.id, (curr) => ({ ...curr, photo })),
                            )
                          }
                        />
                      </label>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => removeActor(actor.id)}
                    className="min-h-9 px-3 text-xs text-muted hover:text-crimson"
                  >
                    <Trash2 size={14} />
                    Quitar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="studio-card border-dashed p-6 text-center">
          <p className="font-display text-xl text-paper">
            {forged
              ? "La Forja está lista para tu primera leyenda"
              : "El escenario espera a sus protagonistas"}
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-muted">
            Usa uno de los arquetipos rápidos de arriba o pulsa «¡Sorpréndeme!» para darle vida
            instantánea a un personaje.
          </p>
        </div>
      )}
    </div>
  );
}
