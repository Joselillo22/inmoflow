import { notifOperacionAvance } from "@/lib/services/notificacion.service";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { z } from "zod";
import { calcularComision } from "@/lib/services/comision.service";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

const updateSchema = z.object({
  estado: z.enum([
    "EN_NEGOCIACION", "OFERTA_ACEPTADA", "ARRAS_FIRMADAS",
    "PENDIENTE_NOTARIA", "CERRADA", "CAIDA",
  ]).optional(),
  precioFinal: z.number().positive().optional(),
  comisionPctPropietario: z.number().min(0).max(100).optional(),
  notas: z.string().optional(),
  fechaOferta: z.string().optional(),
  fechaArras: z.string().optional(),
  fechaCierre: z.string().optional(),
});

async function _GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;

    const operacion = await prisma.operacion.findUnique({
      where: { id },
      include: {
        inmueble: {
          select: {
            id: true, titulo: true, referencia: true, direccion: true,
            localidad: true, precio: true, tipo: true, operacion: true, estado: true,
          },
        },
        lead: {
          select: {
            id: true, nombre: true, apellidos: true, telefono: true,
            email: true, faseFunnel: true,
          },
        },
        comercial: {
          include: { usuario: { select: { nombre: true, apellidos: true } } },
        },
        comision: {
          select: {
            id: true, total: true, importeEmpresa: true, importeComercial: true,
            estadoPago: true, fechaPago: true,
          },
        },
      },
    });

    if (!operacion) {
      return NextResponse.json({ error: "Operacion no encontrada" }, { status: 404 });
    }

// Notificar avance de operacion    if (parsed.data.estado && existing) {      const comercialData = await prisma.comercial.findUnique({ where: { id: existing.comercialId }, select: { usuarioId: true } });      const inmData = await prisma.inmueble.findUnique({ where: { id: existing.inmuebleId }, select: { titulo: true } });      if (comercialData && inmData) notifOperacionAvance(id, parsed.data.estado, comercialData.usuarioId, inmData.titulo).catch(() => {});    }
    return NextResponse.json({ data: operacion });
  } catch (error) {
    logger.error({ err: error }, "GET /api/operaciones/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (user.rol !== "ADMIN" && user.rol !== "COORDINADORA") {
      return NextResponse.json({ error: "Solo administradores pueden modificar operaciones" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.operacion.findUnique({ where: { id }, include: { comision: true } });

    // Audit RGPD
    const reqInfo_PATCH = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "Operacion", ip: reqInfo_PATCH.ip, userAgent: reqInfo_PATCH.userAgent });
    if (!existing) {
      return NextResponse.json({ error: "Operacion no encontrada" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.estado) data.estado = parsed.data.estado;
    if (parsed.data.precioFinal) data.precioFinal = parsed.data.precioFinal;
    if (parsed.data.notas !== undefined) data.notas = parsed.data.notas;
    if (parsed.data.fechaOferta) data.fechaOferta = new Date(parsed.data.fechaOferta);
    if (parsed.data.fechaArras) data.fechaArras = new Date(parsed.data.fechaArras);
    if (parsed.data.fechaCierre) data.fechaCierre = new Date(parsed.data.fechaCierre);

    // Si se cierra, actualizar estado del inmueble
    if (parsed.data.estado === "CERRADA") {
      const nuevoEstado = existing.tipo === "VENTA" ? "VENDIDO" : "ALQUILADO";
      await prisma.inmueble.update({
        where: { id: existing.inmuebleId },
        data: { estado: nuevoEstado as "VENDIDO" | "ALQUILADO" },
      });
      if (!data.fechaCierre) data.fechaCierre = new Date();
    }

    // Calcular comision si se proporciona % y no existe aun
    if (parsed.data.comisionPctPropietario && !existing.comision) {
      await calcularComision({
        operacionId: id,
        comercialId: existing.comercialId,
        precioFinal: Number(parsed.data.precioFinal ?? existing.precioFinal),
        comisionPctPropietario: parsed.data.comisionPctPropietario,
      });
    }

    const operacion = await prisma.operacion.update({
      where: { id },
      data,
      include: {
        inmueble: { select: { id: true, titulo: true, referencia: true } },
        lead: { select: { id: true, nombre: true, apellidos: true } },
        comercial: { include: { usuario: { select: { nombre: true, apellidos: true } } } },
        comision: true,
      },
    });

// Notificar avance de operacion    if (parsed.data.estado && existing) {      const comercialData = await prisma.comercial.findUnique({ where: { id: existing.comercialId }, select: { usuarioId: true } });      const inmData = await prisma.inmueble.findUnique({ where: { id: existing.inmuebleId }, select: { titulo: true } });      if (comercialData && inmData) notifOperacionAvance(id, parsed.data.estado, comercialData.usuarioId, inmData.titulo).catch(() => {});    }
return NextResponse.json({ data: operacion });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/operaciones/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const PATCH = withRateLimit(_PATCH);
