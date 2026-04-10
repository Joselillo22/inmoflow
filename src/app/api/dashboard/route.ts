import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

export const dynamic = "force-dynamic";

async function _GET() {
  try {
    const now = new Date();
    const mesActual = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalInmuebles, totalLeads, totalComerciales, totalOperaciones,
      inmueblesPorEstado, leadsPorFuente,
      operacionesCerradasMes, visitasMes, leadsSinAsignar,
      rendimientoComerciales,
    ] = await Promise.all([
      prisma.inmueble.count(),
      prisma.lead.count(),
      prisma.comercial.count({ where: { activo: true } }),
      prisma.operacion.count(),
      prisma.inmueble.groupBy({ by: ["estado"], _count: true }),
      prisma.lead.groupBy({ by: ["fuente"], _count: true, orderBy: { _count: { fuente: "desc" } }, take: 5 }),
      prisma.operacion.findMany({
        where: { estado: "CERRADA", fechaCierre: { gte: mesActual } },
        include: { comision: true },
      }),
      prisma.visita.count({ where: { fecha: { gte: mesActual } } }),
      prisma.lead.count({ where: { comercialId: null, faseFunnel: "NUEVO" } }),
      prisma.comercial.findMany({
        where: { activo: true },
        include: {
          usuario: { select: { nombre: true, apellidos: true } },
          _count: {
            select: {
              leads: { where: { faseFunnel: { notIn: ["PERDIDO", "CIERRE"] } } },
              visitas: { where: { fecha: { gte: mesActual } } },
              operaciones: { where: { estado: "CERRADA", fechaCierre: { gte: mesActual } } },
            },
          },
        },
      }),
    ]);

    const facturacionMes = operacionesCerradasMes.reduce(
      (sum, op) => sum + (op.comision ? Number(op.comision.total) : 0), 0
    );

    return NextResponse.json({
      data: {
        totalInmuebles, totalLeads, totalComerciales, totalOperaciones,
        inmueblesPorEstado, leadsPorFuente,
        facturacionMes, visitasMes, leadsSinAsignar, rendimientoComerciales,
        operacionesCerradasMes: operacionesCerradasMes.length,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/dashboard error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
