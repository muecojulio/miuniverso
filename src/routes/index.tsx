import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { useStudio } from "@/lib/studio/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const films = useStudio((s) => s.films);
  const activeId = useStudio((s) => s.activeId);
  const setActive = useStudio((s) => s.setActive);
  const newFilm = useStudio((s) => s.newFilm);
  const removeFilm = useStudio((s) => s.removeFilm);

  return (
    <Shell>
      <div className="space-y-8">
        <header>
          <p className="text-xs font-medium tracking-widest text-brass">ESTUDIO</p>
          <h1 className="mt-3 max-w-xl text-5xl text-paper">Mi Universo</h1>
          <p className="mt-4 max-w-md text-base text-muted">
            Sube tu cara, di en qué héroe, villano o anime te conviertes y crea el video en Rodaje. Hay un camino gratis y otro con Grok, que sí usa tu cuota.
          </p>
        </header>
        <section className="grid gap-3 sm:grid-cols-3">
          {[
            ["1", "Plano gratis", "Tu foto se queda en el teléfono y es la cara del personaje."],
            ["2", "Video que se mueve", "Gratis. Anima ese plano. La imagen sale solo si lo aceptas."],
            ["3", "Sin cuota", "El traje sobre tu cara y el video que se mueve no gastan Grok."],
          ].map(([n, title, copy]) => (
            <article key={n} className="rounded-card border border-line bg-panel p-4">
              <p className="text-sm text-brass">{n}</p>
              <h2 className="mt-2 text-2xl">{title}</h2>
              <p className="mt-2 text-sm text-muted">{copy}</p>
            </article>
          ))}
        </section>
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-3xl">Películas</h2>
            <Button onClick={newFilm}>Nueva</Button>
          </div>
          <ul className="space-y-2">
            {films.map((film) => (
              <li key={film.id}>
                <button
                  type="button"
                  onClick={() => setActive(film.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-card border border-line bg-panel px-4 py-3 text-left transition-colors duration-200 active:scale-[0.96]"
                >
                  <span>
                    <span className="block font-display text-2xl">{film.title || "Sin título"}</span>
                    <span className="text-sm text-muted">
                      {film.cast.length} {film.cast.length === 1 ? "persona" : "personas"}
                      {film.id === activeId ? " · abierta" : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Link to="/rodaje" className="inline-flex min-h-11 items-center rounded-full bg-brass px-5 text-sm font-medium text-ink">
              Ir a Rodaje
            </Link>
            {films.length > 1 ? (
              <button type="button" className="min-h-11 px-3 text-sm text-muted" onClick={() => removeFilm(activeId)}>
                Quitar la abierta
              </button>
            ) : null}
          </div>
        </section>
        <p className="text-sm text-muted">
          El plano gratis no envía tu foto. El video que se mueve sí la envía, y solo si activas el interruptor.{" "}
          <Link to="/privacidad" className="text-paper underline decoration-line underline-offset-4">
            Privacidad
          </Link>
          {" · "}
          <Link to="/instalar" className="text-paper underline decoration-line underline-offset-4">
            Instalar
          </Link>
        </p>
      </div>
    </Shell>
  );
}
