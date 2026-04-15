import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

async function _GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rol = (session.user as unknown as { rol: string }).rol;
    if (!["ADMIN", "COORDINADORA"].includes(rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [byEstado, byPortal, byOperacion, byLocalidad, nuevasSemana, contactadasSemana] = await Promise.all([
      prisma.captacionOportunidad.groupBy({ by: ["estado"], _count: true }),
      prisma.captacionOportunidad.groupBy({ by: ["portal"], _count: true }),
      prisma.captacionOportunidad.groupBy({ by: ["operacion"], _count: true }),
      prisma.captacionOportunidad.groupBy({
        by: ["localidad"], _count: true,
        where: { localidad: { not: null } },
        orderBy: { _count: { localidad: "desc" } },
        take: 10,
      }),
      prisma.captacionOportunidad.count({ where: { fechaDeteccion: { gte: weekAgo } } }),
      prisma.captacionOportunidad.count({
        where: { fechaPrimerContacto: { gte: weekAgo } },
      }),
    ]);

    const estadoCount: Record<string, number> = {};
    byEstado.forEach((r) => { estadoCount[r.estado] = r._count; });

    const portalCount: Record<string, number> = {};
    byPortal.forEach((r) => { portalCount[r.portal] = r._count; });

    const operacionCount: Record<string, number> = {};
    byOperacion.forEach((r) => { operacionCount[r.operacion] = r._count; });

    const total = Object.values(estadoCount).reduce((a, b) => a + b, 0);
    const contactadas = (estadoCount.CONTACTADA ?? 0) + (estadoCount.VISITA_PROGRAMADA ?? 0) +
      (estadoCount.VISITADA ?? 0) + (estadoCount.VALORACION_PRESENTADA ?? 0) +
      (estadoCount.PROPUESTA_MANDATO ?? 0) + (estadoCount.MANDATO_FIRMADO ?? 0);
    const visitadas = (estadoCount.VISITADA ?? 0) + (estadoCount.VALORACION_PRESENTADA ?? 0) +
      (estadoCount.PROPUESTA_MANDATO ?? 0) + (estadoCount.MANDATO_FIRMADO ?? 0);
    const mandatos = estadoCount.MANDATO_FIRMADO ?? 0;
    const nuevas = estadoCount.NUEVA ?? 0;

    return NextResponse.json({
      resumen: {
        nuevas,
        contactadas: estadoCount.CONTACTADA ?? 0,
        visitaProgramada: estadoCount.VISITA_PROGRAMADA ?? 0,
        visitadas: estadoCount.VISITADA ?? 0,
        valoracionPresentada: estadoCount.VALORACION_PRESENTADA ?? 0,
        propuestaMandato: estadoCount.PROPUESTA_MANDATO ?? 0,
        mandatoFirmado: mandatos,
        descartadas: estadoCount.DESCARTADA ?? 0,
      },
      porPortal: portalCount,
      porOperacion: operacionCount,
      porLocalidad: byLocalidad.map((r) => ({ localidad: r.localidad, count: r._count })),
      tasaConversion: {
        nuevaAContactada: total > 0 ? Math.round((contactadas / total) * 1000) / 10 : 0,
        contactadaAVisita: contactadas > 0 ? Math.round((visitadas / contactadas) * 1000) / 10 : 0,
        visitaAMandato: visitadas > 0 ? Math.round((mandatos / visitadas) * 1000) / 10 : 0,
        globalNuevaAMandato: total > 0 ? Math.round((mandatos / total) * 1000) / 10 : 0,
      },
      estaSemana: {
        nuevasDetectadas: nuevasSemana,
        contactadas: contactadasSemana,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/captacion/stats error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
