import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createInmuebleSchema } from "@/lib/validations/inmueble";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado");
    const tipo = searchParams.get("tipo");
    const operacion = searchParams.get("operacion");
    const localidad = searchParams.get("localidad");
    const comercialId = searchParams.get("comercialId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";
    const precioMin = searchParams.get("precioMin");
    const precioMax = searchParams.get("precioMax");

    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado;
    if (tipo) where.tipo = tipo;
    if (operacion) where.operacion = operacion;
    if (localidad) where.localidad = { contains: localidad, mode: "insensitive" };
    if (comercialId) where.comercialId = comercialId;
    if (precioMin || precioMax) {
      where.precio = {};
      if (precioMin) (where.precio as Record<string, unknown>).gte = Number(precioMin);
      if (precioMax) (where.precio as Record<string, unknown>).lte = Number(precioMax);
    }
    if (search) {
      where.OR = [
        { titulo: { contains: search, mode: "insensitive" } },
        { referencia: { contains: search, mode: "insensitive" } },
        { direccion: { contains: search, mode: "insensitive" } },
        { localidad: { contains: search, mode: "insensitive" } },
      ];
    }

    const rol = (session.user as unknown as { rol: string; comercialId: string | null }).rol;
    const userComercialId = (session.user as unknown as { comercialId: string | null }).comercialId;
    if (rol === "COMERCIAL" && userComercialId) {
      where.comercialId = userComercialId;
    }

    const orderBy: Record<string, string> = {};
    if (sortBy === "precio") orderBy.precio = sortOrder;
    else if (sortBy === "referencia") orderBy.referencia = sortOrder;
    else if (sortBy === "localidad") orderBy.localidad = sortOrder;
    else orderBy.createdAt = sortOrder;

    const [inmuebles, total] = await Promise.all([
      prisma.inmueble.findMany({
        where,
        include: {
          comercial: { include: { usuario: { select: { nombre: true, apellidos: true } } } },
          fotos: { where: { esPrincipal: true }, take: 1, select: { url: true } },
          _count: { select: { fotos: true, visitas: true, publicaciones: true, documentos: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.inmueble.count({ where }),
    ]);

    return NextResponse.json({ data: inmuebles, total, page, limit });
  } catch (error) {
    logger.error({ err: error }, "GET /api/inmuebles error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || ((session.user as unknown as { rol: string }).rol !== "ADMIN" && (session.user as unknown as { rol: string }).rol !== "COORDINADORA")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createInmuebleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const inmueble = await prisma.inmueble.create({ data: parsed.data });

    // Audit RGPD
    const reqInfo_POST = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Inmueble", ip: reqInfo_POST.ip, userAgent: reqInfo_POST.userAgent });
return NextResponse.json({ data: inmueble }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/inmuebles error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const POST = withRateLimit(_POST);
