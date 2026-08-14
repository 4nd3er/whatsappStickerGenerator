import makeWASocket, {
    DisconnectReason,
    downloadMediaMessage,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    Browsers,
    type WAMessage,
} from '@whiskeysockets/baileys'

import P from 'pino'
import sharp from 'sharp'
import qrcode from 'qrcode-terminal'

/*
 * Chats en los que alguien escribió !sticker
 * esperando enviar una imagen después.
 *
 * Ejemplo:
 *
 * Usuario: !sticker
 * Usuario: 📷 imagen
 *
 * El bot guarda el chat aquí temporalmente.
 */
const pendingSticker = new Set<string>()

async function startBot() {
    const logger = P({
        level: 'silent',
    })

    const { state, saveCreds } =
        await useMultiFileAuthState('./auth')

    const sock = makeWASocket({
        auth: {
            creds: state.creds,

            keys: makeCacheableSignalKeyStore(
                state.keys,
                logger
            ),
        },

        logger,

        browser: Browsers.ubuntu('Chrome'),

        markOnlineOnConnect: false,

        syncFullHistory: false,
    })

    /*
     * Guardar credenciales
     */
    sock.ev.on('creds.update', saveCreds)

    /*
     * Conexión
     */
    sock.ev.on('connection.update', async (update) => {
        const {
            connection,
            lastDisconnect,
            qr,
        } = update

        if (qr) {
            console.clear()

            console.log(
                '======================================'
            )

            console.log(
                '     ESCANEA ESTE QR EN WHATSAPP'
            )

            console.log(
                '======================================'
            )

            console.log()

            qrcode.generate(qr, {
                small: true,
            })
        }

        if (connection === 'open') {
            console.log()
            console.log(
                '======================================'
            )
            console.log(
                '       🤖 BOT CONECTADO'
            )
            console.log(
                '======================================'
            )
            console.log()
        }

        if (connection === 'close') {
            const statusCode = (
                lastDisconnect?.error as any
            )?.output?.statusCode

            const shouldReconnect =
                statusCode !== DisconnectReason.loggedOut

            console.log(
                'Conexión cerrada.',
                'Reconectar:',
                shouldReconnect
            )

            if (shouldReconnect) {
                startBot()
            } else {
                console.log(
                    'Sesión cerrada.'
                )

                console.log(
                    'Elimina ./auth y vuelve a iniciar.'
                )
            }
        }
    })

    /*
     * Mensajes
     */
    sock.ev.on(
        'messages.upsert',
        async ({ messages, type }) => {

            /*
             * Solo procesamos mensajes nuevos.
             */
            if (type !== 'notify') {
                return
            }

            for (const message of messages) {
                try {
                    await handleMessage(
                        sock,
                        message
                    )
                } catch (error) {
                    console.error(
                        '❌ Error procesando mensaje:',
                        error
                    )
                }
            }
        }
    )
}


/*
 * Procesa cada mensaje.
 */
async function handleMessage(
    sock: ReturnType<typeof makeWASocket>,
    message: WAMessage
) {
    if (!message.message || !message.message.imageMessage) {
        return;
    }

    const jid = message.key.remoteJid

    if (!jid) {
        return
    }

    /*
     * Extraer texto/caption.
     */
    const text =
        getMessageText(message)

    /*
     * Detectar !sticker
     */
    const command =
        text
            ?.trim()
            .toLowerCase()

    /*
    * ==========================================
    * CASO 2
    *
    * Imagen con caption !sticker
    *
    * Ejemplo:
    *
    * 📷 imagen
    * caption: !sticker
    * ==========================================
    */

    const imageMessage =
        getImageMessage(message)

    if (imageMessage) {

        /*
         * Si tiene !sticker como caption,
         * convertir inmediatamente.
         */
        if (command === '!sticker') {

            console.log(
                '🎯 Imagen + !sticker'
            )

            await createStickerFromMessage(
                sock,
                jid,
                message,
                message
            )

            return
        }


        /*
         * ======================================
         * CASO 3
         *
         * El usuario escribió !sticker antes
         * y ahora manda una imagen.
         * ======================================
         */

        if (pendingSticker.has(jid)) {

            pendingSticker.delete(jid)

            console.log(
                '🎯 !sticker previo → imagen recibida'
            )

            await createStickerFromMessage(
                sock,
                jid,
                message,
                message
            )

            return
        }

        /*
         * Si no hay !sticker:
         *
         * NO HACEMOS NADA.
         */
        return
    }

    /*
     * ==========================================
     * CASO 1
     *
     * !sticker como mensaje de texto
     * ==========================================
     */

    if (command === '!sticker') {
        console.log('si')
        /*
         * Primero comprobamos si !sticker
         * es una respuesta a una imagen.
         */
        const quotedImage =
            getQuotedImage(message)

        if (quotedImage) {

            console.log(
                '🎯 !sticker → imagen citada'
            )

            await createStickerFromMessage(
                sock,
                jid,
                quotedImage,
                message
            )

            return
        }

        /*
         * Si no hay imagen citada,
         * esperamos una imagen posterior.
         */
        pendingSticker.add(jid)

        console.log(
            `⏳ Esperando imagen en ${jid}`
        )

        /*
         * Solo respondemos si no es un mensaje
         * enviado por nosotros mismos.
         */
        if (!message.key.fromMe) {
            await sock.sendMessage(
                jid,
                {
                    text:
                        '📷 Envíame la imagen y la convertiré en sticker.'
                },
                {
                    quoted: message,
                }
            )
        }

        return
    }
}


/*
 * ==========================================
 * CREAR STICKER
 * ==========================================
 */
async function createStickerFromMessage(
    sock: ReturnType<typeof makeWASocket>,
    jid: string,
    imageMessage: WAMessage,
    quotedMessage: WAMessage
) {
    try {

        console.log(
            '📥 Descargando imagen...'
        )

        /*
         * Descargar imagen de WhatsApp.
         */
        const inputBuffer =
            await downloadMediaMessage(
                imageMessage,
                'buffer',
                {},
                {
                    logger: P({
                        level: 'silent',
                    }),

                    reuploadRequest:
                        sock.updateMediaMessage,
                }
            )


        console.log(
            `📦 Imagen descargada: ${inputBuffer.length
            } bytes`
        )


        /*
         * ======================================
         * PROCESAMIENTO
         * ======================================
         *
         * 512x512
         * WebP
         * Fondo transparente
         */

        const stickerBuffer =
            await sharp(inputBuffer)
                .rotate()
                .resize(512, 512, {
                    fit: 'contain',

                    background: {
                        r: 0,
                        g: 0,
                        b: 0,
                        alpha: 0,
                    },
                })
                .webp({
                    quality: 90,
                    effort: 4,
                })
                .toBuffer()


        console.log(
            `🎨 Sticker generado: ${stickerBuffer.length
            } bytes`
        )


        /*
         * ======================================
         * ENVIAR STICKER
         * ======================================
         *
         * jid = mismo chat
         *
         * quoted = mensaje original
         */
        await sock.sendMessage(
            jid,
            {
                sticker: stickerBuffer,
            },
            {
                quoted: quotedMessage,
            }
        )


        console.log(
            '✅ Sticker enviado correctamente'
        )

    } catch (error) {

        console.error(
            '❌ Error creando sticker:',
            error
        )


        /*
         * No enviamos mensajes de error si
         * el mensaje fue enviado por nosotros.
         *
         * Esto evita que el bot genere
         * respuestas infinitas consigo mismo.
         */
        if (!quotedMessage.key.fromMe) {

            await sock.sendMessage(
                jid,
                {
                    text:
                        '❌ No pude convertir esa imagen en sticker.'
                },
                {
                    quoted: quotedMessage,
                }
            )
        }
    }
}


/*
 * ==========================================
 * OBTENER TEXTO DEL MENSAJE
 * ==========================================
 */
function getMessageText(
    message: WAMessage
): string | undefined {

    const content =
        message.message

    if (!content) {
        return undefined
    }

    /*
     * Mensaje de texto normal
     */
    if (content.conversation) {
        return content.conversation
    }

    /*
     * Texto extendido
     */
    if (
        content.extendedTextMessage?.text
    ) {
        return (
            content.extendedTextMessage.text
        )
    }

    /*
     * Caption de imagen
     */
    if (
        content.imageMessage?.caption
    ) {
        return (
            content.imageMessage.caption
        )
    }

    return undefined
}


/*
 * ==========================================
 * DETECTAR IMAGEN
 * ==========================================
 */
function getImageMessage(
    message: WAMessage
) {
    console.log(message.message?.imageMessage)
    return (
        message.message?.imageMessage
    )
}


/*
 * ==========================================
 * OBTENER IMAGEN CITADA
 * ==========================================
 */
function getQuotedImage(
    message: WAMessage
): WAMessage | undefined {

    const contextInfo =
        message.message
            ?.extendedTextMessage
            ?.contextInfo

    const quoted =
        contextInfo?.quotedMessage

    if (!quoted?.imageMessage) {
        return undefined
    }

    /*
     * Construimos un WAMessage mínimo
     * con la imagen citada.
     */
    return {
        key: {
            remoteJid:
                message.key.remoteJid,
            fromMe:
                false,
            id:
                contextInfo?.stanzaId,
        },

        message: quoted,
    }
}


/*
 * ==========================================
 * ARRANCAR
 * ==========================================
 */
startBot().catch(
    (error) => {
        console.error(
            '❌ Error iniciando bot:',
            error
        )
    }
)