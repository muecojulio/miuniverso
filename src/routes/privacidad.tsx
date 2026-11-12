import * as Dialog from "@radix-ui/react-dialog";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Database,
  HardDrive,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { getStudioStorageStats, type StudioStorageStats } from "@/lib/studio/db-indexed";
import { useStudio } from "@/lib/studio/store";

export const Route = createFileRoute("/privacidad")({ component: Privacidad });

function Privacidad() {
  const films = useStudio((s) => s.films);
  const photoConsent = useStudio((s) => s.photoShareConsent);
  const textConsent = useStudio((s) => s.textShareConsent);
  const revokeAllConsents = useStudio((s) => s.revokeAllConsents);
  const clearCache = useStudio((s) => s.clearCache);
  const wipeEverything = useStudio((s) => s.wipeEverything);

  const [stats, setStats] = useState<StudioStorageStats | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const refreshStats = useCallback(async () => {
    setStats(await getStudioStorageStats());
  }, []);

  useEffect(() => {
    void refreshStats();
  }, [refreshStats, films]);

  const totalCastPhotos = films.reduce(
    (acc, f) => acc + f.cast.filter((c) => Boolean(c.photo || c.portrait)).length,
    0,
  );

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <header className="studio-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest text-emerald uppercase">
                <ShieldCheck size={15} />
                CENTRO DE PRIVACIDAD, SEGURIDAD Y DERECHOS DE DATOS
              </p>
              <h1 className="mt-2 text-3xl sm:text-4xl">
                Política de Privacidad Integral
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Última actualización: 12 de noviembre de 2026 · Arquitectura{" "}
                <strong className="text-paper">Local-First</strong> sin cuentas obligatorias, sin
                rastreadores publicitarios y con control total en tu propio dispositivo.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex min-h-9 items-center rounded-full border border-line bg-panel-2 px-4 text-xs font-medium text-paper hover:border-brass/50"
            >
              ← Volver al Estudio
            </Link>
          </div>
        </header>

        {/* Live Privacy, Security, DB Index & Cache Control Panel */}
        <section className="studio-card space-y-4 border-emerald/35 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-2xl text-paper">
              <HardDrive size={20} className="text-emerald" />
              Panel de Control en Vivo de tus Datos Locales
            </h2>
            <button
              type="button"
              onClick={() => void refreshStats()}
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel-2 px-3 py-1 text-xs text-muted hover:text-paper"
            >
              <RefreshCw size={12} />
              Actualizar estado
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-panel-2/70 p-3.5">
              <p className="text-xs text-muted">Producciones y rostros locales</p>
              <p className="mt-1 font-display text-2xl text-paper">
                {films.length} {films.length === 1 ? "película" : "películas"}
              </p>
              <p className="text-xs text-emerald">
                {totalCastPhotos} imágenes guardadas solo en tu navegador
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-panel-2/70 p-3.5">
              <p className="text-xs text-muted">Caché multinivel (L1 + IndexedDB)</p>
              <p className="mt-1 font-display text-2xl text-paper">
                {stats ? stats.l2CacheTotal : 0} entradas
              </p>
              <p className="text-xs text-brass">
                {stats
                  ? `${stats.l2Translations} traducciones · ${stats.l2Stills} planos · ${stats.l1Hits} aciertos L1`
                  : "Calculando…"}
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-panel-2/70 p-3.5">
              <p className="text-xs text-muted">Consentimientos de sesión</p>
              <p className="mt-1 font-display text-2xl text-paper">
                {photoConsent || textConsent ? "Activos" : "Cerrados"}
              </p>
              <p className="text-xs text-muted">
                Foto: {photoConsent ? "Autorizada" : "Bloqueada"} · Texto:{" "}
                {textConsent ? "Autorizado" : "Bloqueado"}
              </p>
            </div>
          </div>

          {stats ? (
            <div className="rounded-2xl border border-line/70 bg-ink/50 p-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5 font-medium text-paper">
                <Database size={13} className="text-cyan" />
                Índices B-Tree activos (IndexedDB v{stats.dbVersion}):
              </span>{" "}
              {stats.indexes.join(" · ")}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2.5 pt-1">
            <Button
              variant="quiet"
              disabled={!photoConsent && !textConsent}
              onClick={() => {
                revokeAllConsents();
                toast.success("Permisos de envío externo revocados de inmediato.");
              }}
            >
              <Lock size={15} className="text-emerald" />
              Revocar permisos de envío
            </Button>

            <Button
              variant="quiet"
              onClick={async () => {
                await clearCache();
                await refreshStats();
                toast.success("Caché temporal de traducciones y planos vaciada.");
              }}
            >
              <RefreshCw size={15} className="text-brass" />
              Vaciar caché temporal
            </Button>

            <Dialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
              <Dialog.Trigger asChild>
                <Button variant="crimson">
                  <Trash2 size={15} />
                  Borrar todos mis datos y rostros
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm" />
                <Dialog.Content className="studio-card fixed top-1/2 left-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 p-6">
                  <Dialog.Title className="flex items-center gap-2 font-display text-2xl text-paper">
                    <AlertTriangle size={22} className="text-crimson" />
                    ¿Eliminar todos los datos locales?
                  </Dialog.Title>
                  <Dialog.Description className="text-sm leading-relaxed text-muted">
                    Esta acción vacía de forma inmediata e irreversible todas tus películas,
                    guiones, fotos de elenco, retratos, contadores diarios y caché almacenados en{" "}
                    <strong className="text-paper">IndexedDB</strong> y{" "}
                    <strong className="text-paper">localStorage</strong> en este navegador.
                  </Dialog.Description>
                  <div className="flex justify-end gap-2.5 pt-2">
                    <Dialog.Close asChild>
                      <Button variant="quiet">Cancelar</Button>
                    </Dialog.Close>
                    <Button
                      variant="crimson"
                      onClick={async () => {
                        await wipeEverything();
                        await refreshStats();
                        setConfirmOpen(false);
                        toast.success(
                          "Todos tus datos, rostros y caché fueron eliminados de este dispositivo.",
                        );
                      }}
                    >
                      Sí, eliminar todo ahora
                    </Button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          </div>
        </section>

        {/* Formal Legal & Technical Privacy Sections */}
        <article className="studio-card space-y-6 p-5 text-sm leading-relaxed text-muted sm:p-7">
          <section className="space-y-2">
            <h2 className="text-xl text-paper">
              1. Principio Rector: Privacidad por Diseño (Local-First)
            </h2>
            <p>
              <strong className="text-paper">Mi Universo</strong> está diseñado para que tu imagen
              personal, tus historias y tus películas permanezcan bajo tu control exclusivo. La
              aplicación no exige registro de cuenta ni almacena tus fotografías en ninguna base de
              datos centralizada o compartida en la nube, evitando de raíz cualquier exposición
              masiva de rostros o creaciones personales.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl text-paper">
              2. Inventario de Datos y Almacenamiento Local
            </h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-paper">Fotografías y Retratos:</strong> Se validan
                localmente (admitiendo únicamente formatos de mapa de bits JPG, PNG, WebP, AVIF o
                HEIC y bloqueando archivos ejecutables o SVG con scripts), se redimensionan a un
                máximo de 640 px en el propio navegador y se guardan exclusivamente en la base de
                datos local <code className="text-brass">IndexedDB (miuniverso v2)</code> de tu
                dispositivo.
              </li>
              <li>
                <strong className="text-paper">Guiones, Elenco y Preferencias:</strong> Se
                almacenan por registro individual indexado (<code className="text-brass">films_v2</code>{" "}
                y <code className="text-brass">studio_meta</code>) únicamente en tu navegador.
              </li>
              <li>
                <strong className="text-paper">Videos Exportados (MP4 / WebM):</strong> El
                Proyector Local codifica audio y video mediante WebCodecs / MediaRecorder dentro de
                tu dispositivo y entrega el archivo directamente a tu carpeta de descargas o menú
                Compartir, sin pasar por servidores externos.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl text-paper">
              3. Servicios Externos Opcionales y Consentimiento Expreso (Opt-In)
            </h2>
            <p>
              Por defecto, los interruptores de transferencia externa inician{" "}
              <strong className="text-paper">desactivados</strong> en cada sesión. Solo cuando tú
              los activas expresamente y pulsas una acción de generación externa ocurre lo
              siguiente:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-paper">Traducción y Fotograma Base («Crear plano gratis»):</strong>{" "}
                Al activar <em>«Autorizo enviar el texto»</em>, el texto sanitizado de la escena
                (nunca tu fotografía) se consulta en la API anónima de{" "}
                <strong className="text-paper">MyMemory</strong> (español → inglés) y en{" "}
                <strong className="text-paper">Pollinations.ai</strong> con cabecera{" "}
                <code>Referrer-Policy: no-referrer</code>. No envías cuentas ni rostros; la fusión
                del rostro sobre el plano ocurre localmente en tu pantalla.
              </li>
              <li>
                <strong className="text-paper">Vestuario IA y Animación de Movimiento:</strong> Al
                activar expresamente <em>«Autorizo enviar la foto»</em> y pulsar{" "}
                <em>«Retrato IA gratis»</em>, <em>«Vestir con mi cara»</em> o{" "}
                <em>«Animar el plano»</em>, la imagen del personaje y la descripción del vestuario
                o movimiento se envían mediante HTTPS a los espacios públicos de{" "}
                <strong className="text-paper">Qwen Image Edit</strong> y{" "}
                <strong className="text-paper">Wan 2.2</strong> alojados en Hugging Face Spaces
                (<code>*.hf.space</code>) con el único propósito efímero de generar el retrato o
                clip solicitado. Dichos servicios públicos están sujetos a las políticas de
                privacidad y colas de Hugging Face.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl text-paper">
              4. Tratamiento de Imagen Facial y Datos Biométricos
            </h2>
            <p>
              Mi Universo <strong className="text-paper">no extrae vectores de identificación biométrica</strong>{" "}
              ni entrena modelos de reconocimiento facial con tu rostro. El cálculo automático de
              encuadre (<code>skinFocus</code>) analiza únicamente tonos de luminancia y
              crominancia en memoria RAM local dentro de un lienzo temporal de 90 px que se
              descarta inmediatamente después de centrar la imagen. Asimismo, no nos conectamos a
              plataformas opacas de intercambio de rostros (<em>deepfake face-swap</em>).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl text-paper">
              5. Retención, Caché Local y Medidas de Seguridad Activas
            </h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="text-paper">Caché con Expiración Automática (TTL):</strong> Las
                traducciones se guardan en caché local hasta por 7 días y los fotogramas generados
                hasta por 24 horas en <code>studio_cache</code>, depurándose automáticamente
                mediante el índice <code>by_expiresAt</code>. Los contadores diarios en{" "}
                <code>localStorage</code> eliminan automáticamente días vencidos.
              </li>
              <li>
                <strong className="text-paper">Defensas Técnicas:</strong> Política de Seguridad de
                Contenido (<code>Content-Security-Policy</code>), bloqueo estricto de imágenes SVG
                o HTML inyectado, lista blanca de dominios HTTPS para respuestas multimedia,
                sanitización de caracteres de control/bidi y cabeceras{" "}
                <code>X-Content-Type-Options: nosniff</code> y <code>Strict-Transport-Security</code>.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl text-paper">
              6. Propiedad Intelectual y Reinvención Original
            </h2>
            <p>
              Tú conservas los derechos sobre tus textos y fotografías propias. Cuando mencionas
              arquetipos conocidos de la cultura popular, el motor creativo los transforma en
              diseños originales inspirados libremente en colores, siluetas y elementos temáticos,
              sin reproducir logotipos ni marcas registradas.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl text-paper">
              7. Ejercicio de Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)
            </h2>
            <p>
              Conforme a la legislación aplicable en materia de protección de datos personales
              (incluyendo la LFPDPPP en México y estándares equivalentes como el RGPD), al residir
              toda la información en tu propio dispositivo puedes ejercer tus derechos de manera{" "}
              <strong className="text-paper">inmediata y autónoma</strong> sin intermediarios:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-paper">Acceso y Rectificación:</strong> Consulta y edita en
                cualquier momento cualquier título, historia, personaje o fotografía desde Estudio,
                Elenco, Forja y Guion.
              </li>
              <li>
                <strong className="text-paper">Oposición y Revocación:</strong> Mantén apagados los
                interruptores de envío o pulsa <em>«Revocar permisos de envío»</em> arriba.
              </li>
              <li>
                <strong className="text-paper">Cancelación / Supresión Total:</strong> Elimina
                películas individuales desde la cartelera o pulsa{" "}
                <em>«Borrar todos mis datos y rostros»</em> en el panel superior para destruir
                instantáneamente toda la base local y la caché.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl text-paper">
              8. Menores de Edad y Actualizaciones de esta Política
            </h2>
            <p>
              Si eres menor de edad, utiliza fotografías propias únicamente con la supervisión y
              autorización de tu madre, padre o tutor legal, y evita incluir datos personales
              sensibles (direcciones, teléfonos o nombres completos reales) en los guiones. Cualquier
              mejora futura a estas políticas se publicará directamente en esta sección con su
              fecha de entrada en vigor.
            </p>
          </section>
        </article>
      </div>
    </Shell>
  );
}
