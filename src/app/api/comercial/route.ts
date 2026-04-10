import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

// GET /api/comercial — Vista "Mi Día"
async function _GET() {
  try {
    const session = await auth();
    if (!session?.user || !session.user.comercialId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const comercialId = session.user.comercialId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [citasHoy, llamadasPendientes, tareasPendientes, cartera, visitasMes, cierresMes] =
      await Promise.all([
        prisma.visita.findMany({
          where: {
            comercialId,
            fecha: { gte: today, lt: tomorrow },
            resultado: "PENDIENTE",
          },
          include: {
            lead: { select: { id: true, nombre: true, apellidos: true, telefono: true } },
            inmueble: { select: { titulo: true, direccion: true, precio: true } },
          },
          orderBy: { fecha: "asc" },
        }),
        prisma.tarea.findMany({
          where: {
            comercialId,
            completada: false,
            tipo: { in: ["LLAMAR", "WHATSAPP"] },
          },
          orderBy: [{ prioridad: "desc" }, { createdAt: "asc" }],
          take: 10,
        }),
        prisma.tarea.findMany({
          where: { comercialId, completada: false },
          orderBy: [{ prioridad: "desc" }, { fechaLimite: "asc" }],
          take: 10,
        }),
        prisma.inmueble.groupBy({
          by: ["estado"],
          where: { comercialId },
          _count: true,
        }),
        prisma.visita.count({
          where: {
            comercialId,
            fecha: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
          },
        }),
        prisma.operacion.count({
          where: {
            comercialId,
            estado: "CERRADA",
            fechaCierre: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
          },
        }),
      ]);

    const carteraResumen = {
      activos: 0,
      reservados: 0,
      enCaptacion: 0,
      visitasMes,
      cierresMes,
    };

    for (const g of cartera) {
      if (g.estado === "ACTIVO") carteraResumen.activos = g._count;
      if (g.estado === "RESERVADO") carteraResumen.reservados = g._count;
      if (g.estado === "EN_CAPTACION") carteraResumen.enCaptacion = g._count;
    }

    return NextResponse.json({
      data: {
        resumen: {
          citasHoy: citasHoy.length,
          llamadasPendientes: llamadasPendientes.length,
          tareasPendientes: tareasPendientes.length,
        },
        proximaCita: citasHoy[0] ?? null,
        citasHoy,
        llamadasPendientes,
        tareasPendientes,
        cartera: carteraResumen,
      },
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/comercial error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
