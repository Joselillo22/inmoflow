import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { updateProveedorSchema } from "@/lib/validations/proveedor";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

async function _GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const proveedor = await prisma.proveedor.findUnique({
      where: { id },
      include: {
        solicitudes: {
          include: {
            trabajo: { select: { referencia: true, titulo: true, categoria: true, estado: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { solicitudes: true } },
      },
    });

    if (!proveedor) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json({ data: proveedor });
  } catch (error) {
    logger.error({ err: error }, "GET /api/proveedores/[id] error");
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
    const parsed = updateProveedorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const proveedor = await prisma.proveedor.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ data: proveedor });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/proveedores/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
export const PATCH = withRateLimit(_PATCH);
