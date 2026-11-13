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
      // Validación opcional de firma x-hub-signature-256 si WHATSAPP_APP_SECRET está configurada
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      if (appSecret) {
        const signature = req.headers?.['x-hub-signature-256'];
        if (!signature) {
          console.warn('Webhook POST rechazado: falta header x-hub-signature-256');
          if (typeof res.status === 'function') {
            return res.status(401).send('Firma requerida');
          } else {
            res.statusCode = 401;
            return res.end('Firma requerida');
          }
        }

        const { createHmac, timingSafeEqual } = await import('crypto');
        const rawPayload = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        const expectedSig = 'sha256=' + createHmac('sha256', appSecret).update(rawPayload).digest('hex');

        let isMatch = false;
        try {
          isMatch = timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
        } catch (_) {
          isMatch = false;
        }

        if (!isMatch) {
          console.warn('Webhook POST rechazado: x-hub-signature-256 no coincide');
          if (typeof res.status === 'function') {
            return res.status(403).send('Firma no coincide');
          } else {
            res.statusCode = 403;
            return res.end('Firma no coincide');
          }
        }
      }

      const entry = req.body?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;

      // Verificación de número de teléfono de destino (phone_number_id)
      const configuredPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      const incomingPhoneId = value?.metadata?.phone_number_id;
      if (configuredPhoneId && incomingPhoneId && incomingPhoneId !== configuredPhoneId) {
        console.warn('Mensaje recibido para phone_number_id ajeno, ignorando:', incomingPhoneId);
        if (typeof res.status === 'function') {
          return res.status(200).json({ status: 'IGNORED_PHONE_MISMATCH' });
        } else {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ status: 'IGNORED_PHONE_MISMATCH' }));
        }
      }

      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const message = messages[0];
        const from = message.from;

        if (from) {
          // Import dinámico para aislar la carga y mantener el webhook rápido
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
        return res.status(200).json({ status: 'EVENT_PROCESSED_WITH_ERROR' });
      } else {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ status: 'EVENT_PROCESSED_WITH_ERROR' }));
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
