import { createFileRoute } from "@tanstack/react-router";
import { CastEditor } from "@/components/cast-editor";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/elenco")({ component: Elenco });

function Elenco() {
  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-medium tracking-widest text-brass">ELENCO</p>
        <h1 className="mt-2 text-4xl">Las personas</h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          Una foto de frente, con luz. Luego describe en qué héroe, villano o personaje de anime se convierte. Puedes sumar varias.
        </p>
      </header>
      <CastEditor forged={false} />
    </Shell>
  );
}
