const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Formatea el número de teléfono destinatario en formato internacional para Meta.
 * Para Colombia (10 dígitos locales): antepone '57'.
 */
function formatRecipient(to) {
  const digits = String(to || '').replace(/\D/g, '');
  if (/^\d{10}$/.test(digits)) {
    return `57${digits}`;
  }
  return digits;
}

/**
 * Obtiene las credenciales de Meta y auto-corrige si fueron asignadas de forma invertida
 * (por ejemplo, si el Phone Number ID fue puesto en el Access Token y viceversa).
 */
function getMetaCredentials() {
  let token = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '';
  let phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || '';

  const tokenIsNumeric = /^\d+$/.test(token);
  const phoneIdIsToken = phoneNumberId.startsWith('EAA') || phoneNumberId.length > 50;

  if (tokenIsNumeric && phoneIdIsToken) {
    console.warn('⚠️ Auto-corrección de credenciales: WHATSAPP_ACCESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID estaban invertidas en process.env.');
    const temp = token;
    token = phoneNumberId;
    phoneNumberId = temp;
  }

  return { token, phoneNumberId };
}

/**
 * Envía una petición POST al endpoint de mensajes de WhatsApp Cloud API.
 */
async function sendWhatsAppRequest(payload) {
  const { token, phoneNumberId } = getMetaCredentials();

  if (!token || !phoneNumberId) {
    console.error('Credenciales de WhatsApp Cloud API no configuradas (WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID).');
    return { success: false, error: 'MISSING_CREDENTIALS' };
  }

  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      console.error('Meta WhatsApp Cloud API error:', JSON.stringify(data));
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error de red enviando mensaje de WhatsApp:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Envía un mensaje de texto simple.
 */
export async function sendTextMessage(to, text) {
  const recipient = formatRecipient(to);
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'text',
    text: {
      preview_url: false,
      body: String(text || '')
    }
  };

  return await sendWhatsAppRequest(payload);
}

/**
 * Envía botones interactivos (hasta 3 botones).
 * Trunca el texto del botón a máximo 20 caracteres según las reglas de Meta.
 */
export async function sendInteractiveButtons(to, bodyText, buttons = []) {
  const recipient = formatRecipient(to);
  const safeButtons = buttons.slice(0, 3).map((b) => ({
    type: 'reply',
    reply: {
      id: String(b.id).slice(0, 256),
      title: String(b.title).slice(0, 20)
    }
  }));

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: String(bodyText || '').slice(0, 1024)
      },
      action: {
        buttons: safeButtons
      }
    }
  };

  return await sendWhatsAppRequest(payload);
}

/**
 * Envía una lista interactiva desplegable.
 * Trunca buttonLabel a máx 20 chars, títulos de fila a máx 24 chars, y limita
 * el total a un máximo de 10 filas según las restricciones de Meta.
 */
export async function sendInteractiveList(to, bodyText, buttonLabel, sections = []) {
  const recipient = formatRecipient(to);
  let totalRows = 0;
  const sanitizedSections = [];

  for (const section of sections) {
    if (totalRows >= 10) break;
    const remainingAllowed = 10 - totalRows;
    const rawRows = section.rows || [];
    const sectionRows = rawRows.slice(0, remainingAllowed).map((r) => {
      const rowObj = {
        id: String(r.id).slice(0, 200),
        title: String(r.title).slice(0, 24)
      };
      if (r.description) {
        rowObj.description = String(r.description).slice(0, 72);
      }
      return rowObj;
    });

    if (sectionRows.length > 0) {
      totalRows += sectionRows.length;
      const secObj = { rows: sectionRows };
      if (section.title) {
        secObj.title = String(section.title).slice(0, 24);
      }
      sanitizedSections.push(secObj);
    }
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipient,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: {
        text: String(bodyText || '').slice(0, 1024)
      },
      action: {
        button: String(buttonLabel || 'Ver Opciones').slice(0, 20),
        sections: sanitizedSections
      }
    }
  };

  return await sendWhatsAppRequest(payload);
}
