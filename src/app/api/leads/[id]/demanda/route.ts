import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, canAccessResource } from "@/lib/utils/auth-check";
import { createDemandaSchema, updateDemandaSchema } from "@/lib/validations/demanda";
import { calcularMatching } from "@/lib/services/matching.service";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const lead = await prisma.lead.findUnique({ where: { id }, select: { comercialId: true } });

    // Audit RGPD
    const reqInfo_POST = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Lead", ip: reqInfo_POST.ip, userAgent: reqInfo_POST.userAgent });
    if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    if (!canAccessResource(user, lead.comercialId)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createDemandaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { extras, ...rest } = parsed.data;
    const demanda = await prisma.demanda.create({
      data: {
        leadId: id,
        ...rest,
        extras: extras ? JSON.parse(JSON.stringify(extras)) : undefined,
      },
    });

    // Auto-trigger matching
    const matchings = await calcularMatching(demanda.id);
return NextResponse.json({ data: demanda, matchings: matchings.length }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/leads/[id]/demanda error");
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
    const body = await req.json();
    const { demandaId, ...updateData } = body;

    const parsed = updateDemandaSchema.safeParse(updateData);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
    }

    const { extras: pExtras, ...pRest } = parsed.data;
    const demanda = await prisma.demanda.update({
      where: { id: demandaId },
      data: {
        ...pRest,
        extras: pExtras ? JSON.parse(JSON.stringify(pExtras)) : undefined,
      },
    });

    // Audit RGPD
    const reqInfo_PATCH = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "Lead", ip: reqInfo_PATCH.ip, userAgent: reqInfo_PATCH.userAgent });

    return NextResponse.json({ data: demanda });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/leads/[id]/demanda error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);

export const PATCH = withRateLimit(_PATCH);
