import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { withRateLimit } from "@/lib/rate-limit";

async function _GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const entidad = searchParams.get("entidad");
    const entidadId = searchParams.get("entidadId");
    const userId = searchParams.get("userId");
    const accion = searchParams.get("accion");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);

    const where: Record<string, unknown> = {};
    if (entidad) where.entidad = entidad;
    if (entidadId) where.entidadId = entidadId;
    if (userId) where.userId = userId;
    if (accion) where.accion = accion;
    if (desde || hasta) {
      where.timestamp = {};
      if (desde) (where.timestamp as Record<string, unknown>).gte = new Date(desde);
      if (hasta) (where.timestamp as Record<string, unknown>).lte = new Date(hasta);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({ data: logs, total, page, limit });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
