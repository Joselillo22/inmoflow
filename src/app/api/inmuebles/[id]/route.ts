import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateInmuebleSchema } from "@/lib/validations/inmueble";
import { getSessionUser, canAccessResource } from "@/lib/utils/auth-check";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;

    const inmueble = await prisma.inmueble.findUnique({
      where: { id },
      include: {
        comercial: { include: { usuario: { select: { nombre: true, apellidos: true } } } },
        propietario: {
          select: { id: true, nombre: true, apellidos: true, telefono: true, email: true },
        },
        fotos: { orderBy: { orden: "asc" } },
        documentos: { orderBy: { createdAt: "desc" } },
        publicaciones: { orderBy: { createdAt: "desc" } },
        visitas: {
          include: {
            lead: { select: { nombre: true, apellidos: true, telefono: true } },
          },
          orderBy: { fecha: "desc" },
          take: 20,
        },
        _count: { select: { fotos: true, visitas: true, publicaciones: true, documentos: true, matchings: true } },
      },
    });

    if (!inmueble) return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
    if (!canAccessResource(user, inmueble.comercialId)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    return NextResponse.json({ data: inmueble });
  } catch (error) {
    logger.error({ err: error }, "GET /api/inmuebles/[id] error");
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

    const { id } = await params;
    const existing = await prisma.inmueble.findUnique({ where: { id }, select: { comercialId: true, estado: true } });

    // Audit RGPD
    const reqInfo_PATCH = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "Inmueble", ip: reqInfo_PATCH.ip, userAgent: reqInfo_PATCH.userAgent });
    if (!existing) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (!canAccessResource(user, existing.comercialId)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateInmuebleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.estado && parsed.data.estado !== existing.estado) {
      logger.info(`[AUDIT] Inmueble ${id}: estado ${existing.estado} → ${parsed.data.estado} by ${user.id}`);
    }

    const inmueble = await prisma.inmueble.update({ where: { id }, data: parsed.data });
return NextResponse.json({ data: inmueble });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/inmuebles/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const PATCH = withRateLimit(_PATCH);
