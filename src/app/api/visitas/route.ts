import { recalcularScoreLead } from "@/lib/services/lead-scoring.service";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createVisitaSchema } from "@/lib/validations/visita";
import { notificarVisitaProgramada } from "@/lib/services/whatsapp.service";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const comercialId = searchParams.get("comercialId");
    const fecha = searchParams.get("fecha");

    const where: Record<string, unknown> = {};

    if (session.user.rol === "COMERCIAL" && session.user.comercialId) {
      where.comercialId = session.user.comercialId;
    } else if (comercialId) {
      where.comercialId = comercialId;
    }

    if (fecha) {
      const start = new Date(fecha);
      start.setHours(0, 0, 0, 0);
      const end = new Date(fecha);
      end.setHours(23, 59, 59, 999);
      where.fecha = { gte: start, lte: end };
    }

    const visitas = await prisma.visita.findMany({
      where,
      include: {
        lead: { select: { nombre: true, apellidos: true, telefono: true } },
        inmueble: { select: { titulo: true, direccion: true, precio: true, referencia: true } },
        comercial: { include: { usuario: { select: { nombre: true } } } },
      },
      orderBy: { fecha: "asc" },
    });

    return NextResponse.json({ data: visitas });
  } catch (error) {
    logger.error({ err: error }, "GET /api/visitas error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createVisitaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const visita = await prisma.visita.create({
      data: {
        ...parsed.data,
        fecha: new Date(parsed.data.fecha),
      },
      include: {
        lead: { select: { nombre: true, apellidos: true, telefono: true } },
        inmueble: { select: { titulo: true, direccion: true } },
      },
    });

    // Audit RGPD
    const reqInfo_POST = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Visita", ip: reqInfo_POST.ip, userAgent: reqInfo_POST.userAgent });

    // Notificar por WhatsApp al lead si tiene telefono
    if (visita.lead.telefono) {
      const fechaStr = new Date(visita.fecha).toLocaleString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      });

      notificarVisitaProgramada(
        visita.lead.telefono,
        visita.lead.nombre + " " + (visita.lead.apellidos ?? ""),
        visita.inmueble.titulo,
        fechaStr
      ).catch((err) => {
        logger.error({ err: err }, "Error enviando WhatsApp de visita");
      });
    }

recalcularScoreLead(visita.leadId ?? parsed.data.leadId).catch(() => {});
return NextResponse.json({ data: visita }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/visitas error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const POST = withRateLimit(_POST);
