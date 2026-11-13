export default async function handler(req, res) {
  // 1. Verificación del Webhook con Meta (GET)
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, `https://${req.headers?.host || 'localhost'}`);
      const mode = req.query?.['hub.mode'] || req.query?.hub?.mode || url.searchParams.get('hub.mode');
      const token = req.query?.['hub.verify_token'] || req.query?.hub?.verify_token || url.searchParams.get('hub.verify_token');
      const challenge = req.query?.['hub.challenge'] || req.query?.hub?.challenge || url.searchParams.get('hub.challenge');

      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

      if (mode === 'subscribe' && token === verifyToken) {
        console.log('WhatsApp Webhook verificado correctamente por Meta.');
        res.setHeader('Content-Type', 'text/plain');
        if (typeof res.status === 'function') {
          return res.status(200).send(challenge);
        } else {
          res.statusCode = 200;
          return res.end(challenge);
        }
      }

      console.warn('Verificación de WhatsApp Webhook fallida:', { mode, tokenMatch: token === verifyToken });
      if (typeof res.status === 'function') {
        return res.status(403).send('Forbidden');
      } else {
        res.statusCode = 403;
        return res.end('Forbidden');
      }
    } catch (err) {
      console.error('Error en verificación GET del Webhook:', err);
      if (typeof res.status === 'function') {
        return res.status(500).send('Error');
      } else {
        res.statusCode = 500;
        return res.end('Error');
      }
    }
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
          // Import dinámico para que el GET de verificación sea ultra-rápido y no dependa de Firebase
          const { handleIncomingMessage } = await import('../_lib/whatsappFlow.js');
          await handleIncomingMessage(from, message);
        }
      }

      // Meta requiere respuesta 200 rápida para no reenviar eventos
      if (typeof res.status === 'function') {
        return res.status(200).json({ status: 'EVENT_RECEIVED' });
      } else {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ status: 'EVENT_RECEIVED' }));
      }
    } catch (error) {
      console.error('Error procesando evento entrante de WhatsApp:', error);
      if (typeof res.status === 'function') {
        return res.status(200).json({ status: 'EVENT_PROCESSED_WITH_ERROR', error: error.message, stack: error.stack });
      } else {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ status: 'EVENT_PROCESSED_WITH_ERROR', error: error.message, stack: error.stack }));
      }
    }
  }

  if (typeof res.status === 'function') {
    return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } });
  } else {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method Not Allowed' } }));
  }
}
