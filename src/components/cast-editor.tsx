import {
  Camera,
  Check,
  Dices,
  LoaderCircle,
  Sparkles,
  Trash2,
  TriangleAlert,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { ActorAvatarCanvas } from "@/components/actor-avatar-canvas";
import { RoleChips } from "@/components/role-chips";
import { Button, type ActionStatus } from "@/components/ui/button";
import { HorizontalScroll } from "@/components/ui/horizontal-scroll";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/cn";
import { normalizeSearch } from "@/lib/ui/gestures";
import { toLook } from "@/lib/studio/look";
import { compressPhoto } from "@/lib/studio/photo";
import { ACTOR_PRESETS, ROLE_META, TRAIT_SPARKS, randomCharacterSpark } from "@/lib/studio/presets";
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
  const id = useId();
  const [draft, setDraft] = useState<Actor>(() => blankActor(forged ? "villano" : "heroe", forged));
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<"name" | "description" | "photo" | null>(null);
  const [submitStatus, setSubmitStatus] = useState<ActionStatus>("idle");
  const [photoBusy, setPhotoBusy] = useState<string | null>(null);
  const photoInFlight = useRef(false);
  const [busyActorId, setBusyActorId] = useState<string | null>(null);
  const [cancellingPortrait, setCancellingPortrait] = useState(false);
  const [portraitFeedback, setPortraitFeedback] = useState<{
    id: string;
    status: ActionStatus;
  } | null>(null);
  const portraitAbortRef = useRef<AbortController | null>(null);
  const portraitInFlight = useRef(false);

  useEffect(() => () => portraitAbortRef.current?.abort(), []);

  const people = (film?.cast ?? []).filter((actor) => actor.forged === forged);
  const full = (film?.cast.length ?? 0) >= 6;
  const draftLook = toLook(draft);
  const qwen = qwenAllowance();
  const selectedPreset =
    ACTOR_PRESETS.find(
      (preset) => preset.description === draft.description && preset.role === draft.role,
    )?.title ?? "";

  function fail(message: string, field: typeof errorField) {
    setError(message);
    setErrorField(field);
    setSubmitStatus("error");
    document.getElementById(`${id}-${field}`)?.focus();
  }

  async function onFile(file: File | undefined, apply: (photo: string) => void, target: string) {
    if (!file || photoInFlight.current) return;
    photoInFlight.current = true;
    setPhotoBusy(target);
    try {
      const compressed = await compressPhoto(file);
      apply(compressed);
      setError("");
      setErrorField(null);
      toast.success("Foto procesada localmente en tu dispositivo.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Esa foto no se pudo leer. Prueba con una foto JPG o PNG.";
      if (target === "draft") fail(message, "photo");
      else toast.error(message);
    } finally {
      photoInFlight.current = false;
      setPhotoBusy(null);
    }
  }

  function appendTrait(trait: string) {
    if (normalizeSearch(draft.description).includes(normalizeSearch(trait))) return;
    const current = draft.description.trim();
    setDraft({ ...draft, description: current ? `${current}, ${trait}` : trait });
  }

  function applySurprise() {
    const spark = randomCharacterSpark(draft.role);
    setDraft({ ...draft, name: draft.name.trim() || spark.name, description: spark.description });
    setError("");
    setSubmitStatus("idle");
  }

  async function generatePortrait(actor: Actor) {
    if (portraitInFlight.current) return;
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

    const controller = new AbortController();
    portraitAbortRef.current = controller;
    portraitInFlight.current = true;
    setBusyActorId(actor.id);
    setCancellingPortrait(false);
    setPortraitFeedback(null);
    try {
      const portrait = await dressPhoto(
        actor.photo,
        portraitPrompt(actor),
        controller.signal,
        actor.role === "anime" ? "Photo-to-Anime" : "Anything2Real",
      );
      if (controller.signal.aborted) return;
      bumpQwen(slot.key);
      updateActor(actor.id, (current) => ({ ...current, portrait }));
      setPortraitFeedback({ id: actor.id, status: "success" });
      toast.success("Retrato IA listo y guardado localmente en tu personaje.");
    } catch (err) {
      if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError"))
        return;
      setPortraitFeedback({ id: actor.id, status: "error" });
      toast.error(err instanceof Error ? err.message : "No se pudo crear el retrato.");
    } finally {
      portraitInFlight.current = false;
      setBusyActorId(null);
      setCancellingPortrait(false);
      portraitAbortRef.current = null;
    }
  }

  return (
    <div className="space-y-6">
      <form
        className="studio-card overflow-hidden p-4 sm:p-6"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (full) {
            fail("El elenco está completo (6/6). Quita un personaje para añadir otro.", null);
            return;
          }
          if (!draft.name.trim()) {
            fail("Ponle un nombre memorable a tu personaje.", "name");
            return;
          }
          if (!draft.description.trim()) {
            fail(
              forged
                ? "Describe los colores, emblema y poder del personaje."
                : "Describe en qué héroe, villano o anime se transforma.",
              "description",
            );
            return;
          }
          addActor({ ...draft, name: draft.name.trim(), description: draft.description.trim() });
          setDraft(blankActor(draft.role, forged));
          setError("");
          setErrorField(null);
          setSubmitStatus("success");
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
          <Button variant="quiet" size="compact" onClick={applySurprise}>
            <Dices size={15} className="text-brass" />
            ¡Sorpréndeme!
          </Button>
        </div>

        <div className="grid gap-5 md:grid-cols-[230px_1fr]">
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

          <div className="min-w-0 space-y-3.5">
            <RoleChips value={draft.role} onChange={(role) => setDraft({ ...draft, role })} />
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted">Arquetipos rápidos (1 clic):</p>
              <HorizontalScroll label="Arquetipos rápidos" selectionKey={selectedPreset}>
                {ACTOR_PRESETS.map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    aria-pressed={selectedPreset === preset.title}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        role: preset.role,
                        name: draft.name.trim() || preset.name,
                        description: preset.description,
                      })
                    }
                    className="chip"
                  >
                    {selectedPreset === preset.title ? (
                      <Check size={12} aria-hidden="true" />
                    ) : (
                      <Sparkles size={12} className="text-brass" aria-hidden="true" />
                    )}
                    {preset.title}
                  </button>
                ))}
              </HorizontalScroll>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={`${id}-name`} className="block text-xs font-medium text-muted">
                  Nombre en pantalla
                </label>
                <input
                  id={`${id}-name`}
                  className="field mt-1.5"
                  maxLength={60}
                  required
                  aria-invalid={errorField === "name" || undefined}
                  aria-describedby={errorField === "name" ? `${id}-error` : undefined}
                  placeholder="Ej. Sol Varela, Akira, Sombra…"
                  value={draft.name}
                  onChange={(event) => {
                    setDraft({ ...draft, name: event.target.value });
                    if (errorField === "name") setErrorField(null);
                  }}
                />
              </div>
              <div>
                <label htmlFor={`${id}-photo`} className="block text-xs font-medium text-muted">
                  {forged ? "Rostro opcional (local)" : "Foto de frente (local)"}
                </label>
                <span className="mt-1.5 flex min-h-11 items-center justify-between gap-2 rounded-[0.95rem] border border-dashed border-brass/50 bg-panel-2/60 px-3 py-1.5 text-xs text-paper transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brass hover:border-brass">
                  <span className="flex min-w-0 items-center gap-2">
                    {photoBusy === "draft" ? (
                      <LoaderCircle
                        size={15}
                        className="loading-spinner shrink-0 text-brass"
                        aria-hidden="true"
                      />
                    ) : (
                      <Camera size={15} className="shrink-0 text-brass" aria-hidden="true" />
                    )}
                    <span className="truncate" role="status">
                      {photoBusy === "draft"
                        ? "Procesando foto…"
                        : draft.photo
                          ? "Cambiar foto cargada"
                          : "Subir JPG / PNG / WebP"}
                    </span>
                  </span>
                  <input
                    id={`${id}-photo`}
                    className="sr-only"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
                    capture="user"
                    disabled={photoBusy !== null}
                    aria-invalid={errorField === "photo" || undefined}
                    aria-describedby={errorField === "photo" ? `${id}-error` : undefined}
                    onChange={(event) => {
                      void onFile(
                        event.target.files?.[0],
                        (photo) => setDraft({ ...draft, photo }),
                        "draft",
                      );
                      event.target.value = "";
                    }}
                  />
                </span>
              </div>
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
                    className="mt-1 block w-full accent-brass"
                  />
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDraft({ ...draft, photo: null })}
                  aria-label="Quitar foto"
                  title="Quitar foto"
                >
                  <X size={16} />
                </Button>
              </div>
            ) : null}

            <div>
              <label htmlFor={`${id}-description`} className="block text-xs font-medium text-muted">
                Traje, colores, emblema y poder
              </label>
              <textarea
                id={`${id}-description`}
                className="field mt-1.5 min-h-24 text-sm"
                maxLength={600}
                required
                aria-invalid={errorField === "description" || undefined}
                aria-describedby={errorField === "description" ? `${id}-error` : undefined}
                placeholder={
                  forged
                    ? "Describe colores, poder, capa y silueta. Ej: armadura dorada y carmesí, emblema de rayo, cabello en puntas."
                    : "En qué héroe, villano o anime se convierte. Ej: capa marfil, emblema de sol, aura luminosa."
                }
                value={draft.description}
                onChange={(event) => {
                  setDraft({ ...draft, description: event.target.value });
                  if (errorField === "description") setErrorField(null);
                }}
              />
            </div>
            <HorizontalScroll label="Rasgos para añadir al personaje">
              {TRAIT_SPARKS.map((spark) => {
                const included = normalizeSearch(draft.description).includes(
                  normalizeSearch(spark),
                );
                return (
                  <button
                    key={spark}
                    type="button"
                    aria-pressed={included}
                    onClick={() => appendTrait(spark)}
                    className="chip"
                  >
                    {included ? (
                      <Check size={12} aria-hidden="true" />
                    ) : (
                      <span aria-hidden="true">+</span>
                    )}
                    {spark}
                  </button>
                );
              })}
            </HorizontalScroll>

            <div className="space-y-2 pt-1">
              <Button
                type="submit"
                disabled={full || photoBusy === "draft"}
                loading={photoBusy === "draft"}
                loadingLabel="Preparando foto…"
                status={submitStatus}
                successLabel="Personaje añadido"
                errorLabel="Revisa los campos"
              >
                <WandSparkles size={16} />
                Sumar al elenco ({film?.cast.length ?? 0}/6)
              </Button>
              {full ? (
                <p className="text-xs text-muted">
                  Elenco completo. Quita un personaje para sumar otro.
                </p>
              ) : null}
              {error ? (
                <p
                  id={`${id}-error`}
                  role="alert"
                  className="flex items-start gap-1.5 text-xs font-medium text-crimson"
                >
                  <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </form>

      {people.some((person) => person.photo) ? (
        <Toggle
          checked={photoConsent}
          onChange={(photo) => setConsentFlags({ photo })}
          accent="emerald"
          label="Autorizo enviar la foto al generar «Retrato IA gratis»"
          hint={`Sin este interruptor tu foto jamás sale del dispositivo. Retratos IA disponibles hoy: ${Math.max(0, qwen.max - qwen.used)} de ${qwen.max}.`}
        />
      ) : null}

      {people.length > 0 ? (
        <HorizontalScroll
          as="ul"
          label={forged ? "Personajes de la Forja" : "Personajes con foto"}
          className="card-carousel"
          hint
        >
          {people.map((actor) => {
            const look = toLook(actor);
            const roleMeta = ROLE_META[actor.role];
            const isBusy = busyActorId === actor.id;
            return (
              <li
                key={actor.id}
                className="studio-card card-hover flex flex-col justify-between gap-4 p-4"
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
                      <>
                        <Button
                          variant="quiet"
                          size="compact"
                          loading={isBusy}
                          loadingLabel="Creando retrato…"
                          status={
                            portraitFeedback?.id === actor.id ? portraitFeedback.status : "idle"
                          }
                          successLabel="Retrato listo"
                          errorLabel="Reintentar retrato"
                          disabled={!photoConsent || (busyActorId !== null && !isBusy)}
                          onClick={() => generatePortrait(actor)}
                          aria-label={`Retrato IA de ${actor.name}`}
                        >
                          <Sparkles size={14} className="text-brass" />
                          {actor.portrait ? "Renovar retrato IA" : "Retrato IA gratis"}
                        </Button>
                        {isBusy ? (
                          <Button
                            variant="ghost"
                            size="compact"
                            loading={cancellingPortrait}
                            loadingLabel="Cancelando…"
                            onClick={() => {
                              setCancellingPortrait(true);
                              portraitAbortRef.current?.abort();
                            }}
                          >
                            Cancelar
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <label
                        className={cn(
                          "control control-quiet control-compact cursor-pointer",
                          photoBusy !== null && "opacity-50",
                        )}
                      >
                        {photoBusy === actor.id ? (
                          <LoaderCircle size={14} className="loading-spinner" aria-hidden="true" />
                        ) : (
                          <Camera size={14} className="text-brass" aria-hidden="true" />
                        )}
                        <span role="status">
                          {photoBusy === actor.id ? "Procesando…" : "Añadir rostro"}
                        </span>
                        <input
                          type="file"
                          aria-label={`Añadir rostro a ${actor.name}`}
                          accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
                          className="sr-only"
                          disabled={photoBusy !== null}
                          onChange={(event) => {
                            void onFile(
                              event.target.files?.[0],
                              (photo) => updateActor(actor.id, (curr) => ({ ...curr, photo })),
                              actor.id,
                            );
                            event.target.value = "";
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="compact"
                    onClick={() => {
                      removeActor(actor.id);
                      toast.message(`${actor.name} eliminado del elenco.`);
                    }}
                    className="text-muted hover:text-crimson"
                    aria-label={`Quitar a ${actor.name} del elenco`}
                  >
                    <Trash2 size={14} />
                    Quitar
                  </Button>
                </div>
              </li>
            );
          })}
        </HorizontalScroll>
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
