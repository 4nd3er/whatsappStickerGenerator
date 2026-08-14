# botSticker

Bot de WhatsApp que convierte imágenes en stickers usando `whatsapp-web.js`.

## Estructura

- [src/index.js](src/index.js): código principal del bot.
- [package.json](package.json): scripts y dependencias.

## Requisitos

- Node.js 16+ (recomendado 18+)
- npm

## Instalación

1. Clona el repositorio y entra en la carpeta del proyecto.
2. Instala dependencias:

```bash
npm install
```

## Ejecutar el bot

Inicia el bot en modo desarrollo:

```bash
npm run dev
```

La primera vez te mostrará un QR en la consola; escanéalo con WhatsApp Web.

## Uso

- Envía o reenvía una imagen y escribe `!sticker` en el chat para que el bot la convierta en sticker.
- También funciona si citas una imagen y envías `!sticker` en la respuesta.

Ejemplos:

- Mensaje directo con imagen y texto `!sticker`.
- Citar una imagen existente y enviar `!sticker` (el bot usará la media citada).

## Registro y diagnóstico

El bot incluye reintentos y logging ampliado al descargar media. Si ocurre un fallo en `downloadMedia`, revisa la salida de la consola; el bot intentará notificar al remitente cuando no pueda descargar la imagen.

Si necesitas más detalle:

- Revisa los logs del terminal donde ejecutas `npm run dev`.
- Asegúrate de que Chromium/Chromium-embedded pueda ejecutarse en tu sistema (flags en [src/index.js](src/index.js)).

## Troubleshooting (problemas comunes)

- Error al descargar media (ej. `downloadMedia falló: r`):
  - Intenta ejecutar con `headless: false` en la configuración de `puppeteer` dentro de [src/index.js](src/index.js) para ver el navegador.
  - Asegúrate de que no hay restricciones de sandbox en macOS; en entornos con permisos limitados prueba a quitar `--no-sandbox`/`--disable-setuid-sandbox` (sólo si sabes lo que haces).
  - Borra la sesión guardada (carpeta `.wwebjs_auth` / LocalAuth storage) si la sesión está corrupta.

- Errores relacionados con versiones: verifica que la versión de `whatsapp-web.js` en [package.json](package.json) sea compatible con tu entorno.

## Contribuir

Si quieres mejorar el bot, abre un issue o un pull request con los cambios propuestos.

## Licencia

Proyecto con licencia abierta (elige la que prefieras antes de publicar).