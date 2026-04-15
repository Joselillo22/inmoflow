import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createCaptacionSchema } from "@/lib/validations/captacion";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const rol = (session.user as unknown as { rol: string }).rol;
    const comercialId = (session.user as unknown as { comercialId: string | null }).comercialId;
    if (!["ADMIN", "COORDINADORA", "COMERCIAL"].includes(rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado");
    const portal = searchParams.get("portal");
    const operacion = searchParams.get("operacion");
    const localidad = searchParams.get("localidad");
    const comercialFiltro = searchParams.get("comercialId");
    const sinAsignar = searchParams.get("sinAsignar") === "true";
    const precioMin = searchParams.get("precioMin");
    const precioMax = searchParams.get("precioMax");
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");
    const buscar = searchParams.get("buscar");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");

    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado;
    if (portal) where.portal = portal;
    if (operacion) where.operacion = operacion;
    if (localidad) where.localidad = { contains: localidad, mode: "insensitive" };
    if (sinAsignar) where.comercialId = null;
    else if (comercialFiltro) where.comercialId = comercialFiltro;
    if (precioMin || precioMax) {
      where.precio = {};
      if (precioMin) (where.precio as Record<string, unknown>).gte = Number(precioMin);
      if (precioMax) (where.precio as Record<string, unknown>).lte = Number(precioMax);
    }
    if (desde || hasta) {
      where.fechaDeteccion = {};
      if (desde) (where.fechaDeteccion as Record<string, unknown>).gte = new Date(desde);
      if (hasta) (where.fechaDeteccion as Record<string, unknown>).lte = new Date(hasta);
    }
    if (buscar) {
      where.OR = [
        { titulo: { contains: buscar, mode: "insensitive" } },
        { direccionAproximada: { contains: buscar, mode: "insensitive" } },
        { nombrePropietario: { contains: buscar, mode: "insensitive" } },
        { localidad: { contains: buscar, mode: "insensitive" } },
      ];
    }

    // Comercial sólo ve las suyas
    if (rol === "COMERCIAL" && comercialId) {
      where.comercialId = comercialId;
    }

    const [items, total] = await Promise.all([
      prisma.captacionOportunidad.findMany({
        where,
        include: {
          comercial: { include: { usuario: { select: { nombre: true, apellidos: true } } } },
        },
        orderBy: [{ estado: "asc" }, { fechaDeteccion: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.captacionOportunidad.count({ where }),
    ]);

    return NextResponse.json({
      data: items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/captacion error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rol = (session.user as unknown as { rol: string }).rol;
    if (!["ADMIN", "COORDINADORA"].includes(rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createCaptacionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.precio) data.precioOriginal = parsed.data.precio;
    if (parsed.data.emailPropietario === "") delete data.emailPropietario;

    const oportunidad = await prisma.captacionOportunidad.create({ data: data as Parameters<typeof prisma.captacionOportunidad.create>[0]["data"] });

    const reqInfo = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "CaptacionOportunidad", ip: reqInfo.ip, userAgent: reqInfo.userAgent });

    return NextResponse.json({ data: oportunidad }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/captacion error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
export const POST = withRateLimit(_POST);
