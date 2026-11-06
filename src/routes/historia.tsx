import { createFileRoute } from "@tanstack/react-router";
import { ChoiceRow } from "@/components/role-chips";
import { Shell } from "@/components/shell";
import { TONE_LABEL, type Tone } from "@/lib/studio/types";
import { useStudio } from "@/lib/studio/store";

export const Route = createFileRoute("/historia")({ component: Historia });

function Historia() {
  const film = useStudio((s) => s.films.find((item) => item.id === s.activeId));
  const setTitle = useStudio((s) => s.setTitle);
  const setStory = useStudio((s) => s.setStory);
  const setTone = useStudio((s) => s.setTone);
  if (!film) return null;

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-medium tracking-widest text-brass">HISTORIA</p>
        <h1 className="mt-2 text-4xl">Qué ocurre</h1>
        <p className="mt-3 max-w-md text-sm text-muted">
          Escribe en frases cortas. Si nombras a alguien del elenco, esa persona sale en esa escena.
        </p>
      </header>
      <div className="space-y-4">
        <label className="block text-sm text-muted">
          Título
          <input className="field mt-2" value={film.title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <div>
          <p className="mb-2 text-sm text-muted">Tono</p>
          <ChoiceRow
            columns={4}
            value={film.tone}
            onChange={(tone: Tone) => setTone(tone)}
            options={(Object.keys(TONE_LABEL) as Tone[]).map((id) => ({ id, label: TONE_LABEL[id] }))}
          />
        </div>
        <label className="block text-sm text-muted">
          Historia
          <textarea
            className="field mt-2 min-h-64"
            value={film.story}
            placeholder="En la azotea, Ana abre los ojos. Bruno sale de la sombra. Los dos chocan. Al final, el horizonte se queda en calma."
            onChange={(event) => setStory(event.target.value)}
          />
        </label>
      </div>
    </Shell>
  );
}
