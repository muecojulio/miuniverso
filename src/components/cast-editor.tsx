import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { bustLine, RoleChips } from "@/components/role-chips";
import { compressPhoto } from "@/lib/studio/photo";
import { portraitPrompt } from "@/lib/studio/prompt";
import { dressPhoto } from "@/lib/studio/qwen";
import { blankActor, useStudio } from "@/lib/studio/store";
import { ROLE_LABEL, type Actor } from "@/lib/studio/types";

export function CastEditor({ forged }: { forged: boolean }) {
  const film = useStudio((s) => s.films.find((item) => item.id === s.activeId));
  const addActor = useStudio((s) => s.addActor);
  const updateActor = useStudio((s) => s.updateActor);
  const removeActor = useStudio((s) => s.removeActor);
  const [draft, setDraft] = useState<Actor>(() => blankActor(forged ? "villano" : "heroe", forged));
  const [error, setError] = useState("");
  const people = (film?.cast ?? []).filter((actor) => actor.forged === forged);

  async function onFile(file: File | undefined, apply: (photo: string) => void) {
    if (!file) return;
    try {
      apply(await compressPhoto(file));
      setError("");
    } catch {
      setError("Esa foto no se pudo leer. Prueba con otra.");
    }
  }

  return (
    <div className="space-y-4">
      <form
        className="space-y-3 rounded-card border border-line bg-panel p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!draft.name.trim()) {
            setError("Ponle un nombre.");
            return;
          }
          if (!draft.description.trim()) {
            setError(forged ? "Describe al personaje." : "Describe en qué héroe, villano o anime se convierte.");
            return;
          }
          addActor({ ...draft, name: draft.name.trim(), description: draft.description.trim() });
          setDraft(blankActor(draft.role, forged));
          setError("");
        }}
      >
        <RoleChips value={draft.role} onChange={(role) => setDraft({ ...draft, role })} />
        <input
          className="field"
          placeholder="Nombre"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
        <textarea
          className="field min-h-28"
          placeholder={
            forged
              ? "Colores, poder, capa, cabello, lugar. Ejemplo: armadura de oro, rayo, cabello en puntas."
              : "En qué personaje se convierte. Ejemplo: capa marfil, emblema de sol, luz cálida."
          }
          value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
        <label className="block text-sm text-muted">
          {forged ? "Foto opcional" : "Foto de la cara"}
          <input
            className="mt-2 block w-full text-sm text-paper file:mr-3 file:min-h-11 file:rounded-full file:border-0 file:bg-brass file:px-4 file:text-sm file:text-ink"
            type="file"
            accept="image/*"
            capture="user"
            onChange={(event) => void onFile(event.target.files?.[0], (photo) => setDraft({ ...draft, photo }))}
          />
        </label>
        {draft.photo ? (
          <img src={draft.photo} alt="" className="h-24 w-24 rounded-full object-cover" />
        ) : null}
        <Button type="submit">Añadir al elenco</Button>
        {error ? <p className="text-sm text-brass">{error}</p> : null}
      </form>
      <ul className="space-y-3">
        {people.map((actor) => (
          <li key={actor.id} className="space-y-3 rounded-card border border-line bg-panel p-4">
            <div className="flex items-center gap-3">
              {actor.photo ? (
                <img src={actor.photo} alt="" className="size-14 rounded-full object-cover" />
              ) : (
                <span className="flex size-14 items-center justify-center rounded-full bg-panel-2 text-xs text-muted">
                  Sin foto
                </span>
              )}
              <div>
                <p className="font-display text-xl">{actor.name}</p>
                <p className="text-sm text-muted">{ROLE_LABEL[actor.role]}</p>
              </div>
            </div>
            <p className="text-sm text-paper">{bustLine(actor.description)}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => removeActor(actor.id)}>
                Quitar
              </Button>
              {actor.photo ? (
                <Button
                  variant="quiet"
                  onClick={() => void makePortrait(actor, (portrait) => updateActor(actor.id, (current) => ({ ...current, portrait })))}
                >
                  Retrato gratis
                </Button>
              ) : null}
            </div>
            {actor.portrait ? (
              <img src={actor.portrait} alt={`Retrato de ${actor.name}`} className="w-full rounded-card" />
            ) : null}
          </li>
        ))}
      </ul>
      {!people.length ? <p className="text-sm text-muted">Todavía no hay nadie en esta sección.</p> : null}
    </div>
  );
}

async function makePortrait(actor: Actor, save: (portrait: string) => void) {
  try {
    const portrait = await dressPhoto(actor.photo ?? "", portraitPrompt(actor), new AbortController().signal);
    save(portrait);
    toast.success("Retrato listo. No usó cuota.");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "No se pudo crear el retrato.");
  }
}
