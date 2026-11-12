import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Clapperboard,
  Download,
  LoaderCircle,
  TriangleAlert,
  Film as FilmIcon,
  RotateCcw,
  Sparkles,
  Users,
  WandSparkles,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChoiceRow } from "@/components/role-chips";
import { Stage } from "@/components/stage";
import { Button, type ActionStatus } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { FRAME_H, FRAME_W } from "@/lib/studio/draw";
import { encodeFilm, shareOrSave } from "@/lib/studio/encode";
import {
  bumpFreeAllowance,
  fetchFreeStill,
  freeAllowance,
  loadCastFaces,
  makePlate,
  paintFreeTake,
  sceneBeats,
  type FacePlace,
  type FreePlate,
} from "@/lib/studio/free-film";
import { loadImage } from "@/lib/studio/photo";
import { motionLine, realPersonPrompt } from "@/lib/studio/prompt";
import { bumpQwen, dressPhoto, qwenAllowance } from "@/lib/studio/qwen";
import { safeFilename } from "@/lib/studio/security";
import { useStudio } from "@/lib/studio/store";
import { translateBackground } from "@/lib/studio/translate";
import { DURATION_LABEL, type Duration, type Film } from "@/lib/studio/types";
import { animateStill, bumpWan, wanAllowance } from "@/lib/studio/wan";

export const Route = createFileRoute("/rodaje")({ component: Rodaje });

const ZERO: FacePlace = { x: 0, y: 0, scale: 0 };
type RodajeJob = "movie" | "still" | "look" | "animate" | "assemble";

function Rodaje() {
  const film = useStudio((s) => s.films.find((item) => item.id === s.activeId));
  const consent = useStudio((s) => s.textShareConsent);
  const photoConsent = useStudio((s) => s.photoShareConsent);
  const setConsentFlags = useStudio((s) => s.setConsentFlags);
  const setDuration = useStudio((s) => s.setDuration);
  const setFlag = useStudio((s) => s.setFlag);
  const updateActor = useStudio((s) => s.updateActor);

  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const [fromPhoto, setFromPhoto] = useState(false);
  const [phase, setPhase] = useState("");
  const [activeJob, setActiveJob] = useState<RodajeJob | null>(null);
  const jobLock = useRef<RodajeJob | null>(null);
  const [failedJob, setFailedJob] = useState<RodajeJob | null>(null);
  const [jobError, setJobError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [saveStatus, setSaveStatus] = useState<ActionStatus>("idle");
  const [video, setVideo] = useState("");
  const [clip, setClip] = useState<Blob | null>(null);
  const [plates, setPlates] = useState<FreePlate[]>([]);
  const [nudge, setNudge] = useState<FacePlace>(ZERO);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !plates.length) return;
    canvas.width = FRAME_W;
    canvas.height = FRAME_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintFreeTake(ctx, plates, nudge, 1.2, 8, false);
  }, [plates, nudge]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  if (!film) return null;

  const freeQuota = freeAllowance();
  const qwenQuota = qwenAllowance();
  const wanQuota = wanAllowance();

  function retake() {
    if (video) URL.revokeObjectURL(video);
    setVideo("");
    setClip(null);
  }

  function beginJob(kind: RodajeJob): AbortController | null {
    if (jobLock.current) return null;
    const controller = new AbortController();
    jobLock.current = kind;
    abortRef.current = controller;
    setActiveJob(kind);
    setFailedJob(null);
    setJobError("");
    setCancelling(false);
    return controller;
  }

  function finishJob(kind: RodajeJob) {
    if (jobLock.current !== kind) return;
    jobLock.current = null;
    abortRef.current = null;
    setActiveJob(null);
    setPhase("");
    setCancelling(false);
  }

  function failJob(kind: RodajeJob, error: unknown, fallback: string) {
    if (error instanceof DOMException && error.name === "AbortError") return;
    const message =
      error instanceof Error && !(error instanceof TypeError) ? error.message : fallback;
    setFailedJob(kind);
    setJobError(message);
    toast.error(message);
  }

  function cancelActiveJob() {
    if (!abortRef.current || cancelling) return;
    setCancelling(true);
    setPhase("Cancelando la operación…");
    abortRef.current.abort();
    toast.message("Operación cancelada.");
  }

  async function animate() {
    if (!film) return;
    const canvas = previewRef.current;
    if (!canvas || !plates.length) {
      toast.error("Primero genera un plano en la cabina.");
      return;
    }
    if (!photoConsent) {
      toast.error("Activa el interruptor si autorizas enviar la imagen para animarla.");
      return;
    }
    const slot = wanAllowance();
    if (!slot.ok) {
      toast.error(`Hoy ya animaste tus ${slot.max} videos gratis.`);
      return;
    }
    const controller = beginJob("animate");
    if (!controller) return;
    setPhase("Animando el plano con movimiento cinematográfico…");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (file) => (file ? resolve(file) : reject(new Error("No se pudo leer el plano."))),
          "image/jpeg",
          0.9,
        );
      });
      const url = await animateStill(blob, controller.signal, motionLine(film));
      bumpWan(slot.key);
      const filmFile = await fetch(url, {
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });
      if (!filmFile.ok) throw new Error("El video llegó, pero no se pudo abrir.");
      const movie = await filmFile.blob();
      setClip(movie);
      setVideo(URL.createObjectURL(movie));
      setPhase("");
      toast.success("¡Toma animada lista!");
    } catch (error) {
      setPhase("");
      if (error instanceof DOMException && error.name === "AbortError") return;
      failJob("animate", error, "No se pudo animar el plano.");
    } finally {
      finishJob("animate");
    }
  }

  async function lookReal() {
    if (!film) return;
    if (!photoConsent) {
      toast.error("Activa el interruptor si autorizas enviar la foto al vestidor IA.");
      return;
    }
    const people = film.cast.filter((actor) => actor.photo);
    if (!people.length) {
      toast.error("Añade primero una foto en Elenco para vestir un rostro real.");
      return;
    }
    const slot = qwenAllowance();
    if (slot.used + people.length > slot.max) {
      toast.error(`Hoy ya no quedan retratos gratis suficientes (máximo ${slot.max}).`);
      return;
    }
    const controller = beginJob("look");
    if (!controller) return;
    retake();
    setPlates([]);
    try {
      const next: FreePlate[] = [];
      for (let i = 0; i < people.length; i++) {
        if (controller.signal.aborted) return;
        const actor = people[i];
        if (!actor?.photo) continue;
        setPhase(`Vistiendo a ${actor.name || `persona ${i + 1}`}…`);
        const image = await dressPhoto(
          actor.photo,
          realPersonPrompt(actor),
          controller.signal,
          actor.role === "anime" ? "Photo-to-Anime" : "Anything2Real",
        );
        bumpQwen(slot.key);
        updateActor(actor.id, (current) => ({ ...current, portrait: image }));
        const still = await loadImage(image);
        next.push(makePlate(still, actor.id, undefined, { x: 0.5, y: 0.4 }));
      }
      setNudge(ZERO);
      setFromPhoto(true);
      setPlates(next);
      setPhase("");
      toast.success("Vestuario listo y guardado en tu elenco.");
    } catch (error) {
      setPhase("");
      if (error instanceof DOMException && error.name === "AbortError") return;
      failJob("look", error, "No se pudo vestir a la persona.");
    } finally {
      finishJob("look");
    }
  }

  async function makeMovie() {
    if (!film) return;
    if (!(
      film.story.trim() ||
      film.title.trim() ||
      film.cast.some((actor) => actor.description.trim())
    )) {
      toast.error("Escribe la historia o describe al menos un personaje.");
      return;
    }
    const people = film.cast.filter((actor) => actor.photo);
    if (people.length && !photoConsent) {
      toast.error("Activa «Autorizo enviar la foto» o usa el Proyector Local de abajo.");
      return;
    }
    if (!people.length && !consent) {
      toast.error("Activa «Autorizo enviar el texto» para generar planos externos.");
      return;
    }
    const missing = people.filter((actor) => !actor.portrait);
    const qwen = qwenAllowance();
    if (missing.length && qwen.used + missing.length > qwen.max) {
      toast.error(`Hoy ya no quedan retratos gratis (máximo ${qwen.max}).`);
      return;
    }
    const moving = people.length > 0 || photoConsent;
    const wan = wanAllowance();
    if (moving && !wan.ok) {
      toast.error(`Hoy ya animaste ${wan.max} videos gratis.`);
      return;
    }
    const free = freeAllowance();
    if (!people.length && !free.ok) {
      toast.error(`Hoy ya creaste ${free.max} planos gratis.`);
      return;
    }
    const controller = beginJob("movie");
    if (!controller) return;
    retake();
    try {
      const next: FreePlate[] = [];
      if (people.length) {
        for (let i = 0; i < people.length; i++) {
          const actor = people[i];
          if (!actor?.photo) continue;
          let image = actor.portrait;
          if (!image) {
            setPhase(`Vistiendo a ${actor.name || `persona ${i + 1}`}…`);
            image = await dressPhoto(
              actor.photo,
              realPersonPrompt(actor),
              controller.signal,
              actor.role === "anime" ? "Photo-to-Anime" : "Anything2Real",
            );
            bumpQwen(qwen.key);
            updateActor(actor.id, (current) => ({ ...current, portrait: image }));
          }
          next.push(makePlate(await loadImage(image), actor.id, undefined, { x: 0.5, y: 0.4 }));
        }
        setFromPhoto(true);
      } else {
        const faces = await loadCastFaces(film);
        const background = await translateBackground(film.story || film.title, controller.signal);
        const beats = sceneBeats(film, background);
        const seedBase = Date.now() % 100000;
        for (let i = 0; i < beats.length; i++) {
          setPhase(`Generando plano ${i + 1} de ${beats.length}…`);
          const still = await fetchFreeStill(
            beats[i]!.prompt,
            seedBase + i * 17,
            (seconds) => setPhase(`Pausa de cola gratuita (${seconds}s)…`),
            controller.signal,
          );
          const actorId = beats[i]!.actorId;
          next.push(
            makePlate(
              still,
              actorId,
              actorId ? faces.photos.get(actorId) : undefined,
              actorId ? (faces.focus.get(actorId) ?? { x: 0.5, y: 0.4 }) : { x: 0.5, y: 0.4 },
            ),
          );
        }
        bumpFreeAllowance(free.key);
        setFromPhoto(false);
      }
      setNudge(ZERO);
      setPlates(next);
      if (!moving) {
        await assemble(film, next);
        return;
      }
      setPhase("Rodando movimiento de cámara sobre tu escena…");
      const canvas = document.createElement("canvas");
      canvas.width = FRAME_W;
      canvas.height = FRAME_H;
      const ctx = canvas.getContext("2d");
      if (!ctx || !next[0]) throw new Error("No se pudo preparar el plano.");
      paintFreeTake(ctx, [next[0]], ZERO, 1.2, 8, false);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (file) => (file ? resolve(file) : reject(new Error("No se pudo leer el plano."))),
          "image/jpeg",
          0.9,
        );
      });
      const url = await animateStill(blob, controller.signal, motionLine(film));
      bumpWan(wan.key);
      const filmFile = await fetch(url, {
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });
      if (!filmFile.ok) throw new Error("El video llegó, pero no se pudo abrir.");
      const movie = await filmFile.blob();
      setClip(movie);
      setVideo(URL.createObjectURL(movie));
      setPhase("");
      toast.success("¡Película rodada con éxito!");
    } catch (error) {
      setPhase("");
      if (error instanceof DOMException && error.name === "AbortError") return;
      failJob("movie", error, "No se pudo rodar la película.");
    } finally {
      finishJob("movie");
    }
  }

  async function shoot() {
    if (!film) return;
    if (!consent) {
      toast.error("Activa el interruptor si autorizas enviar el texto del plano.");
      return;
    }
    if (!(
      film.story.trim() ||
      film.title.trim() ||
      film.cast.some((actor) => actor.description.trim())
    )) {
      toast.error("Escribe la historia o describe un personaje primero.");
      return;
    }
    const slot = freeAllowance();
    if (!slot.ok) {
      toast.error(`Hoy ya creaste tus ${slot.max} planos gratis.`);
      return;
    }
    const controller = beginJob("still");
    if (!controller) return;
    retake();
    setPlates([]);
    try {
      const faces = await loadCastFaces(film);
      const background = await translateBackground(film.story || film.title, controller.signal);
      const beats = sceneBeats(film, background);
      const seedBase = Date.now() % 100000;
      const next: FreePlate[] = [];
      for (let i = 0; i < beats.length; i++) {
        setPhase(`Pintando plano ${i + 1} de ${beats.length}…`);
        const still = await fetchFreeStill(
          beats[i]!.prompt,
          seedBase + i * 17,
          (seconds) => setPhase(`Pausa de cola gratuita (${seconds}s)…`),
          controller.signal,
        );
        const actorId = beats[i]!.actorId;
        next.push(
          makePlate(
            still,
            actorId,
            actorId ? faces.photos.get(actorId) : undefined,
            actorId ? (faces.focus.get(actorId) ?? { x: 0.5, y: 0.4 }) : { x: 0.5, y: 0.4 },
          ),
        );
      }
      bumpFreeAllowance(slot.key);
      setNudge(ZERO);
      setFromPhoto(false);
      setPlates(next);
      setPhase("");
      if (!faces.photos.size) {
        toast.message(
          "Plano creado. Si subes una foto en Elenco podrás fundir tu cara localmente.",
        );
      } else {
        toast.success("Plano listo con tu rostro integrado en el dispositivo.");
      }
    } catch (error) {
      setPhase("");
      if (error instanceof DOMException && error.name === "AbortError") return;
      failJob("still", error, "No se pudo crear el plano.");
    } finally {
      finishJob("still");
    }
  }

  async function assemble(current: Film, frames: FreePlate[] = plates) {
    if (!frames.length) return;
    const internal = jobLock.current === "movie";
    if (!internal && !beginJob("assemble")) return;
    setPhase("Montando video MP4 en tu dispositivo…");
    retake();
    try {
      const canvas = document.createElement("canvas");
      canvas.width = FRAME_W;
      canvas.height = FRAME_H;
      const duration = frames.length === 1 ? 8 : frames.length * 4.5;
      const result = await encodeFilm({
        canvas,
        duration,
        withAudio: current.music,
        onProgress: () => {},
        draw: (time) => {
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          paintFreeTake(ctx, frames, nudge, time, duration, current.grain);
        },
      });
      setClip(result.blob);
      setVideo(URL.createObjectURL(result.blob));
      setPhase("");
      toast.success("Montaje local listo.");
    } catch (error) {
      setPhase("");
      failJob("assemble", error, "No se pudo armar el video.");
    } finally {
      if (!internal) finishJob("assemble");
    }
  }

  async function keep(current: Film) {
    if (!clip) return;
    const safe = safeFilename(current.title, "mi-universo");
    setSaveStatus("idle");
    try {
      await shareOrSave(clip, `${safe}-estudio.mp4`);
      setSaveStatus("success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSaveStatus("error");
      toast.error("No se pudo descargar el archivo en este navegador.");
    }
  }

  const hasFace = plates.some((plate) => plate.face);

  return (
    <>
      <div className="space-y-6">
        {/* Header & Daily Studio Quotas */}
        <header className="studio-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-brass uppercase">
                <Clapperboard size={14} />
                SET DE RODAJE · CABINA PRINCIPAL
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl">{film.title || "Película sin título"}</h1>
              <p className="mt-2 max-w-xl text-sm text-muted">
                Elige entre el Proyector 100% Local (cero red, instantáneo) o la Cabina IA Sin Cuota
                con consentimiento explícito para trajes fotorrealistas y animación.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-line bg-panel-2 px-3 py-1 text-paper">
                Planos hoy:{" "}
                <strong className="text-brass">
                  {Math.max(0, freeQuota.max - freeQuota.used)}/{freeQuota.max}
                </strong>
              </span>
              <span className="rounded-full border border-line bg-panel-2 px-3 py-1 text-paper">
                Vestuario IA:{" "}
                <strong className="text-cyan">
                  {Math.max(0, qwenQuota.max - qwenQuota.used)}/{qwenQuota.max}
                </strong>
              </span>
              <span className="rounded-full border border-line bg-panel-2 px-3 py-1 text-paper">
                Videos IA:{" "}
                <strong className="text-crimson">
                  {Math.max(0, wanQuota.max - wanQuota.used)}/{wanQuota.max}
                </strong>
              </span>
            </div>
          </div>

          {!film.cast.length ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-brass/40 bg-brass/10 px-4 py-3 text-xs text-paper">
              <span className="flex items-center gap-2">
                <Users size={15} className="text-brass" />
                Aún no tienes actores en esta película. Suma rostros o leyendas para personalizarla.
              </span>
              <Link
                to="/elenco"
                className="inline-flex min-h-11 items-center font-semibold text-brass underline"
              >
                Ir a Elenco →
              </Link>
            </div>
          ) : null}
        </header>

        <div aria-live="polite" aria-atomic="true" role="status">
          {activeJob ? (
            <div
              className="studio-card mb-4 flex items-center justify-between gap-3 border-brass/60 px-4 py-3"
              aria-busy="true"
            >
              <span className="flex items-center gap-2.5 text-sm font-medium text-brass">
                <LoaderCircle size={17} className="loading-spinner shrink-0" aria-hidden="true" />
                {phase || "Preparando la operación…"}
              </span>
              {activeJob !== "assemble" && !phase.startsWith("Montando") ? (
                <Button
                  variant="quiet"
                  size="compact"
                  loading={cancelling}
                  loadingLabel="Cancelando…"
                  onClick={cancelActiveJob}
                >
                  <XCircle size={14} />
                  Cancelar
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
        {jobError ? (
          <p
            id="rodaje-error"
            role="alert"
            className="studio-card flex items-start gap-2 border-crimson/50 p-4 text-sm text-crimson"
          >
            <TriangleAlert size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            {jobError} Puedes volver a intentarlo.
          </p>
        ) : null}

        {/* Section 1: Proyector Local Instantáneo (100% On-Device) */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold tracking-wider text-emerald uppercase">
                100% En tu dispositivo · Cero envíos externos
              </p>
              <h2 className="text-2xl text-paper">Proyector Cinematográfico Local</h2>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr]">
            <Stage />

            <div className="studio-card space-y-4 p-4 sm:p-5">
              <h3 className="text-xl text-paper">Ajustes de dirección y mezcla</h3>
              <div>
                <p className="mb-2 text-xs font-medium text-muted">Duración del corte</p>
                <ChoiceRow
                  label="Duración del corte"
                  value={film.duration}
                  onChange={(duration: Duration) => setDuration(duration)}
                  options={(Object.keys(DURATION_LABEL) as Duration[]).map((id) => ({
                    id,
                    label: DURATION_LABEL[id],
                  }))}
                />
              </div>

              <div className="space-y-2.5">
                <Toggle
                  checked={film.subtitles}
                  onChange={(value) => setFlag("subtitles", value)}
                  label="Subtítulos de cine"
                  hint="Imprime tu guion escena por escena sobre el fotograma."
                />
                <Toggle
                  checked={film.music}
                  onChange={(value) => setFlag("music", value)}
                  label="Banda sonora sintetizada"
                  hint="Acorde grave armónico generado en tu propio navegador, libre de derechos."
                />
                <Toggle
                  checked={film.grain}
                  onChange={(value) => setFlag("grain", value)}
                  label="Textura de celuloide 35mm"
                  hint="Añade grano cinematográfico orgánico sobre cada toma."
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Cabina de Efectos IA Sin Cuota (Opt-In) */}
        <section className="studio-card space-y-5 p-5 sm:p-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-crimson uppercase">
              Cabina Opcional con Consentimiento Expreso
            </p>
            <h2 className="text-2xl sm:text-3xl">Laboratorio de Trajes y Video IA Gratis</h2>
            <p className="max-w-2xl text-xs leading-relaxed text-muted sm:text-sm">
              Genera fondos ilustrados (cacheando traducciones y fotogramas durante 24h) o viste tu
              foto con modelos públicos gratuitos. Tus datos solo salen si activas los interruptores
              de abajo.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              checked={consent}
              onChange={(text) => setConsentFlags({ text })}
              accent="brass"
              label="Autorizo enviar el texto de la escena"
              hint="Envía solo la descripción (sin tu foto) a MyMemory y Pollinations con caché local activa."
            />
            <Toggle
              checked={photoConsent}
              onChange={(photo) => setConsentFlags({ photo })}
              accent="emerald"
              label="Autorizo enviar la foto para traje / video IA"
              hint="Requerido únicamente para «Vestir con mi cara», «Animar el plano» o «Hacer la película» con foto."
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => makeMovie()}
              loading={activeJob === "movie"}
              loadingLabel="Rodando película…"
              disabled={Boolean(activeJob && activeJob !== "movie")}
              status={failedJob === "movie" ? "error" : "idle"}
              errorLabel="Reintentar película"
              aria-describedby={failedJob === "movie" ? "rodaje-error" : undefined}
            >
              <FilmIcon size={16} />
              Hacer la película (1 paso)
            </Button>
            <Button
              variant="quiet"
              onClick={() => shoot()}
              loading={activeJob === "still"}
              loadingLabel="Creando plano…"
              disabled={Boolean(activeJob && activeJob !== "still")}
              status={failedJob === "still" ? "error" : "idle"}
              errorLabel="Reintentar plano"
              aria-describedby={failedJob === "still" ? "rodaje-error" : undefined}
            >
              <Sparkles size={15} className="text-brass" />
              Crear plano gratis (rostro local)
            </Button>
            <Button
              variant="quiet"
              onClick={() => lookReal()}
              loading={activeJob === "look"}
              loadingLabel="Vistiendo elenco…"
              disabled={Boolean(activeJob && activeJob !== "look")}
              status={failedJob === "look" ? "error" : "idle"}
              errorLabel="Reintentar vestuario"
              aria-describedby={failedJob === "look" ? "rodaje-error" : undefined}
            >
              <WandSparkles size={15} className="text-cyan" />
              Vestir con mi cara
            </Button>
            <Button
              variant="crimson"
              onClick={() => animate()}
              loading={activeJob === "animate"}
              loadingLabel="Animando plano…"
              status={failedJob === "animate" ? "error" : "idle"}
              errorLabel="Reintentar animación"
              aria-describedby={failedJob === "animate" ? "rodaje-error" : undefined}
              disabled={Boolean(activeJob && activeJob !== "animate") || !plates.length}
            >
              <Clapperboard size={15} />
              Animar el plano
            </Button>
          </div>

          {/* Plate Composer & Video Output */}
          {plates.length > 0 ? (
            <div className="grid gap-5 border-t border-line/70 pt-5 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs font-semibold tracking-wider text-brass uppercase">
                  Fotograma compuesto
                </p>
                <canvas
                  ref={previewRef}
                  className="mx-auto aspect-[9/16] max-w-xs w-full rounded-2xl border border-line bg-ink"
                />
                {fromPhoto ? (
                  <p className="text-center text-xs text-emerald">
                    Traje renderizado directamente sobre el rostro del elenco.
                  </p>
                ) : null}
              </div>

              <div className="space-y-4">
                {hasFace ? (
                  <div className="space-y-3 rounded-2xl border border-line bg-panel-2/60 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-paper">Ajuste fino del rostro</p>
                      <button
                        type="button"
                        onClick={() => {
                          retake();
                          setNudge(ZERO);
                        }}
                        className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-xs text-brass hover:underline"
                      >
                        <RotateCcw size={12} />
                        Centrar
                      </button>
                    </div>
                    <FaceSlider
                      label="Posición horizontal"
                      min={-0.18}
                      max={0.18}
                      value={nudge.x}
                      onChange={(x) => {
                        retake();
                        setNudge({ ...nudge, x });
                      }}
                    />
                    <FaceSlider
                      label="Posición vertical"
                      min={-0.16}
                      max={0.16}
                      value={nudge.y}
                      onChange={(y) => {
                        retake();
                        setNudge({ ...nudge, y });
                      }}
                    />
                    <FaceSlider
                      label="Escala del rostro"
                      min={-0.12}
                      max={0.2}
                      value={nudge.scale}
                      onChange={(scale) => {
                        retake();
                        setNudge({ ...nudge, scale });
                      }}
                    />
                  </div>
                ) : null}

                <Button
                  variant="quiet"
                  onClick={() => assemble(film)}
                  loading={activeJob === "assemble"}
                  loadingLabel="Montando MP4…"
                  status={failedJob === "assemble" ? "error" : "idle"}
                  errorLabel="Reintentar montaje"
                  aria-describedby={failedJob === "assemble" ? "rodaje-error" : undefined}
                  disabled={Boolean(activeJob && activeJob !== "assemble")}
                  className="w-full"
                >
                  Armar video MP4 de este plano en el teléfono
                </Button>

                {video ? (
                  <div className="space-y-3 rounded-2xl border border-emerald/40 bg-emerald/5 p-3">
                    <video
                      src={video}
                      controls
                      playsInline
                      className="mx-auto aspect-[9/16] max-w-xs w-full rounded-xl bg-ink"
                    />
                    <Button
                      variant="primary"
                      onClick={() => keep(film)}
                      status={saveStatus}
                      successLabel="Video guardado"
                      errorLabel="Reintentar descarga"
                      loadingLabel="Preparando descarga…"
                      className="w-full"
                    >
                      <Download size={16} />
                      Guardar este video MP4
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </>
  );
}

function FaceSlider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs text-muted">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="font-mono text-paper">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 h-8 w-full accent-brass"
      />
    </label>
  );
}
