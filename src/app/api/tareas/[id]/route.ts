import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateTareaSchema } from "@/lib/validations/tarea";
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

    const existing = await prisma.tarea.findUnique({ where: { id }, select: { comercialId: true } });

    // Audit RGPD
    const reqInfo_PATCH = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "Tarea", ip: reqInfo_PATCH.ip, userAgent: reqInfo_PATCH.userAgent });
    if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    if (!canAccessResource(user, existing.comercialId)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateTareaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.completada === true) {
      data.completadaAt = new Date();
    }

    const tarea = await prisma.tarea.update({ where: { id }, data });
return NextResponse.json({ data: tarea });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/tareas/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const PATCH = withRateLimit(_PATCH);
