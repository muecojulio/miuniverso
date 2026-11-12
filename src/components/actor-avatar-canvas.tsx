import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { drawActor } from "@/lib/studio/draw";
import { shade, toLook, type Power } from "@/lib/studio/look";
import { loadImage } from "@/lib/studio/photo";
import type { Actor } from "@/lib/studio/types";

const POWER_BACKDROP: Record<Power, [string, string]> = {
  luz: ["#3b2c12", "#140f1d"],
  sombra: ["#231433", "#0b0912"],
  fuego: ["#471a18", "#160b12"],
  hielo: ["#143344", "#0d1220"],
  rayo: ["#18294d", "#110e22"],
  naturaleza: ["#163828", "#0d1416"],
  agua: ["#133246", "#0d121e"],
  viento: ["#1f2e3d", "#101320"],
  tecnologia: ["#1c293d", "#0e111b"],
  cosmos: ["#281948", "#0c0a18"],
  fuerza: ["#3d201c", "#140e16"],
};

export function ActorAvatarCanvas({
  actor,
  animate = false,
  className,
}: {
  actor: Actor;
  animate?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!actor.photo) {
      imgRef.current = null;
    } else {
      void loadImage(actor.photo)
        .then((img) => {
          if (!cancelled) imgRef.current = img;
        })
        .catch(() => {
          if (!cancelled) imgRef.current = null;
        });
    }
    return () => {
      cancelled = true;
    };
  }, [actor.photo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 260;
    const H = 320;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const look = toLook(actor);
    const [top, bottom] = POWER_BACKDROP[look.power];

    const renderFrame = (time: number) => {
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, top);
      bg.addColorStop(1, bottom);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Subtle cinematic spotlight halo behind head/shoulders
      const halo = ctx.createRadialGradient(W / 2, H * 0.36, 12, W / 2, H * 0.36, 128);
      halo.addColorStop(0, `${shade(look.primary, 35)}66`);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      // Ambient bokeh sparks
      for (let i = 0; i < 12; i++) {
        const px = ((i * 53 + time * 14) % (W - 20)) + 10;
        const py = ((i * 37) % (H * 0.72)) + 14;
        ctx.globalAlpha = 0.25 + Math.abs(Math.sin(time * 1.4 + i)) * 0.45;
        ctx.fillStyle = look.metal;
        ctx.beginPath();
        ctx.arc(px, py, i % 3 === 0 ? 2.1 : 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      drawActor(
        ctx,
        { ...look, name: actor.name.trim() || "Tu personaje" },
        imgRef.current,
        actor.frame,
        W / 2,
        H * 0.86,
        0.84,
        time,
        true,
      );
    };

    if (!animate) {
      // Render immediately and once more after photo decode settles
      renderFrame(1.4);
      const timer = setTimeout(() => renderFrame(1.4), 90);
      return () => clearTimeout(timer);
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      renderFrame((now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [actor, animate]);

  return (
    <canvas
      ref={canvasRef}
      aria-label={`Vista previa de ${actor.name || "personaje"}`}
      className={cn(
        "aspect-[13/16] w-full rounded-2xl border border-line/80 bg-ink object-cover shadow-inner",
        className,
      )}
    />
  );
}
