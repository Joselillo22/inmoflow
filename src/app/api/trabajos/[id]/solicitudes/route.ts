import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { enviarSolicitudesSchema, registrarPresupuestoSchema, valorarSchema } from "@/lib/validations/proveedor";
import { enviarSolicitudes, recalcularValoracion } from "@/lib/services/proveedor.service";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

// GET /api/trabajos/[id]/solicitudes — lista
async function _GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const solicitudes = await prisma.solicitudPresupuesto.findMany({
      where: { trabajoId: id },
      include: {
        proveedor: { select: { id: true, nombre: true, telefono: true, email: true, valoracionMedia: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ data: solicitudes });
  } catch (error) {
    logger.error({ err: error }, "GET /api/trabajos/[id]/solicitudes error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST /api/trabajos/[id]/solicitudes — crear en bulk + enviar
async function _POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!["ADMIN", "COORDINADORA"].includes(session.user.rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = enviarSolicitudesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    // Verificar trabajo existe
    const trabajo = await prisma.trabajo.findUnique({ where: { id }, select: { id: true } });
    if (!trabajo) return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });

    // Crear solicitudes (skip si ya existe para ese proveedor)
    const creadas: string[] = [];
    for (const proveedorId of parsed.data.proveedorIds) {
      const existing = await prisma.solicitudPresupuesto.findUnique({
        where: { trabajoId_proveedorId: { trabajoId: id, proveedorId } },
      });
      if (!existing) {
        const sol = await prisma.solicitudPresupuesto.create({
          data: { trabajoId: id, proveedorId },
        });
        creadas.push(sol.id);
      } else {
        creadas.push(existing.id);
      }
    }

    // Enviar si solicitado
    let enviados = 0;
    if (parsed.data.enviar) {
      const result = await enviarSolicitudes(id, creadas, parsed.data.via);
      enviados = result.enviados;
    }

    return NextResponse.json({ data: { creadas: creadas.length, enviados } }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/trabajos/[id]/solicitudes error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
export const POST = withRateLimit(_POST);
