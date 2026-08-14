 # botSticker

 Bot de WhatsApp que convierte imágenes en stickers.

 Nota: este proyecto NO usa `whatsapp-web.js`. En su lugar utiliza las siguientes librerías:

- `@whiskeysockets/baileys`: cliente de WhatsApp que implementa el protocolo Web/API (conexión por WebSocket). Maneja autenticación, envío/recepción de mensajes y descarga/subida de medios.
- `sharp`: procesamiento y manipulación de imágenes (redimensionar, convertir formato y preparar la imagen para sticker).
- `pino`: logger rápido y eficiente para registrar eventos y errores en el bot.
- `qrcode-terminal`: muestra el QR de autenticación en la consola para escanear con WhatsApp.

Además de las anteriores, el proyecto usa herramientas de desarrollo:

- `typescript` y `tsx` para ejecutar código TypeScript en desarrollo.

## Estructura

- [src/index.ts](src/index.ts): código principal del bot.
- [package.json](package.json): scripts y dependencias.

## Requisitos

- Node.js 16+ (recomendado 18+)
- npm

## Instalación

```bash
npm install
```

## Ejecutar el bot

En desarrollo (observa cambios con `tsx`):

```bash
npm run dev
```

O iniciar directamente:

```bash
npm start
```

La primera vez mostrará un QR en la consola; escanéalo con WhatsApp para autenticar la sesión.

## Qué hace cada librería (detalle rápido)

- `@whiskeysockets/baileys`: establece la conexión con WhatsApp, gestiona la sesión y proporciona métodos para enviar/recibir mensajes y descargar medios.
- `sharp`: convierte la imagen a un formato y tamaño adecuados para sticker (p. ej. WebP), aplica recorte/redimensionado si es necesario.
- `pino`: centraliza y formatea logs (info/debug/error) para diagnóstico y producción.
- `qrcode-terminal`: genera y pinta el código QR en la consola para la autenticación.

## Uso

- Envía o reenvía una imagen y escribe `!sticker` en el chat para que el bot la convierta en sticker.
- También funciona si citas una imagen y envías `!sticker` en la respuesta.

## Registro y diagnóstico

- Los logs se imprimen en la consola usando `pino`.
- Si ocurre un fallo al descargar media se intentará reintentar y se notificará al remitente en caso de fallo persistente.

## Troubleshooting

- Si no aparece el QR: comprueba que no hay errores en la consola y que `qrcode-terminal` se ejecuta.
- Problemas con la descarga de media: revisa permisos, conexiones y logs; `baileys` expone errores detallados sobre transferencia de archivos.
- Problemas con el procesamiento de imágenes: revisa que `sharp` esté correctamente instalado (puede requerir dependencias nativas en tu sistema).

## Contribuir

Si quieres mejorar el bot, abre un issue o un pull request con los cambios propuestos.

## Licencia

Proyecto con licencia abierta (elige la que prefieras antes de publicar).