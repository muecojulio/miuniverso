import { createFileRoute, Link } from "@tanstack/react-router";
import { Hammer, Users } from "lucide-react";
import { CastEditor } from "@/components/cast-editor";

export const Route = createFileRoute("/elenco")({ component: Elenco });

function Elenco() {
  return (
    <>
      <header className="studio-card mb-6 overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-brass uppercase">
              <Users size={14} />
              CASTING PRINCIPAL · ROSTROS REALES
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl">Elenco de tu película</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Sube una foto de frente con buena luz (se comprime y guarda localmente) y elige el
              traje heroico, villano o anime que vestirá en pantalla.
            </p>
          </div>
          <Link to="/forja" className="control control-quiet control-compact">
            <Hammer size={13} className="text-brass" />
            Ir a Forja de inéditos
          </Link>
        </div>
      </header>
      <CastEditor forged={false} />
    </>
  );
}
