import { handleIncomingMessage } from '../_lib/whatsappFlow.js';

export default async function handler(req, res) {
  // 1. Verificación del Webhook con Meta (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('WhatsApp Webhook verificado correctamente por Meta.');
      return res.status(200).send(challenge);
    }

    console.warn('Verificación de WhatsApp Webhook fallida (token inválido o modo incorrecto).');
    return res.status(403).send('Forbidden');
  }

  // 2. Procesamiento de Mensajes Entrantes (POST)
  if (req.method === 'POST') {
    try {
      const entry = req.body?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const message = messages[0];
        const from = message.from;

        if (from) {
          // Procesar el mensaje con la máquina de estados
          await handleIncomingMessage(from, message);
        }
      }

      // Meta requiere respuesta 200 rápida para no reenviar eventos
      return res.status(200).json({ status: 'EVENT_RECEIVED' });
    } catch (error) {
      console.error('Error procesando evento entrante de WhatsApp:', error);
      // Responder 200 a Meta para evitar bucles de reintentos
      return res.status(200).json({ status: 'EVENT_PROCESSED_WITH_ERROR' });
    }
  }

  return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } });
}
