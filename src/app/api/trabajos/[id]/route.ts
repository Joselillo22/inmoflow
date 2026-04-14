import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateTrabajoSchema } from "@/lib/validations/proveedor";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

async function _GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const trabajo = await prisma.trabajo.findUnique({
      where: { id },
      include: {
        inmueble: { select: { id: true, titulo: true, referencia: true, direccion: true } },
        solicitudes: {
          include: {
            proveedor: { select: { id: true, nombre: true, contacto: true, telefono: true, email: true, valoracionMedia: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        adjuntos: { orderBy: { createdAt: "desc" } },
        _count: { select: { solicitudes: true, adjuntos: true } },
      },
    });

    if (!trabajo) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ data: trabajo });
  } catch (error) {
    logger.error({ err: error }, "GET /api/trabajos/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!["ADMIN", "COORDINADORA"].includes(session.user.rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateTrabajoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.fechaLimite) data.fechaLimite = new Date(parsed.data.fechaLimite);

    const trabajo = await prisma.trabajo.update({ where: { id }, data });
    return NextResponse.json({ data: trabajo });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/trabajos/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
export const PATCH = withRateLimit(_PATCH);
