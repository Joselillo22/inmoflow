import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { updateComercialSchema } from "@/lib/validations/comercial";
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
    if (user.rol !== "ADMIN" && user.rol !== "COORDINADORA") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await params;

    const comercial = await prisma.comercial.findUnique({
      where: { id },
      include: {
        usuario: {
          select: { id: true, email: true, nombre: true, apellidos: true, avatarUrl: true },
        },
        leads: {
          select: {
            id: true, nombre: true, apellidos: true, email: true,
            telefono: true, faseFunnel: true, score: true, fuente: true, updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
        },
        inmuebles: {
          select: {
            id: true, referencia: true, titulo: true, estado: true, tipo: true,
            operacion: true, precio: true, localidad: true, habitaciones: true,
            metrosConstruidos: true,
            fotos: { select: { url: true }, where: { esPrincipal: true }, take: 1 },
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
        },
        visitas: {
          select: {
            id: true, fecha: true, resultado: true, notasAntes: true, notasDespues: true,
            lead: { select: { id: true, nombre: true, apellidos: true } },
            inmueble: { select: { id: true, titulo: true, direccion: true } },
          },
          orderBy: { fecha: "desc" },
          take: 50,
        },
        tareas: {
          select: {
            id: true, tipo: true, descripcion: true, fechaLimite: true,
            completada: true, completadaAt: true, prioridad: true,
            leadId: true, inmuebleId: true, createdAt: true,
          },
          orderBy: [{ completada: "asc" }, { prioridad: "desc" }, { fechaLimite: "asc" }],
        },
        comisiones: {
          select: {
            id: true, total: true, pctEmpresa: true, pctComercial: true,
            importeEmpresa: true, importeComercial: true, estadoPago: true,
            fechaPago: true, createdAt: true,
            operacion: {
              select: {
                id: true, tipo: true, precioFinal: true, estado: true,
                inmueble: { select: { titulo: true, referencia: true } },
                lead: { select: { nombre: true, apellidos: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: {
          select: {
            leads: true, inmuebles: true, visitas: true,
            tareas: true, operaciones: true, comisiones: true,
          },
        },
      },
    });

    if (!comercial) {
      return NextResponse.json({ error: "Comercial no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data: comercial });
  } catch (error) {
    logger.error({ err: error }, "GET /api/comerciales/[id] error");
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
    if (user.rol !== "ADMIN") {
      return NextResponse.json({ error: "Solo administradores pueden editar comerciales" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateComercialSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.comercial.findUnique({ where: { id } });

    // Audit RGPD
    const reqInfo_PATCH = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "Comercial", ip: reqInfo_PATCH.ip, userAgent: reqInfo_PATCH.userAgent });
    if (!existing) {
      return NextResponse.json({ error: "Comercial no encontrado" }, { status: 404 });
    }

    // Separar campos de usuario y de comercial
    const { nombre, apellidos, ...comercialData } = parsed.data;

    // Actualizar comercial
    const comercial = await prisma.comercial.update({
      where: { id },
      data: comercialData,
      include: {
        usuario: { select: { id: true, email: true, nombre: true, apellidos: true } },
      },
    });

    // Actualizar nombre/apellidos en usuario si se proporcionan
    if (nombre || apellidos) {
      const usuarioUpdate: Record<string, string> = {};
      if (nombre) usuarioUpdate.nombre = nombre;
      if (apellidos) usuarioUpdate.apellidos = apellidos;
      await prisma.usuario.update({
        where: { id: existing.usuarioId },
        data: usuarioUpdate,
      });
    }
return NextResponse.json({ data: comercial });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/comerciales/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const PATCH = withRateLimit(_PATCH);
