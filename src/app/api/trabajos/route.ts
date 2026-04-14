import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createTrabajoSchema } from "@/lib/validations/proveedor";
import { generarReferenciaTrabajo } from "@/lib/services/proveedor.service";
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
    const estado = searchParams.get("estado");
    const categoria = searchParams.get("categoria");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const where: Record<string, unknown> = {};
    if (estado) where.estado = estado;
    if (categoria) where.categoria = categoria;
    if (search) {
      where.OR = [
        { titulo: { contains: search, mode: "insensitive" } },
        { referencia: { contains: search, mode: "insensitive" } },
      ];
    }

    const [trabajos, total] = await Promise.all([
      prisma.trabajo.findMany({
        where,
        include: {
          inmueble: { select: { titulo: true, referencia: true } },
          _count: { select: { solicitudes: true } },
          solicitudes: { select: { respondida: true }, },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.trabajo.count({ where }),
    ]);

    // Enriquecer con conteo respondidos
    const data = trabajos.map((t) => ({
      ...t,
      respondidos: t.solicitudes.filter((s) => s.respondida).length,
      totalSolicitudes: t.solicitudes.length,
    }));

    return NextResponse.json({ data, total, page, limit });
  } catch (error) {
    logger.error({ err: error }, "GET /api/trabajos error");
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
    const parsed = createTrabajoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const referencia = await generarReferenciaTrabajo();

    const trabajo = await prisma.trabajo.create({
      data: {
        ...parsed.data,
        referencia,
        fechaLimite: parsed.data.fechaLimite ? new Date(parsed.data.fechaLimite) : null,
      },
    });

    const reqInfo = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Trabajo", ip: reqInfo.ip, userAgent: reqInfo.userAgent });

    return NextResponse.json({ data: trabajo }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/trabajos error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
export const POST = withRateLimit(_POST);
