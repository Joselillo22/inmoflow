import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { asignarCaptacionSchema } from "@/lib/validations/captacion";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

async function _POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rol = (session.user as unknown as { rol: string }).rol;
    if (!["ADMIN", "COORDINADORA"].includes(rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = asignarCaptacionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "comercialId requerido" }, { status: 400 });
    }

    const comercial = await prisma.comercial.findUnique({
      where: { id: parsed.data.comercialId },
      include: { usuario: { select: { id: true, nombre: true, apellidos: true } } },
    });
    if (!comercial) return NextResponse.json({ error: "Comercial no encontrado" }, { status: 404 });

    const opp = await prisma.captacionOportunidad.update({
      where: { id },
      data: { comercialId: parsed.data.comercialId },
    });

    // Crear tarea inicial al comercial
    await prisma.tarea.create({
      data: {
        comercialId: parsed.data.comercialId,
        tipo: "LLAMAR",
        descripcion: `Captar ${opp.tipoInmueble ?? "inmueble"} en ${opp.localidad ?? ""} (${opp.portal})`,
        prioridad: 1,
      },
    }).catch(() => {});

    // Notificar al comercial
    await prisma.notificacion.create({
      data: {
        usuarioId: comercial.usuario.id,
        tipo: "ASIGNACION",
        titulo: "Nueva captación asignada",
        mensaje: `${opp.tipoInmueble ?? "Inmueble"} en ${opp.localidad ?? ""} — ${opp.portal}`,
        enlace: `/captacion?id=${opp.id}`,
        entidadTipo: "captacion",
        entidadId: opp.id,
      },
    }).catch(() => {});

    return NextResponse.json({ data: opp });
  } catch (error) {
    logger.error({ err: error }, "POST /api/captacion/[id]/asignar error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
