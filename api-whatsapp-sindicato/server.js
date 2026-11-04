const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const app = express();

// Permite que tu frontend de Next.js (puerto 3000) se comunique con este servidor (puerto 3001)
app.use(cors());
app.use(express.json());

// Inicializa el cliente de WhatsApp simulando una sesión web
// LocalAuth permite guardar la sesión para que no tengas que escanear el QR cada vez que reinicias
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    }
});

// Cuando requiera inicio de sesión, mostrará el QR en la terminal
client.on('qr', (qr) => {
    console.log('\n=========================================');
    console.log('📲 ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP');
    console.log('=========================================\n');
    qrcode.generate(qr, { small: true });
});

// Confirmación de conexión exitosa
client.on('ready', () => {
    console.log('\n✅ ¡Cliente de WhatsApp conectado y listo para enviar mensajes!\n');
});

client.initialize();

// Endpoint que recibirá la petición HTTP desde tu Panel de Administración
app.post('/api/enviar', async (req, res) => {
    try {
        const { telefono, mensaje } = req.body;

        if (!telefono || !mensaje) {
            return res.status(400).json({ error: 'Faltan parámetros: telefono o mensaje' });
        }

        // Limpiar el número y asegurar el código de país (Chile = 56)
        let telClean = telefono.replace(/[^0-9]/g, '');
        if (!telClean.startsWith('56')) telClean = `56${telClean}`;

        // whatsapp-web.js requiere que el ID del chat termine en @c.us
        const chatId = `${telClean}@c.us`;

        // Envío silencioso del mensaje
        await client.sendMessage(chatId, mensaje);
        
        console.log(`Mensaje enviado exitosamente a: ${telClean}`);
        res.json({ success: true, message: 'Mensaje enviado a la red de WhatsApp' });

    } catch (error) {
        console.error('Error enviando mensaje:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de WhatsApp Gateway corriendo en http://localhost:${PORT}`);
});