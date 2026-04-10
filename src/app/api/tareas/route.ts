import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createTareaSchema } from "@/lib/validations/tarea";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const where: Record<string, unknown> = {};

    if (session.user.rol === "COMERCIAL" && session.user.comercialId) {
      where.comercialId = session.user.comercialId;
    }

    const tareas = await prisma.tarea.findMany({
      where,
      orderBy: [{ completada: "asc" }, { prioridad: "desc" }, { fechaLimite: "asc" }],
    });

    return NextResponse.json({ data: tareas });
  } catch (error) {
    logger.error({ err: error }, "GET /api/tareas error");
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
    const parsed = createTareaSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const tarea = await prisma.tarea.create({
      data: {
        ...parsed.data,
        fechaLimite: parsed.data.fechaLimite ? new Date(parsed.data.fechaLimite) : null,
      },
    });

    // Audit RGPD
    const reqInfo_POST = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Tarea", ip: reqInfo_POST.ip, userAgent: reqInfo_POST.userAgent });
return NextResponse.json({ data: tarea }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/tareas error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const POST = withRateLimit(_POST);
