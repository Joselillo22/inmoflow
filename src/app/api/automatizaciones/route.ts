import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { z } from "zod";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

const createSchema = z.object({
  nombre: z.string().min(1),
  evento: z.enum(["LEAD_NUEVO", "LEAD_SIN_CONTACTAR", "VISITA_REALIZADA", "OPERACION_CREADA", "LEAD_FASE_CAMBIO"]),
  condicion: z.record(z.string(), z.unknown()).optional(),
  accion: z.enum(["CREAR_TAREA", "ENVIAR_WHATSAPP", "CAMBIAR_FASE", "ASIGNAR_COMERCIAL", "ESCALAR_ADMIN"]),
  parametros: z.record(z.string(), z.unknown()).optional(),
  activa: z.boolean().optional(),
});

async function _GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const automatizaciones = await prisma.automatizacion.findMany({
      include: { _count: { select: { logs: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: automatizaciones });
  } catch (error) {
    logger.error({ err: error }, "GET /api/automatizaciones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const auto = await prisma.automatizacion.create({ data: parsed.data as unknown as Parameters<typeof prisma.automatizacion.create>[0]["data"] });

    // Audit RGPD
    const reqInfo_POST = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Automatizacion", ip: reqInfo_POST.ip, userAgent: reqInfo_POST.userAgent });
return NextResponse.json({ data: auto }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/automatizaciones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id, ...body } = await req.json();
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const auto = await prisma.automatizacion.update({
      where: { id },
      data: body,
    });

    // Audit RGPD
    const reqInfo_PATCH = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "Automatizacion", ip: reqInfo_PATCH.ip, userAgent: reqInfo_PATCH.userAgent });
return NextResponse.json({ data: auto });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/automatizaciones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    await prisma.automatizacionLog.deleteMany({ where: { automatizacionId: id } });

    // Audit RGPD
    const reqInfo_DELETE = extractRequestInfo(req.headers);
    await audit({ accion: "ELIMINAR", entidad: "Automatizacion", ip: reqInfo_DELETE.ip, userAgent: reqInfo_DELETE.userAgent });
    await prisma.automatizacion.delete({ where: { id } });
return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "DELETE /api/automatizaciones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const POST = withRateLimit(_POST);

export const PATCH = withRateLimit(_PATCH);

export const DELETE = withRateLimit(_DELETE);
