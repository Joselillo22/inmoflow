import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

async function _GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") ?? "1");
    const limit = Math.min(Number(searchParams.get("limit") ?? "30"), 100);
    const search = searchParams.get("search") ?? "";
    const canal = searchParams.get("canal") ?? "";

    const where: Record<string, unknown> = {};

    // Comercial solo ve sus interacciones
    if (user.rol === "COMERCIAL" && user.comercialId) {
      where.comercialId = user.comercialId;
    }

    if (canal) {
      where.canal = canal;
    }

    if (search) {
      where.OR = [
        { contenido: { contains: search, mode: "insensitive" } },
        { lead: { nombre: { contains: search, mode: "insensitive" } } },
        { lead: { apellidos: { contains: search, mode: "insensitive" } } },
      ];
    }

    const interacciones = await prisma.interaccion.findMany({
      where,
      include: {
        lead: {
          select: { id: true, nombre: true, apellidos: true, telefono: true, email: true, faseFunnel: true },
        },
        comercial: {
          include: { usuario: { select: { nombre: true, apellidos: true } } },
        },
      },
      orderBy: { fecha: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({ data: interacciones });
  } catch (error) {
    logger.error({ err: error }, "GET /api/inbox error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
