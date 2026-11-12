import { createFileRoute, Link } from "@tanstack/react-router";
import { Hammer, Users } from "lucide-react";
import { CastEditor } from "@/components/cast-editor";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/forja")({ component: Forja });

function Forja() {
  return (
    <Shell>
      <header className="studio-card mb-6 overflow-hidden p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-crimson uppercase">
              <Hammer size={14} />
              FORJA DE LEYENDAS · CREACIÓN ORIGINAL
            </p>
            <h1 className="mt-2 text-3xl sm:text-4xl">Inventa un personaje nuevo</h1>
            <p className="mt-2 max-w-xl text-sm text-muted">
              Diseña desde cero un héroe solar, un monarca sombrío o un guerrero de anime. Elige
              colores, emblema y poder elemental; el retrato en vivo responde al instante.
            </p>
          </div>
          <Link
            to="/elenco"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-panel-2 px-3.5 text-xs font-medium text-paper hover:border-brass/50"
          >
            <Users size={13} className="text-brass" />
            Ir a Elenco con foto
          </Link>
        </div>
      </header>
      <CastEditor forged={true} />
    </Shell>
  );
}
