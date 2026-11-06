import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FRAME_H, FRAME_W, filmLength, paintFilm } from "@/lib/studio/draw";
import { encodeFilm, shareOrSave } from "@/lib/studio/encode";
import { loadImage } from "@/lib/studio/photo";
import { useStudio } from "@/lib/studio/store";

export type StageHandle = {
  snapshot: () => string | null;
};

export const Stage = forwardRef<StageHandle>(function Stage(_, ref) {
  const film = useStudio((s) => s.films.find((item) => item.id === s.activeId) ?? s.films[0]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const images = useRef(new Map<string, HTMLImageElement>());
  const filmRef = useRef(film);
  filmRef.current = film;
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [note, setNote] = useState("");

  const drawAt = (time: number) => {
    const canvas = canvasRef.current;
    const current = filmRef.current;
    if (!canvas || !current) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    paintFilm(ctx, current, images.current, time);
  };

  useImperativeHandle(ref, () => ({
    snapshot: () => {
      const current = filmRef.current;
      const canvas = canvasRef.current;
      if (!current || !canvas) return null;
      const length = filmLength(current);
      drawAt(Math.min(length * 0.42, Math.max(2, length - 1)));
      let quality = 0.72;
      let url = canvas.toDataURL("image/jpeg", quality);
      while (url.length > 1_200_000 && quality > 0.42) {
        quality -= 0.1;
        url = canvas.toDataURL("image/jpeg", quality);
      }
      return url.length > 1_400_000 ? null : url;
    },
  }));

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
          if (!actor.photo) return;
          try {
            next.set(actor.id, await loadImage(actor.photo));
          } catch {
            // A broken photo falls back to the drawn face.
          }
        }),
      );
      if (cancel) return;
      images.current = next;
      drawAt(1.2);
    };
    void run();
    return () => {
      cancel = true;
    };
  }, [film]);

  useEffect(() => {
    if (!playing || !film) return;
    const length = filmLength(film);
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = (now - start) / 1000;
      drawAt(Math.min(t, length));
      if (t < length) raf = requestAnimationFrame(step);
      else setPlaying(false);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, film]);

  async function save() {
    const current = filmRef.current;
    const canvas = canvasRef.current;
    if (!current || !canvas || busy) return;
    setBusy(true);
    setNote("Guardando la película en el teléfono…");
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
      const safe = (current.title || "mi-universo").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
      await shareOrSave(result.blob, `${safe || "mi-universo"}.${result.ext}`);
      setNote("Listo. Si el teléfono lo ofrece, usa Compartir para guardarla en Fotos.");
    } catch {
      setNote("No se pudo guardar el video en este navegador. Puedes ver la película aquí.");
    } finally {
      setBusy(false);
    }
  }

  if (!film) return null;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-card border border-line bg-ink">
        <canvas ref={canvasRef} className="aspect-[9/16] w-full" />
      </div>
      {busy ? (
        <div className="h-1 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-brass transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => setPlaying(true)} disabled={playing || busy}>
          {playing ? "En pantalla" : "Ver película"}
        </Button>
        <Button variant="quiet" onClick={() => void save()} disabled={busy || film.cast.length === 0}>
          Guardar video
        </Button>
      </div>
      {note ? <p className="text-sm text-muted">{note}</p> : null}
    </div>
  );
});
