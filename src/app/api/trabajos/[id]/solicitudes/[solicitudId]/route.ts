import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { registrarPresupuestoSchema, valorarSchema } from "@/lib/validations/proveedor";
import { recalcularValoracion } from "@/lib/services/proveedor.service";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

async function _PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; solicitudId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!["ADMIN", "COORDINADORA"].includes(session.user.rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id, solicitudId } = await params;
    const body = await req.json();

    const solicitud = await prisma.solicitudPresupuesto.findUnique({
      where: { id: solicitudId },
    });
    if (!solicitud || solicitud.trabajoId !== id) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    // Caso 1: Registrar presupuesto recibido
    if (body.importe !== undefined) {
      const parsed = registrarPresupuestoSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
      }

      const updated = await prisma.solicitudPresupuesto.update({
        where: { id: solicitudId },
        data: {
          respondida: true,
          respondidaAt: new Date(),
          importe: parsed.data.importe,
          detallePresupuesto: parsed.data.detallePresupuesto,
          documentoUrl: parsed.data.documentoUrl,
        },
      });

      // Actualizar estado trabajo a EN_CURSO
      await prisma.trabajo.update({
        where: { id },
        data: { estado: "EN_CURSO" },
      });

      return NextResponse.json({ data: updated });
    }

    // Caso 2: Seleccionar como ganador
    if (body.seleccionar === true) {
      // Deseleccionar cualquier otra
      await prisma.solicitudPresupuesto.updateMany({
        where: { trabajoId: id, seleccionada: true },
        data: { seleccionada: false },
      });

      const updated = await prisma.solicitudPresupuesto.update({
        where: { id: solicitudId },
        data: { seleccionada: true },
      });

      // Adjudicar trabajo
      await prisma.trabajo.update({
        where: { id },
        data: {
          estado: "ADJUDICADO",
          adjudicadoId: solicitudId,
          importeAdjudicado: solicitud.importe,
        },
      });

      return NextResponse.json({ data: updated });
    }

    // Caso 3: Valorar proveedor
    if (body.valoracion !== undefined) {
      const parsed = valorarSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
      }

      const updated = await prisma.solicitudPresupuesto.update({
        where: { id: solicitudId },
        data: {
          valoracion: parsed.data.valoracion,
          comentarioValoracion: parsed.data.comentarioValoracion,
        },
      });

      await recalcularValoracion(solicitud.proveedorId);
      return NextResponse.json({ data: updated });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/trabajos/[id]/solicitudes/[solicitudId] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const PATCH = withRateLimit(_PATCH);
