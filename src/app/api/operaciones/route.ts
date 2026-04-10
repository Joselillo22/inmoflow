import { ejecutarAutomatizaciones } from "@/lib/services/automation-engine.service";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { calcularComision } from "@/lib/services/comision.service";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

const createOperacionSchema = z.object({
  inmuebleId: z.string().min(1),
  leadId: z.string().min(1),
  comercialId: z.string().min(1),
  tipo: z.enum(["VENTA", "ALQUILER"]),
  precioFinal: z.number().positive(),
  comisionPctPropietario: z.number().min(0).max(100).optional(),
  notas: z.string().optional(),
});

const updateOperacionSchema = z.object({
  estado: z.enum([
    "EN_NEGOCIACION", "OFERTA_ACEPTADA", "ARRAS_FIRMADAS",
    "PENDIENTE_NOTARIA", "CERRADA", "CAIDA",
  ]).optional(),
  precioFinal: z.number().positive().optional(),
  notas: z.string().optional(),
  fechaOferta: z.string().optional(),
  fechaArras: z.string().optional(),
  fechaCierre: z.string().optional(),
});

async function _GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const operaciones = await prisma.operacion.findMany({
      include: {
        inmueble: { select: { titulo: true, referencia: true } },
        lead: { select: { nombre: true, apellidos: true } },
        comercial: { include: { usuario: { select: { nombre: true, apellidos: true } } } },
        comision: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: operaciones });
  } catch (error) {
    logger.error({ err: error }, "GET /api/operaciones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createOperacionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const operacion = await prisma.operacion.create({
      data: {
        inmuebleId: parsed.data.inmuebleId,
        leadId: parsed.data.leadId,
        comercialId: parsed.data.comercialId,
        tipo: parsed.data.tipo,
        precioFinal: parsed.data.precioFinal,
        notas: parsed.data.notas,
      },
    });

    // Audit RGPD
    const reqInfo_POST = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Operacion", ip: reqInfo_POST.ip, userAgent: reqInfo_POST.userAgent });

    // Si viene % de comisión, calcular automáticamente
    if (parsed.data.comisionPctPropietario) {
      await calcularComision({
        operacionId: operacion.id,
        comercialId: parsed.data.comercialId,
        precioFinal: parsed.data.precioFinal,
        comisionPctPropietario: parsed.data.comisionPctPropietario,
      });
    }

ejecutarAutomatizaciones({ evento: "OPERACION_CREADA", entidadTipo: "operacion", entidadId: operacion.id }).catch(() => {});
return NextResponse.json({ data: operacion }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/operaciones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // #9: Solo ADMIN/COORDINADORA pueden modificar operaciones
    const rol = (session.user as unknown as { rol: string }).rol;
    if (rol !== "ADMIN" && rol !== "COORDINADORA") {
      return NextResponse.json({ error: "Solo administradores pueden modificar operaciones" }, { status: 403 });
    }

    const { id, ...body } = await req.json();
    const parsed = updateOperacionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.fechaOferta) data.fechaOferta = new Date(parsed.data.fechaOferta);
    if (parsed.data.fechaArras) data.fechaArras = new Date(parsed.data.fechaArras);
    if (parsed.data.fechaCierre) data.fechaCierre = new Date(parsed.data.fechaCierre);

    // Si se cierra, actualizar estado del inmueble
    if (parsed.data.estado === "CERRADA") {
      const op = await prisma.operacion.findUnique({ where: { id } });

    // Audit RGPD
    const reqInfo_PATCH = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "Operacion", ip: reqInfo_PATCH.ip, userAgent: reqInfo_PATCH.userAgent });
      if (op) {
        const nuevoEstado = op.tipo === "VENTA" ? "VENDIDO" : "ALQUILADO";
        await prisma.inmueble.update({
          where: { id: op.inmuebleId },
          data: { estado: nuevoEstado as "VENDIDO" | "ALQUILADO" },
        });
      }
    }

    const operacion = await prisma.operacion.update({
      where: { id },
      data,
    });

    return NextResponse.json({ data: operacion });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/operaciones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const POST = withRateLimit(_POST);

export const PATCH = withRateLimit(_PATCH);
