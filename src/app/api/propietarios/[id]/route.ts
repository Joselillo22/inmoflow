import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { updatePropietarioSchema } from "@/lib/validations/propietario";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;

    const propietario = await prisma.propietario.findUnique({
      where: { id },
      include: {
        inmuebles: {
          select: {
            id: true, referencia: true, titulo: true, estado: true, tipo: true,
            operacion: true, precio: true, localidad: true,
            operaciones: {
              select: {
                id: true, tipo: true, estado: true, precioFinal: true, createdAt: true,
                lead: { select: { nombre: true, apellidos: true } },
                comercial: { include: { usuario: { select: { nombre: true, apellidos: true } } } },
              },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { inmuebles: true } },
      },
    });

    if (!propietario) {
      return NextResponse.json({ error: "Propietario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ data: propietario });
  } catch (error) {
    logger.error({ err: error }, "GET /api/propietarios/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updatePropietarioSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.propietario.findUnique({ where: { id } });

    // Audit RGPD
    const reqInfo_PATCH = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "Propietario", ip: reqInfo_PATCH.ip, userAgent: reqInfo_PATCH.userAgent });
    if (!existing) {
      return NextResponse.json({ error: "Propietario no encontrado" }, { status: 404 });
    }

    const data: Record<string, unknown> = { ...parsed.data };

    // Si se envian todos los campos KYC obligatorios → verificar automaticamente
    if (data.dniNie && data.tipoDocumento && data.nacionalidad && data.actividadPro && data.origenFondos) {
      data.kycVerificado = true;
      data.kycFecha = new Date();
    }

    // Si se revoca KYC explicitamente
    if (parsed.data.kycVerificado === false) {
      data.kycVerificado = false;
      data.kycFecha = null;
    }

    const propietario = await prisma.propietario.update({
      where: { id },
      data,
    });
return NextResponse.json({ data: propietario });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/propietarios/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const PATCH = withRateLimit(_PATCH);
