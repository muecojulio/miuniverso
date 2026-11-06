import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/instalar")({ component: Instalar });

function Instalar() {
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    const installUrl = `${window.location.origin}/?install=1&platform=ios`;
    setUrl(installUrl);
    let alive = true;
    void import("qrcode").then(async (QR) => {
      const data = await QR.toDataURL(installUrl, {
        margin: 1,
        width: 280,
        color: { dark: "#100e0c", light: "#f4f0e6" },
      });
      if (alive) setQr(data);
    });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-medium tracking-widest text-brass">INSTALAR</p>
        <h1 className="mt-2 text-4xl">En la pantalla de inicio</h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          Es una aplicación instalable, no una página suelta. En el iPhone se añade desde Safari.
        </p>
      </header>
      <ol className="mb-6 space-y-3 text-sm text-paper">
        <li className="rounded-card border border-line bg-panel p-4">1. Abre el enlace publicado en Safari.</li>
        <li className="rounded-card border border-line bg-panel p-4">2. Pulsa Compartir.</li>
        <li className="rounded-card border border-line bg-panel p-4">3. Elige Añadir a pantalla de inicio.</li>
        <li className="rounded-card border border-line bg-panel p-4">4. Ábrela desde el icono. Queda como app.</li>
      </ol>
      {qr ? <img src={qr} alt="Código para instalar en el iPhone" className="w-56 rounded-card" /> : null}
      {url ? <p className="mt-3 break-all text-sm text-muted">{url}</p> : null}
    </Shell>
  );
}
