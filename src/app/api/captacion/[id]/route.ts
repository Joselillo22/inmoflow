import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateCaptacionSchema } from "@/lib/validations/captacion";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;

    const oportunidad = await prisma.captacionOportunidad.findUnique({
      where: { id },
      include: {
        comercial: { include: { usuario: { select: { nombre: true, apellidos: true, email: true } } } },
      },
    });
    if (!oportunidad) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    // Comercial sólo ve las suyas
    const rol = (session.user as unknown as { rol: string }).rol;
    const comId = (session.user as unknown as { comercialId: string | null }).comercialId;
    if (rol === "COMERCIAL" && oportunidad.comercialId !== comId) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    return NextResponse.json({ data: oportunidad });
  } catch (error) {
    logger.error({ err: error }, "GET /api/captacion/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { id } = await params;

    const existing = await prisma.captacionOportunidad.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    const rol = (session.user as unknown as { rol: string }).rol;
    const comId = (session.user as unknown as { comercialId: string | null }).comercialId;
    if (rol === "COMERCIAL" && existing.comercialId !== comId) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateCaptacionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = { ...parsed.data };

    // Auto-rellenar fechas cuando cambia el estado
    if (parsed.data.estado && parsed.data.estado !== existing.estado) {
      const now = new Date();
      if (parsed.data.estado === "CONTACTADA" && !existing.fechaPrimerContacto) {
        data.fechaPrimerContacto = now;
      }
      if (parsed.data.estado === "VISITADA" && !existing.fechaVisita) {
        data.fechaVisita = now;
      }
      if (parsed.data.estado === "VALORACION_PRESENTADA" && !existing.fechaValoracion) {
        data.fechaValoracion = now;
      }
      if (parsed.data.estado === "PROPUESTA_MANDATO" && !existing.fechaPropuesta) {
        data.fechaPropuesta = now;
      }
      if (parsed.data.estado === "MANDATO_FIRMADO" && !existing.fechaMandato) {
        data.fechaMandato = now;
      }
    }

    const updated = await prisma.captacionOportunidad.update({
      where: { id },
      data: data as Parameters<typeof prisma.captacionOportunidad.update>[0]["data"],
    });

    const reqInfo = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "CaptacionOportunidad", ip: reqInfo.ip, userAgent: reqInfo.userAgent });

    return NextResponse.json({ data: updated });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/captacion/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
export const PATCH = withRateLimit(_PATCH);
