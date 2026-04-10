import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

async function _GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userId = (session.user as unknown as { id: string }).id;
    const { searchParams } = new URL(req.url);
    const soloNoLeidas = searchParams.get("noLeidas") === "true";
    const limit = Math.min(Number(searchParams.get("limit") ?? "30"), 100);

    const where: Record<string, unknown> = { usuarioId: userId };
    if (soloNoLeidas) where.leida = false;

    const [notificaciones, countNoLeidas] = await Promise.all([
      prisma.notificacion.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notificacion.count({
        where: { usuarioId: userId, leida: false },
      }),
    ]);

    return NextResponse.json({ data: notificaciones, noLeidas: countNoLeidas });
  } catch (error) {
    logger.error({ err: error }, "GET /api/notificaciones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH — Marcar como leida (una o todas)
async function _PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userId = (session.user as unknown as { id: string }).id;
    const body = await req.json();

    if (body.marcarTodas) {
      // Marcar todas como leidas
      await prisma.notificacion.updateMany({
        where: { usuarioId: userId, leida: false },
        data: { leida: true, leidaAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    if (body.id) {
      // Marcar una como leida
      const notif = await prisma.notificacion.findUnique({ where: { id: body.id } });
      if (!notif || notif.usuarioId !== userId) {
        return NextResponse.json({ error: "No encontrada" }, { status: 404 });
      }
      await prisma.notificacion.update({
        where: { id: body.id },
        data: { leida: true, leidaAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Proporciona id o marcarTodas" }, { status: 400 });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/notificaciones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const PATCH = withRateLimit(_PATCH);
