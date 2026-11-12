# Mi Universo

Estudio para hacer una película con tu cara: héroe, villano o anime, con una historia escrita por ti.

La película del teléfono se genera en el propio dispositivo. La toma con Grok es opcional.

## Publicar

Importa este repositorio en Vercel. El comando de build ya está definido (`npm run build`). No hace falta base de datos ni variables para la película local.

Node.js 24.x

## Servicios públicos usados en el rodaje

Con el consentimiento correspondiente, el estudio utiliza los espacios públicos de
Qwen y Wan para retrato y animación, y el generador de imágenes para crear planos.
La historia o el título también se envían a la API anónima de MyMemory para intentar
traducir el fondo al inglés; si falla o alcanza su límite, se usa el texto original.
Los servicios externos pueden tener colas, límites o dejar de estar disponibles.
Las fotos solo se envían al aceptar expresamente su envío.

Para interpretar las respuestas de los espacios Gradio se usa el paquete de código
abierto [eventsource-parser](https://github.com/rexxars/eventsource-parser) (licencia MIT),
en lugar de copiar código sin atribución.
