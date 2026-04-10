import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSessionUser } from "@/lib/utils/auth-check";
import { getResumenComisiones } from "@/lib/services/comision.service";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

const updateComisionSchema = z.object({
  id: z.string().min(1),
  estadoPago: z.enum(["PENDIENTE", "PAGADO", "PARCIAL"]),
});

async function _GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    if (user.rol === "ADMIN") {
      const resumen = await getResumenComisiones();
      return NextResponse.json({ data: resumen });
    }

    if (!user.comercialId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const comisiones = await prisma.comision.findMany({
      where: { comercialId: user.comercialId },
      include: {
        operacion: {
          include: {
            inmueble: { select: { titulo: true, referencia: true } },
            lead: { select: { nombre: true, apellidos: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: comisiones });
  } catch (error) {
    logger.error({ err: error }, "GET /api/comisiones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateComisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const comision = await prisma.comision.update({
      where: { id: parsed.data.id },
      data: {
        estadoPago: parsed.data.estadoPago,
        fechaPago: parsed.data.estadoPago === "PAGADO" ? new Date() : null,
      },
    });

    return NextResponse.json({ data: comision });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/comisiones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const PATCH = withRateLimit(_PATCH);
