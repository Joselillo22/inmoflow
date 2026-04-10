const WHATSAPP_API_URL = "https://graph.facebook.com/v18.0";
import logger from "@/lib/logger";

interface WhatsAppMessage {
  to: string; // número con código país: 34666111222
  type: "text" | "template";
  text?: string;
  templateName?: string;
  templateParams?: string[];
}

export async function enviarMensajeWhatsApp(message: WhatsAppMessage) {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    logger.warn("WhatsApp API no configurada");
    return { success: false, error: "WhatsApp no configurado" };
  }

  const body: Record<string, unknown> = {
    messaging_product: "whatsapp",
    to: message.to,
  };

  if (message.type === "text" && message.text) {
    body.type = "text";
    body.text = { body: message.text };
  } else if (message.type === "template" && message.templateName) {
    body.type = "template";
    body.template = {
      name: message.templateName,
      language: { code: "es" },
      components: message.templateParams
        ? [
            {
              type: "body",
              parameters: message.templateParams.map((p) => ({
                type: "text",
                text: p,
              })),
            },
          ]
        : undefined,
    };
  }

  const res = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.json();
    logger.error({ err: error }, "WhatsApp API error");
    return { success: false, error: error.error?.message ?? "Error desconocido" };
  }

  const data = await res.json();
  return { success: true, messageId: data.messages?.[0]?.id };
}

// Enviar notificación de nueva visita programada
export async function notificarVisitaProgramada(
  telefono: string,
  nombreLead: string,
  inmuebleTitulo: string,
  fecha: string
) {
  return enviarMensajeWhatsApp({
    to: `34${telefono.replace(/\D/g, "")}`,
    type: "template",
    templateName: "visita_programada",
    templateParams: [nombreLead, inmuebleTitulo, fecha],
  });
}

// Enviar recordatorio de visita
export async function recordatorioVisita(
  telefono: string,
  hora: string,
  direccion: string
) {
  return enviarMensajeWhatsApp({
    to: `34${telefono.replace(/\D/g, "")}`,
    type: "text",
    text: `Recuerda tu visita hoy a las ${hora} en ${direccion}. ¡Te esperamos!`,
  });
}
