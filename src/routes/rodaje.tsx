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
import { loadImage } from "@/lib/studio/photo";
import { realPersonPrompt } from "@/lib/studio/prompt";
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
import { bumpQwen, dressPhoto, qwenAllowance } from "@/lib/studio/qwen";
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
  const [fromPhoto, setFromPhoto] = useState(false);
  const [phase, setPhase] = useState("");
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
    if (!photoConsent) {
      toast.error("Activa el interruptor si aceptas enviar la foto.");
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

  async function lookReal() {
    if (!film) return;
    if (!photoConsent) {
      toast.error("Activa el interruptor si aceptas enviar la foto.");
      return;
    }
    const people = film.cast.filter((actor) => actor.photo);
    if (!people.length) {
      toast.error("Hace falta una foto en Elenco. Sin ella no hay una persona real.");
      return;
    }
    const slot = qwenAllowance();
    if (slot.used + people.length > slot.max) {
      toast.error(`Hoy ya no quedan retratos gratis. Máximo ${slot.max}.`);
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
        setPhase(`Vistiendo a ${actor.name || `persona ${i + 1}`}…`);
        const image = await dressPhoto(
          actor.photo,
          realPersonPrompt(actor),
          controller.signal,
          actor.role === "anime" ? "Photo-to-Anime" : "Anything2Real",
        );
        bumpQwen(slot.key);
        const still = await loadImage(image);
        next.push(makePlate(still, actor.id, undefined, { x: 0.5, y: 0.4 }));
      }
      setNudge(ZERO);
      setFromPhoto(true);
      setPlates(next);
      setPhase("");
      toast.success("El personaje sale con tu cara. No usó cuota.");
    } catch (error) {
      setPhase("");
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error(error instanceof Error ? error.message : "No se pudo vestir a la persona.");
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
          Nada de esto usa tu cuota. El plano deja la foto en el teléfono. Si quieres el traje pintado sobre tu cara, o un video que se mueva, la imagen sale solo si lo aceptas.
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
        <h2 className="pt-2 text-2xl">Tu cara, sin cuota</h2>
        <p className="text-sm text-muted">
          Un modelo abierto pinta el traje sobre tu foto. No es Grok y no se cobra. Máximo 3 al día. Luego puedes animar ese plano, también gratis.
        </p>
        <Toggle
          checked={photoConsent}
          onChange={setPhotoConsent}
          label="Acepto enviar la foto"
          hint="Va a un espacio público y gratuito. Solo al pulsar el botón. No es una página de intercambio de caras."
        />
        <Button onClick={() => void lookReal()} disabled={Boolean(phase)}>
          {phase.startsWith("Vistiendo") ? phase : "Vestir con mi cara"}
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
        <p className="text-sm text-muted">
          Anima el plano con un modelo abierto. La imagen sale si aceptaste enviarla. Máximo 2 al día. Tarda unos minutos. No usa cuota.
        </p>
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
