import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, Share, Smartphone, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/instalar")({ component: Instalar });

function Instalar() {
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const installUrl = `${window.location.origin}/?install=1&platform=ios`;
    setUrl(installUrl);
    let alive = true;
    void import("qrcode").then(async (QR) => {
      const data = await QR.toDataURL(installUrl, {
        margin: 2,
        width: 280,
        color: { dark: "#0d0b14", light: "#faf5eb" },
      });
      if (alive) setQr(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  async function copyInstallUrl() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Enlace copiado al portapapeles.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar automáticamente.");
    }
  }

  return (
    <Shell>
      <div className="space-y-6">
        <header className="studio-card p-5 sm:p-6">
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-brass uppercase">
            <Smartphone size={14} />
            PASE DE ESTUDIO MÓVIL · APLICACIÓN INSTALABLE (PWA)
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Lleva Mi Universo en tu inicio</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Instálala como aplicación nativa a pantalla completa, sin barras del navegador y con
            acceso inmediato a tus películas locales.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
          <ol className="space-y-3 text-sm text-paper">
            <li className="studio-card flex items-start gap-3.5 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brass text-sm font-bold text-ink">
                1
              </span>
              <div>
                <p className="font-semibold">Abre el enlace en Safari (iPhone) o Chrome (Android)</p>
                <p className="mt-0.5 text-xs text-muted">
                  Escanea el boleto QR o copia el enlace directo de instalación.
                </p>
              </div>
            </li>
            <li className="studio-card flex items-start gap-3.5 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-crimson text-sm font-bold text-white">
                2
              </span>
              <div>
                <p className="flex items-center gap-1.5 font-semibold">
                  Pulsa el menú Compartir <Share size={14} className="text-brass" />
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  En iOS aparece en la barra inferior de Safari; en Android en los tres puntos
                  superiores.
                </p>
              </div>
            </li>
            <li className="studio-card flex items-start gap-3.5 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-cyan text-sm font-bold text-ink">
                3
              </span>
              <div>
                <p className="font-semibold">Elige «Añadir a pantalla de inicio»</p>
                <p className="mt-0.5 text-xs text-muted">
                  El icono dorado de Mi Universo quedará junto a tus demás aplicaciones.
                </p>
              </div>
            </li>
            <li className="studio-card flex items-start gap-3.5 p-4">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald text-sm font-bold text-ink">
                4
              </span>
              <div>
                <p className="flex items-center gap-1.5 font-semibold">
                  ¡Luces, cámara, acción! <Sparkles size={14} className="text-brass" />
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  Ábrela desde su icono para rodar a pantalla completa con caché rápida.
                </p>
              </div>
            </li>
          </ol>

          <div className="studio-card flex flex-col items-center justify-center gap-4 p-5 text-center">
            <div className="film-sprocket w-full opacity-75" />
            <p className="text-xs font-semibold tracking-wider text-brass uppercase">
              Boleto de Acceso Directo
            </p>
            {qr ? (
              <img
                src={qr}
                alt="Código QR para instalar Mi Universo"
                className="w-52 rounded-2xl border-2 border-brass/50 shadow-lg"
              />
            ) : (
              <div className="flex size-52 items-center justify-center rounded-2xl border border-line bg-panel-2 text-xs text-muted">
                Generando código QR…
              </div>
            )}
            {url ? (
              <div className="w-full space-y-2">
                <p className="break-all rounded-xl border border-line bg-ink/70 px-3 py-2 font-mono text-[11px] text-muted">
                  {url}
                </p>
                <Button variant="quiet" onClick={() => void copyInstallUrl()} className="w-full">
                  {copied ? <Check size={15} className="text-emerald" /> : <Copy size={15} />}
                  {copied ? "Enlace copiado" : "Copiar enlace"}
                </Button>
              </div>
            ) : null}
            <div className="film-sprocket w-full opacity-75" />
          </div>
        </div>
      </div>
    </Shell>
  );
}
