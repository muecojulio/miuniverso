import { createFileRoute } from "@tanstack/react-router";
import { CastEditor } from "@/components/cast-editor";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/forja")({ component: Forja });

function Forja() {
  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-medium tracking-widest text-brass">FORJA</p>
        <h1 className="mt-2 text-4xl">Un personaje nuevo</h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          Inventa un héroe, un villano o un anime que no existe. Describe colores, poder y silueta. Si quieres, ponle tu cara.
        </p>
      </header>
      <CastEditor forged={true} />
    </Shell>
  );
}
