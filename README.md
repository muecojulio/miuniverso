# Mi Universo — Gran Atelier de Cine Interactivo

Estudio creativo para dirigir una película viva con tu cara: superhéroe, villano cósmico o personaje de anime, con storyboard automático, previsualización en tiempo real y exportación local MP4/WebM.

## Novedades de esta actualización

- **Experiencia visual viva (Cinema Atelier):** interfaz Technicolor Noir con proyectores ambientales, tarjetas de elenco interactivas en lienzo (`ActorAvatarCanvas`), plantillas escénicas, arquetipos rápidos, línea de tiempo interactiva con *timecode* y desglose visual de storyboard escena por escena.
- **Base de datos local indexada (`IndexedDB miuniverso v2`):** migración automática desde v1 a registros individuales normalizados (`films_v2`, `studio_meta`, `studio_cache`) con 5 índices B-Tree (`by_updatedAt`, `by_tone`, `by_title`, `by_expiresAt`, `by_kind`) para consultas ordenadas, filtrado por tono y limpieza automática de expiraciones.
- **Caché multinivel (L1 LRU + L2 IndexedDB + Memoización 60fps):** caché en memoria e IndexedDB para traducciones (TTL 7 días) y fotogramas generados (TTL 24 h), decodificación de imágenes memoizada, detección de encuadre con `WeakMap` y cabeceras `Cache-Control` inmutables en producción.
- **Seguridad activa y 0 vulnerabilidades:** actualización de dependencias críticas (`better-auth`, `zod`, `seroval`, `minimatch` — `npm audit` en 0 vulnerabilidades), CSP estricta, cabeceras HSTS/COOP/Permissions-Policy, bloqueo de imágenes SVG/scripts, lista blanca HTTPS para medios de Hugging Face Spaces y consentimiento expreso obligatorio antes de cualquier envío externo.
- **Política de Privacidad Integral y Derechos ARCO (`/privacidad`):** panel de transparencia en vivo para consultar índices y caché, revocar permisos, vaciar caché temporal o destruir instantáneamente todos los datos y rostros locales.

## Publicar

Importa este repositorio en Vercel (`npm run build`). Funciona con Node.js 22.x o 24.x y no requiere base de datos en la nube para las películas locales.

## Servicios públicos opcionales (bajo consentimiento expreso)

- **Qwen Image Edit & Wan 2.2** (Hugging Face Spaces públicos) para vestuario y animación opcionales.
- **MyMemory & Pollinations.ai** para traducción anónima del escenario y generación de planos base (sin enviar fotos).
- Interpretación de eventos SSE mediante [eventsource-parser](https://github.com/rexxars/eventsource-parser) (licencia MIT).
