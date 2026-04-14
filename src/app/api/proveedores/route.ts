import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createProveedorSchema } from "@/lib/validations/proveedor";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!["ADMIN", "COORDINADORA"].includes(session.user.rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const categoria = searchParams.get("categoria");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const where: Record<string, unknown> = {};
    if (categoria) where.categorias = { has: categoria };
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { contacto: { contains: search, mode: "insensitive" } },
        { telefono: { contains: search } },
      ];
    }

    const [proveedores, total] = await Promise.all([
      prisma.proveedor.findMany({
        where,
        include: {
          _count: { select: { solicitudes: true } },
        },
        orderBy: { nombre: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.proveedor.count({ where }),
    ]);

    return NextResponse.json({ data: proveedores, total, page, limit });
  } catch (error) {
    logger.error({ err: error }, "GET /api/proveedores error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!["ADMIN", "COORDINADORA"].includes(session.user.rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createProveedorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const proveedor = await prisma.proveedor.create({ data: parsed.data });

    const reqInfo = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Proveedor", ip: reqInfo.ip, userAgent: reqInfo.userAgent });

    return NextResponse.json({ data: proveedor }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/proveedores error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
export const POST = withRateLimit(_POST);
