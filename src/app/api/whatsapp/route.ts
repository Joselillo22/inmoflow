import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { enviarMensajeWhatsApp } from "@/lib/services/whatsapp.service";
import { z } from "zod";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

const sendMessageSchema = z.object({
  leadId: z.string().min(1, "leadId es requerido"),
  mensaje: z.string().min(1, "El mensaje no puede estar vacío").max(4096),
});

// POST — Enviar mensaje WA y registrar interacción
async function _POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { leadId, mensaje } = parsed.data;

    // #19: Verificar que el lead pertenece al comercial
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { comercialId: true, telefono: true, nombre: true },
    });

    if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    if (!lead.telefono) return NextResponse.json({ error: "El lead no tiene teléfono" }, { status: 400 });

    if (user.rol === "COMERCIAL" && lead.comercialId !== user.comercialId) {
      return NextResponse.json({ error: "No tienes permiso sobre este lead" }, { status: 403 });
    }

    const result = await enviarMensajeWhatsApp({
      to: `34${lead.telefono.replace(/\D/g, "")}`,
      type: "text",
      text: mensaje,
    });

    // Registrar interacción
    if (user.comercialId) {
      await prisma.interaccion.create({
        data: {
          leadId,
          comercialId: user.comercialId,
          canal: "WHATSAPP",
          contenido: mensaje,
        },
      });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    logger.error({ err: error }, "POST /api/whatsapp error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// GET — Webhook verification para WhatsApp Business API
async function _GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // #7: Sin fallback hardcodeado
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export const GET = withRateLimit(_GET);

export const POST = withRateLimit(_POST);
