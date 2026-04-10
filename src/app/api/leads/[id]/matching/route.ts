import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { calcularMatching } from "@/lib/services/matching.service";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;

    const demandas = await prisma.demanda.findMany({
      where: { leadId: id },
      select: { id: true },
    });

    const matchings = await prisma.matching.findMany({
      where: {
        demandaId: { in: demandas.map((d) => d.id) },
        descartado: false,
      },
      include: {
        inmueble: {
          select: {
            id: true, titulo: true, referencia: true, precio: true,
            localidad: true, tipo: true, operacion: true,
            habitaciones: true, metrosConstruidos: true,
          },
        },
      },
      orderBy: { score: "desc" },
      take: 20,
    });

    return NextResponse.json({ data: matchings });
  } catch (error) {
    logger.error({ err: error }, "GET /api/leads/[id]/matching error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { demandaId } = await req.json();
    const results = await calcularMatching(demandaId);

    return NextResponse.json({ data: results, total: results.length });
  } catch (error) {
    logger.error({ err: error }, "POST /api/leads/[id]/matching error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _PATCH(
  req: NextRequest,
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { matchingId, visto, descartado } = await req.json();

    const data: Record<string, unknown> = {};
    if (visto !== undefined) data.visto = visto;
    if (descartado !== undefined) data.descartado = descartado;

    const matching = await prisma.matching.update({
      where: { id: matchingId },
      data,
    });

    return NextResponse.json({ data: matching });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/leads/[id]/matching error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const POST = withRateLimit(_POST);

export const PATCH = withRateLimit(_PATCH);
