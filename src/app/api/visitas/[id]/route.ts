import { ejecutarAutomatizaciones } from "@/lib/services/automation-engine.service";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateVisitaSchema } from "@/lib/validations/visita";
import { getSessionUser, canAccessResource } from "@/lib/utils/auth-check";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;

    const existing = await prisma.visita.findUnique({ where: { id }, select: { comercialId: true } });

    // Audit RGPD
    const reqInfo_PATCH = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "Visita", ip: reqInfo_PATCH.ip, userAgent: reqInfo_PATCH.userAgent });
    if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    if (!canAccessResource(user, existing.comercialId)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateVisitaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const visita = await prisma.visita.update({ where: { id }, data: parsed.data });
// Trigger automatizacion si resultado es realizada    if (parsed.data.resultado?.startsWith("REALIZADA")) {      ejecutarAutomatizaciones({ evento: "VISITA_REALIZADA", entidadTipo: "visita", entidadId: id, datos: { resultado: parsed.data.resultado } }).catch(() => {});    }
return NextResponse.json({ data: visita });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/visitas/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const PATCH = withRateLimit(_PATCH);
