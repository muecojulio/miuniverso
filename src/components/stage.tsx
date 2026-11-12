import { Download, Pause, Play, RotateCcw, Sparkles, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { direct } from "@/lib/studio/director";
import { FRAME_H, FRAME_W, filmLength, paintFilm } from "@/lib/studio/draw";
import { encodeFilm, shareOrSave } from "@/lib/studio/encode";
import { loadImage } from "@/lib/studio/photo";
import { MOTION_LABEL, PLACE_META } from "@/lib/studio/presets";
import { safeFilename } from "@/lib/studio/security";
import { useStudio } from "@/lib/studio/store";

function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const tenths = Math.floor((safe % 1) * 10);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${tenths}`;
}

export function Stage({ compact = false }: { compact?: boolean }) {
  const film = useStudio((s) => s.films.find((item) => item.id === s.activeId) ?? s.films[0]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useRef(new Map<string, HTMLImageElement>());
  const filmRef = useRef(film);
  filmRef.current = film;

  const [playing, setPlaying] = useState(false);
  const [cursorTime, setCursorTime] = useState(1.2);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState("");

  const scenes = useMemo(() => (film ? direct(film) : []), [film]);
  const duration = useMemo(() => (film ? filmLength(film) : 0), [film]);

  const drawAt = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const current = filmRef.current;
    if (!canvas || !current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintFilm(ctx, current, images.current, time);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !film) return;
    canvas.width = FRAME_W;
    canvas.height = FRAME_H;
    let cancel = false;
    const run = async () => {
      const next = new Map<string, HTMLImageElement>();
      await Promise.all(
        film.cast.map(async (actor) => {
          const source = actor.portrait || actor.photo;
          if (!source) return;
          try {
            next.set(actor.id, await loadImage(source));
          } catch {
            // Broken image falls back to procedural character face.
          }
        }),
      );
      if (cancel) return;
      images.current = next;
      drawAt(cursorTime);
    };
    void run();
    return () => {
      cancel = true;
    };
  }, [film, drawAt, cursorTime]);

  useEffect(() => {
    if (!playing || !film) return;
    const length = filmLength(film);
    const startOffset = cursorTime >= length - 0.15 ? 0 : cursorTime;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = startOffset + (now - start) / 1000;
      const clamped = Math.min(t, length);
      setCursorTime(clamped);
      drawAt(clamped);
      if (t < length) raf = requestAnimationFrame(step);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, film, drawAt]);

  function scrubTo(nextTime: number) {
    setPlaying(false);
    setCursorTime(nextTime);
    drawAt(nextTime);
  }

  async function save() {
    const current = filmRef.current;
    const canvas = canvasRef.current;
    if (!current || !canvas || busy) return;
    setPlaying(false);
    setBusy(true);
    setNote("Renderizando película local en alta definición…");
    setProgress(0.02);
    try {
      const length = filmLength(current);
      const result = await encodeFilm({
        canvas,
        duration: length,
        withAudio: current.music,
        onProgress: setProgress,
        draw: drawAt,
      });
      const safe = safeFilename(current.title, "mi-universo");
      await shareOrSave(result.blob, `${safe}.${result.ext}`);
      setNote("Película exportada en tu dispositivo sin enviar datos a ningún servidor.");
    } catch {
      setNote("No se pudo exportar el archivo en este navegador, pero puedes reproducirla aquí.");
    } finally {
      setBusy(false);
    }
  }

  if (!film) return null;

  const activeScene =
    scenes.find((s) => cursorTime >= s.start && cursorTime < s.end) ?? scenes.at(-1);
  const placeBadge = activeScene ? PLACE_META[activeScene.place] : null;

  return (
    <div className="studio-card space-y-4 p-4 sm:p-5">
      {/* Director Monitor Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-semibold",
              playing
                ? "border-crimson/50 bg-crimson/15 text-crimson"
                : "border-emerald/40 bg-emerald/12 text-emerald",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                playing ? "pulse-live bg-crimson" : "bg-emerald",
              )}
            />
            {playing ? "EN PROYECCIÓN" : "MONITOR LOCAL"}
          </span>
          {placeBadge && activeScene ? (
            <span
              className={cn(
                "hidden rounded-full border px-2.5 py-0.5 sm:inline-flex",
                placeBadge.color,
              )}
            >
              {placeBadge.label} · {MOTION_LABEL[activeScene.motion]}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-muted">
          {film.music ? (
            <Volume2 size={14} className="text-brass" />
          ) : (
            <VolumeX size={14} className="text-muted" />
          )}
          <span>
            {formatTimecode(cursorTime)} / {formatTimecode(duration)}
          </span>
        </div>
      </div>

      {/* Viewport */}
      <div
        className={cn(
          "relative mx-auto overflow-hidden rounded-2xl border border-line bg-ink shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]",
          compact ? "max-w-[270px]" : "max-w-sm",
        )}
      >
        <canvas ref={canvasRef} className="aspect-[9/16] w-full block" />
      </div>

      {/* Interactive Timeline Scrubber + Scene Jump Pills */}
      <div className="space-y-2">
        <input
          type="range"
          aria-label="Línea de tiempo de la película"
          min={0}
          max={Math.max(1, duration)}
          step={0.05}
          value={Math.min(cursorTime, Math.max(1, duration))}
          onChange={(e) => scrubTo(Number(e.target.value))}
          className="h-2 w-full accent-brass"
        />

        {!compact ? (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {scenes.map((scene, idx) => {
              const isCurrent = scene === activeScene;
              const label =
                scene.kind === "title"
                  ? "Apertura"
                  : scene.kind === "end"
                    ? "Cierre"
                    : `Escena ${idx}`;
              return (
                <button
                  key={`${scene.kind}-${idx}`}
                  type="button"
                  onClick={() => scrubTo(scene.start + 0.15)}
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    isCurrent
                      ? "border-brass bg-brass/20 text-brass"
                      : "border-line bg-panel-2/70 text-muted hover:text-paper",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {busy ? (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-brass">
            <span>Codificando MP4 en tu dispositivo…</span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-gradient-to-r from-amber-300 via-brass to-crimson transition-[width] duration-200"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className={cn("grid gap-2.5", compact ? "grid-cols-2" : "sm:grid-cols-3")}>
        <Button onClick={() => setPlaying((p) => !p)} disabled={busy}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
          {playing ? "Pausar" : "Reproducir"}
        </Button>

        <Button variant="quiet" onClick={() => scrubTo(0.2)} disabled={busy}>
          <RotateCcw size={15} />
          Inicio
        </Button>

        {!compact ? (
          <Button
            variant="crimson"
            onClick={() => void save()}
            disabled={busy || film.cast.length === 0}
          >
            <Download size={16} />
            Exportar video
          </Button>
        ) : null}
      </div>

      {film.cast.length === 0 && !compact ? (
        <p className="flex items-center gap-1.5 text-xs text-brass">
          <Sparkles size={13} />
          Suma al menos un personaje en Elenco o Forja para activar la exportación MP4.
        </p>
      ) : null}
      {note ? <p className="text-xs text-muted">{note}</p> : null}
    </div>
  );
}
