import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChoiceRow } from "@/components/role-chips";
import { Shell } from "@/components/shell";
import { Stage, type StageHandle } from "@/components/stage";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { FRAME_H, FRAME_W } from "@/lib/studio/draw";
import { encodeFilm, shareOrSave } from "@/lib/studio/encode";
import { createPortrait, imagineReady, pollFilmTake, startFilmTake } from "@/lib/studio/imagine";
import { loadImage } from "@/lib/studio/photo";
import { bumpAllowance, dayAllowance, modelPrompt, realPersonPrompt } from "@/lib/studio/prompt";
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
import { animateStill, bumpWan, wanAllowance } from "@/lib/studio/wan";
import { useStudio } from "@/lib/studio/store";
import { DURATION_LABEL, type Duration, type Film } from "@/lib/studio/types";

export const Route = createFileRoute("/rodaje")({ component: Rodaje });

const ZERO: FacePlace = { x: 0, y: 0, scale: 0 };

function Rodaje() {
  const film = useStudio((s) => s.films.find((item) => item.id === s.activeId));
  const setDuration = useStudio((s) => s.setDuration);
  const setFlag = useStudio((s) => s.setFlag);
  const stageRef = useRef<StageHandle>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [consent, setConsent] = useState(false);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [grokReady, setGrokReady] = useState(false);
  const [wanOk, setWanOk] = useState(false);
  const [fromPhoto, setFromPhoto] = useState(false);
  const [phase, setPhase] = useState("");
  const [video, setVideo] = useState("");
  const [clip, setClip] = useState<Blob | null>(null);
  const [plates, setPlates] = useState<FreePlate[]>([]);
  const [nudge, setNudge] = useState<FacePlace>(ZERO);

  useEffect(() => {
    let alive = true;
    imagineReady()
      .then((result) => {
        if (alive) setGrokReady(result.available);
      })
      .catch(() => {
        if (alive) setGrokReady(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas || !plates.length) return;
    canvas.width = FRAME_W;
    canvas.height = FRAME_H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintFreeTake(ctx, plates, nudge, 1.2, 8, false);
  }, [plates, nudge]);

  if (!film) return null;

  function retake() {
    if (video) URL.revokeObjectURL(video);
    setVideo("");
    setClip(null);
  }

  async function animate() {
    const canvas = previewRef.current;
    if (!canvas || !plates.length) {
      toast.error("Primero crea el plano.");
      return;
    }
    if (!wanOk) {
      toast.error("Activa el interruptor si aceptas enviar la imagen al modelo gratis.");
      return;
    }
    const slot = wanAllowance();
    if (!slot.ok) {
      toast.error(`Hoy ya animaste ${slot.max} videos gratis.`);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("Animando el plano…");
    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((file) => (file ? resolve(file) : reject(new Error("No se pudo leer el plano."))), "image/jpeg", 0.9);
      });
      const url = await animateStill(blob, controller.signal);
      bumpWan(slot.key);
      const filmFile = await fetch(url);
      if (!filmFile.ok) throw new Error("El video llegó, pero no se pudo abrir.");
      const movie = await filmFile.blob();
      setClip(movie);
      setVideo(URL.createObjectURL(movie));
      setPhase("");
      toast.success("Video listo. Ya se mueve.");
    } catch (error) {
      setPhase("");
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "No se pudo animar el plano.");
    }
  }

  async function realClip() {
    if (!film) return;
    if (!photoConsent) {
      toast.error("Activa el interruptor si aceptas enviar la foto a Grok.");
      return;
    }
    const photos = film.cast.map((actor) => actor.photo).filter((photo): photo is string => Boolean(photo)).slice(0, 3);
    if (!photos.length) {
      toast.error("Hace falta tu foto en Elenco para que el video tenga tu cara.");
      return;
    }
    const slot = dayAllowance("video");
    if (!slot.ok) {
      toast.error(`Hoy ya creaste ${slot.max} videos con Grok.`);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    retake();
    setPhase("Rodando el video…");
    try {
      const started = await startFilmTake({
        data: { prompt: modelPrompt(film), references: photos },
      });
      if (!started.ok) {
        setPhase("");
        toast.error(started.error);
        return;
      }
      bumpAllowance(slot.key);
      for (let i = 0; i < 36; i++) {
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 5000);
          controller.signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new DOMException("Cancelado", "AbortError"));
            },
            { once: true },
          );
        });
        setPhase(`Rodando el video… ${i + 1}`);
        const polled = await pollFilmTake({ data: { requestId: started.requestId } });
        if (!polled.ok) {
          setPhase("");
          toast.error(polled.error);
          return;
        }
        if (polled.status === "done") {
          const blob = await (await fetch(polled.url)).blob();
          setClip(blob);
          setVideo(URL.createObjectURL(blob));
          setPhase("");
          toast.success("Video listo. Esto ya no son fotos quietas.");
          return;
        }
      }
      setPhase("");
      toast.message("Sigue rodándose. Vuelve a pulsar en un momento.");
    } catch (error) {
      setPhase("");
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "No se pudo rodar el video.");
    }
  }

  async function lookReal() {
    if (!film) return;
    if (!photoConsent) {
      toast.error("Activa el interruptor si aceptas enviar la foto a Grok.");
      return;
    }
    const people = film.cast.filter((actor) => actor.photo);
    if (!people.length) {
      toast.error("Hace falta una foto en Elenco. Sin ella no hay una persona real.");
      return;
    }
    const slot = dayAllowance("still");
    if (slot.used + people.length > slot.max) {
      toast.error(`Hoy ya no quedan retratos. Máximo ${slot.max}.`);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    retake();
    setPlates([]);
    try {
      const next: FreePlate[] = [];
      for (let i = 0; i < people.length; i++) {
        if (controller.signal.aborted) return;
        const actor = people[i];
        if (!actor?.photo) continue;
        setPhase(`Pintando a ${actor.name || `persona ${i + 1}`}…`);
        let result = await createPortrait({
          data: { imageDataUrl: actor.photo, prompt: realPersonPrompt(actor) },
        });
        if (!result.ok && result.error.includes("Espera")) {
          setPhase("Un momento entre retratos…");
          await new Promise((resolve) => setTimeout(resolve, 21_000));
          result = await createPortrait({
            data: { imageDataUrl: actor.photo, prompt: realPersonPrompt(actor) },
          });
        }
        if (!result.ok) {
          setPhase("");
          toast.error(result.error);
          return;
        }
        bumpAllowance(slot.key);
        const still = await loadImage(result.image);
        next.push(makePlate(still, actor.id, undefined, { x: 0.5, y: 0.4 }));
      }
      setNudge(ZERO);
      setFromPhoto(true);
      setPlates(next);
      setPhase("");
      toast.success("El personaje sale con tu cara.");
    } catch (error) {
      setPhase("");
      toast.error(error instanceof Error ? error.message : "No se pudo pintar a la persona.");
    }
  }

  async function shoot() {
    if (!film) return;
    if (!consent) {
      toast.error("Activa el interruptor si aceptas enviar el texto.");
      return;
    }
    if (!(film.story.trim() || film.title.trim() || film.cast.some((actor) => actor.description.trim()))) {
      toast.error("Escribe la historia o describe al personaje.");
      return;
    }
    const slot = freeAllowance();
    if (!slot.ok) {
      toast.error(`Hoy ya creaste ${slot.max} videos gratis.`);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    retake();
    setPlates([]);
    try {
      const faces = await loadCastFaces(film);
      const beats = sceneBeats(film);
      const seedBase = Date.now() % 100000;
      const next: FreePlate[] = [];
      for (let i = 0; i < beats.length; i++) {
        setPhase(`Plano ${i + 1} de ${beats.length}…`);
        const still = await fetchFreeStill(beats[i].prompt, seedBase + i * 17, (seconds) => {
          setPhase(`Pausa de la API gratis, ${seconds}s…`);
        }, controller.signal);
        const actorId = beats[i].actorId;
        next.push(makePlate(still, actorId, actorId ? faces.photos.get(actorId) : undefined, actorId ? faces.focus.get(actorId) ?? { x: 0.5, y: 0.4 } : { x: 0.5, y: 0.4 }));
      }
      bumpFreeAllowance(slot.key);
      setNudge(ZERO);
      setFromPhoto(false);
      setPlates(next);
      setPhase("");
      if (!faces.photos.size) {
        toast.message("Sin foto, el rostro es el del fotograma. Añádela en Elenco para poner la tuya.");
      } else {
        toast.success("Plano listo. Ajusta la cara y arma el video.");
      }
    } catch (error) {
      setPhase("");
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "No se pudo crear el video.");
    }
  }

  async function assemble(current: Film) {
    if (!plates.length) return;
    setPhase("Montando el video…");
    retake();
    try {
      const canvas = document.createElement("canvas");
      canvas.width = FRAME_W;
      canvas.height = FRAME_H;
      const duration = plates.length === 1 ? 8 : plates.length * 4.5;
      const result = await encodeFilm({
        canvas,
        duration,
        withAudio: current.music,
        onProgress: () => {},
        draw: (time) => {
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          paintFreeTake(ctx, plates, nudge, time, duration, current.grain);
        },
      });
      setClip(result.blob);
      setVideo(URL.createObjectURL(result.blob));
      setPhase("");
      toast.success("Video listo.");
    } catch (error) {
      setPhase("");
      toast.error(error instanceof Error ? error.message : "No se pudo armar el video.");
    }
  }

  async function keep(current: Film) {
    if (!clip) return;
    const safe = (current.title || "mi-universo").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
    try {
      await shareOrSave(clip, `${safe || "mi-universo"}-gratis.mp4`);
    } catch {
      toast.error("No se pudo guardar el archivo en este navegador.");
    }
  }

  const hasFace = plates.some((plate) => plate.face);

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-medium tracking-widest text-brass">RODAJE</p>
        <h1 className="mt-2 text-4xl">La película</h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          Tu cara puede ir en el personaje sin pagar: la foto se queda en el teléfono y se coloca sobre el traje. Grok pinta cara y traje en una sola foto, pero eso sí usa tu cuota. No es obligatorio.
        </p>
      </header>
      {!film.cast.length ? (
        <p className="mb-4 text-sm text-muted">
          Falta el elenco. <Link to="/elenco" className="text-paper underline">Añade a alguien</Link>.
        </p>
      ) : null}
      <section className="mb-8 space-y-3 rounded-card border border-line bg-panel p-4">
        <h2 className="text-2xl">Gratis, con tu cara</h2>
        <p className="text-sm text-muted">
          No se paga y la foto no sale del teléfono. El traje lo dibuja una inteligencia gratuita y tu foto es la cara del personaje. Se nota más el borde que con Grok.
        </p>
        <p className="text-sm text-muted">
          <a className="text-paper underline" href="https://arena.ai" target="_blank" rel="noreferrer">Arena</a> también es gratis, con límite al día y hay que entrar con una cuenta. No tiene una puerta para esta aplicación: si subes la foto allí, sale de tu teléfono hacia Arena.
        </p>
        <Toggle
          checked={consent}
          onChange={setConsent}
          label="Acepto enviar el texto"
          hint="Nunca la foto. No pongas datos privados en la historia. Máximo 3 videos al día."
        />
        <Button onClick={() => void shoot()} disabled={Boolean(phase)}>
          {phase || "Crear el plano"}
        </Button>
        <h2 className="pt-2 text-2xl">Grok, si quieres gastarla</h2>
        <p className="text-sm text-muted">
          Opcional. Grok ve tu foto y pinta el traje sobre esa misma cara. Se ve más unido, y cada retrato descuenta tu cuota. Máximo 8 al día.
        </p>
        <Toggle
          checked={photoConsent}
          onChange={setPhotoConsent}
          label="Acepto enviar la foto a Grok"
          hint={grokReady ? "Solo al pulsar el botón. No va a una página de intercambio de caras." : "Ahora mismo Grok no está disponible."}
        />
        <Button onClick={() => void lookReal()} disabled={Boolean(phase) || !grokReady}>
          {phase && photoConsent ? phase : "Crear con mi cara"}
        </Button>
        <p className="text-sm text-muted">
          Para que sea un video y no fotos quietas, Grok rueda ocho segundos: la persona se mueve. También usa tu cuota. Máximo 4 al día.
        </p>
        <Button onClick={() => void realClip()} disabled={Boolean(phase) || !grokReady}>
          Rodar video
        </Button>
        {plates.length ? (
          <div className="space-y-3">
            <canvas ref={previewRef} className="aspect-[9/16] w-full rounded-card bg-ink" />
            {fromPhoto ? <p className="text-sm text-muted">Este personaje usa tu cara.</p> : null}
            {hasFace ? (
              <div className="space-y-3">
                <FaceSlider
                  label="Horizontal"
                  min={-0.18}
                  max={0.18}
                  value={nudge.x}
                  onChange={(x) => {
                    retake();
                    setNudge({ ...nudge, x });
                  }}
                />
                <FaceSlider
                  label="Vertical"
                  min={-0.16}
                  max={0.16}
                  value={nudge.y}
                  onChange={(y) => {
                    retake();
                    setNudge({ ...nudge, y });
                  }}
                />
                <FaceSlider
                  label="Tamaño"
                  min={-0.12}
                  max={0.2}
                  value={nudge.scale}
                  onChange={(scale) => {
                    retake();
                    setNudge({ ...nudge, scale });
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-muted">Añade una foto en Elenco para cambiar la cara.</p>
            )}
            <Button variant="quiet" onClick={() => void assemble(film)} disabled={Boolean(phase)}>
              Armar video
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted">Todavía no hay plano. Pulsa «Crear el plano» y aquí aparecerá para animarlo.</p>
        )}
        <Toggle
          checked={wanOk}
          onChange={setWanOk}
          label="Video de verdad, gratis"
          hint="Anima el plano con un modelo abierto. La imagen sale hacia Hugging Face. Máximo 2 al día. Tarda unos minutos."
        />
        <Button onClick={() => void animate()} disabled={Boolean(phase) || !plates.length}>
          {phase.startsWith("Animando") ? phase : "Animar el plano"}
        </Button>
        {video ? (
          <div className="space-y-3">
            <video src={video} controls playsInline className="aspect-[9/16] w-full rounded-card bg-ink" />
            <Button variant="quiet" onClick={() => void keep(film)}>
              Guardar este video
            </Button>
          </div>
        ) : null}
      </section>
      <div className="mb-4 space-y-3">
        <ChoiceRow
          value={film.duration}
          onChange={(duration: Duration) => setDuration(duration)}
          options={(Object.keys(DURATION_LABEL) as Duration[]).map((id) => ({ id, label: DURATION_LABEL[id] }))}
        />
        <Toggle checked={film.subtitles} onChange={(value) => setFlag("subtitles", value)} label="Subtítulos" hint="La historia, escena por escena." />
        <Toggle checked={film.music} onChange={(value) => setFlag("music", value)} label="Música" hint="Una nota grave, sin canciones ajenas." />
        <Toggle checked={film.grain} onChange={(value) => setFlag("grain", value)} label="Grano de cine" />
      </div>
      <Stage ref={stageRef} />
    </Shell>
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
    <label className="block text-sm text-muted">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 h-11 w-full accent-brass"
      />
    </label>
  );
}
