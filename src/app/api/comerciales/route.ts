import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";
import { createComercialSchema } from "@/lib/validations/comercial";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const comerciales = await prisma.comercial.findMany({
      include: {
        usuario: { select: { nombre: true, apellidos: true, email: true, activo: true } },
        _count: { select: { leads: true, inmuebles: true, visitas: true, operaciones: true } },
      },
      orderBy: { fechaAlta: "desc" },
    });

    return NextResponse.json({ data: comerciales });
  } catch (error) {
    logger.error({ err: error }, "GET /api/comerciales error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createComercialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { email, nombre, apellidos, password, telefono, zona, numRegistroCV } = parsed.data;

    const existing = await prisma.usuario.findUnique({ where: { email } });

    // Audit RGPD
    const reqInfo_POST = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Comercial", ip: reqInfo_POST.ip, userAgent: reqInfo_POST.userAgent });
    if (existing) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.create({
        data: { email, nombre, apellidos, passwordHash, rol: "COMERCIAL" },
      });

      const comercial = await tx.comercial.create({
        data: { usuarioId: usuario.id, telefono, zona, numRegistroCV },
      });

      return { usuario, comercial };
    });
return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/comerciales error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const POST = withRateLimit(_POST);
