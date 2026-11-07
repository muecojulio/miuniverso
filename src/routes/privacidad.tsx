import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/shell";

export const Route = createFileRoute("/privacidad")({ component: Privacidad });

function Privacidad() {
  return (
    <Shell>
      <header className="mb-6">
        <p className="text-xs font-medium tracking-widest text-brass">PRIVACIDAD</p>
        <h1 className="mt-2 text-4xl">Tu cara se queda aquí</h1>
      </header>
      <div className="space-y-4 text-sm text-muted">
        <p>
          Las fotos, la historia y las películas hechas en el teléfono se guardan solo en este dispositivo. No hay cuenta. No hay una base de datos con tus fotos: una base compartida las dejaría a la vista de cualquiera, y eso no se usa.
        </p>
        <p>
          El botón «Guardar video» crea el archivo en el propio teléfono. Nadie más lo recibe.
        </p>
        <p>
          «Animar el plano» usa un modelo abierto y gratis (Wan 2.2, el mismo camino que el repositorio público nifty-vid). Si activas el interruptor, la imagen del plano —con tu cara si la pusiste— va a un espacio público de Hugging Face y vuelve un video corto que se mueve. Máximo 2 al día. No es Grok y no se paga. «Crear el plano» no envía la foto: solo el texto, y la cara se coloca en el teléfono. «Rodar video» sí usa Grok y tu cuota.
        </p>
        <p>
          «Retrato con Grok» sigue siendo opcional y aparte. Solo entonces esa foto sale del teléfono hacia Grok, con tu propia cuota. No se revende y no se manda a páginas de intercambio de caras.
        </p>
        <p>
          Esas otras páginas, aunque digan que son gratis, piden subir la cara a un servidor ajeno. No están conectadas. Tampoco se copió código de repositorios de intercambio de caras: varios piden modelos opacos o se llevan la foto fuera del teléfono.
        </p>
        <p>
          Si escribes el nombre de un personaje famoso, la película lo reinventa: colores, poder y silueta parecidos, pero como un original. No copia marcas ni trajes registrados.
        </p>
        <p>
          Puedes borrar una película desde Inicio. Borrar los datos del navegador borra también las fotos guardadas aquí.
        </p>
        <Link to="/" className="inline-flex min-h-11 items-center text-paper underline decoration-line underline-offset-4">
          Volver al estudio
        </Link>
      </div>
    </Shell>
  );
}
