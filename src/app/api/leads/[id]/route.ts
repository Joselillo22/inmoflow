import { recalcularScoreLead } from "@/lib/services/lead-scoring.service";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateLeadSchema } from "@/lib/validations/lead";
import { getSessionUser, canAccessResource } from "@/lib/utils/auth-check";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        comercial: { include: { usuario: { select: { nombre: true, apellidos: true } } } },
        demandas: {
          include: { _count: { select: { matchings: true } } },
        },
        visitas: {
          include: {
            inmueble: { select: { titulo: true, referencia: true, direccion: true, precio: true } },
          },
          orderBy: { fecha: "desc" },
        },
        interacciones: { orderBy: { fecha: "desc" }, take: 50 },
        _count: { select: { visitas: true, interacciones: true, operaciones: true, demandas: true } },
      },
    });

    if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    if (!canAccessResource(user, lead.comercialId)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

recalcularScoreLead(id).catch(() => {});
    return NextResponse.json({ data: lead });
  } catch (error) {
    logger.error({ err: error }, "GET /api/leads/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.lead.findUnique({ where: { id }, select: { comercialId: true, faseFunnel: true } });

    // Audit RGPD
    const reqInfo_PATCH = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "Lead", ip: reqInfo_PATCH.ip, userAgent: reqInfo_PATCH.userAgent });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (!canAccessResource(user, existing.comercialId)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const lead = await prisma.lead.update({ where: { id }, data: parsed.data });

    // Log phase change as SISTEMA interaction
    if (parsed.data.faseFunnel && parsed.data.faseFunnel !== existing.faseFunnel && user.comercialId) {
      await prisma.interaccion.create({
        data: {
          leadId: id,
          comercialId: user.comercialId,
          canal: "SISTEMA",
          contenido: `Fase cambiada: ${existing.faseFunnel} → ${parsed.data.faseFunnel}`,
        },
      });
    }

recalcularScoreLead(id).catch(() => {});
return NextResponse.json({ data: lead });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/leads/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const PATCH = withRateLimit(_PATCH);
