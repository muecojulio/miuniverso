import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChoiceRow } from "@/components/role-chips";
import { Shell } from "@/components/shell";
import { Stage, type StageHandle } from "@/components/stage";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { imagineReady, pollFilmTake, startFilmTake } from "@/lib/studio/imagine";
import { bumpAllowance, dayAllowance, modelPrompt } from "@/lib/studio/prompt";
import { useStudio } from "@/lib/studio/store";
import { DURATION_LABEL, type Duration } from "@/lib/studio/types";

export const Route = createFileRoute("/rodaje")({ component: Rodaje });

function Rodaje() {
  const film = useStudio((s) => s.films.find((item) => item.id === s.activeId));
  const setDuration = useStudio((s) => s.setDuration);
  const setFlag = useStudio((s) => s.setFlag);
  const stageRef = useRef<StageHandle>(null);
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState(false);
  const [phase, setPhase] = useState("");
  const [video, setVideo] = useState("");

  useEffect(() => {
    let alive = true;
    imagineReady()
      .then((result) => {
        if (alive) setReady(result.available);
      })
      .catch(() => {
        if (alive) setReady(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!film) return null;

  async function shoot() {
    if (!film) return;
    if (!consent) {
      toast.error("Activa el interruptor si aceptas enviar la foto a Grok.");
      return;
    }
    const slot = dayAllowance("video");
    if (!slot.ok) {
      toast.error(`Hoy ya usaste ${slot.max} tomas con Grok.`);
      return;
    }
    setVideo("");
    setPhase("Preparando el fotograma…");
    try {
      const keyframe = stageRef.current?.snapshot();
      const references = film.cast.map((actor) => actor.photo).filter((photo): photo is string => Boolean(photo)).slice(0, 3);
      setPhase("Enviando la toma…");
      const started = await startFilmTake({
        data: { prompt: modelPrompt(film), keyframe, references },
      });
      if (!started.ok) {
        setPhase("");
        toast.error(started.error);
        return;
      }
      for (let attempt = 0; attempt < 36; attempt++) {
        setPhase(`Rodando con Grok… ${attempt + 1}`);
        await new Promise((resolve) => setTimeout(resolve, 4000));
        const polled = await pollFilmTake({ data: { requestId: started.requestId } });
        if (!polled.ok) {
          setPhase("");
          toast.error(polled.error);
          return;
        }
        if (polled.status === "done") {
          bumpAllowance(slot.key);
          setVideo(polled.url);
          setPhase("");
          toast.success("Toma lista.");
          return;
        }
      }
      setPhase("");
      toast.error("Sigue en proceso. Espera un minuto y vuelve a intentarlo.");
    } catch (error) {
      setPhase("");
      toast.error(error instanceof Error ? error.message : "No se pudo rodar.");
    }
  }

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-medium tracking-widest text-brass">RODAJE</p>
        <h1 className="mt-2 text-4xl">La película</h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          Primero se rueda en el teléfono, con tu cara dentro del personaje. Si quieres una toma animada por Grok, es un extra de 8 segundos y usa tu cuota.
        </p>
      </header>
      {!film.cast.length ? (
        <p className="mb-4 text-sm text-muted">
          Falta el elenco. <Link to="/elenco" className="text-paper underline">Añade a alguien</Link>.
        </p>
      ) : null}
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
      <section className="mt-8 space-y-3 rounded-card border border-line bg-panel p-4">
        <h2 className="text-2xl">Toma con Grok</h2>
        <p className="text-sm text-muted">
          {ready
            ? "Ocho segundos. Tu foto sale del teléfono solo hacia Grok, para esta toma. No se guarda en una base de datos de la app."
            : "Esta toma no está disponible en este momento. La película del teléfono sí."}
        </p>
        <Toggle
          checked={consent}
          onChange={setConsent}
          label="Acepto enviar la foto"
          hint="Solo al pulsar el botón. Máximo 4 tomas al día."
        />
        <Button onClick={() => void shoot()} disabled={!ready || Boolean(phase) || film.cast.length === 0}>
          {phase || "Crear toma de 8 segundos"}
        </Button>
        {video ? (
          <video src={video} controls playsInline className="aspect-[9/16] w-full rounded-card bg-ink" />
        ) : null}
      </section>
    </Shell>
  );
}
