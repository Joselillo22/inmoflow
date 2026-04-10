import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { hash } from "bcryptjs";
import { z } from "zod";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

const createUsuarioSchema = z.object({
  email: z.string().email("Email no valido"),
  nombre: z.string().min(1, "Nombre obligatorio"),
  apellidos: z.string().min(1, "Apellidos obligatorios"),
  password: z.string().min(8, "Minimo 8 caracteres"),
  rol: z.enum(["ADMIN", "COORDINADORA"]),
});

async function _GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true, email: true, nombre: true, apellidos: true,
        rol: true, activo: true, avatarUrl: true, createdAt: true,
        comercial: { select: { id: true, telefono: true, zona: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: usuarios });
  } catch (error) {
    logger.error({ err: error }, "GET /api/usuarios error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createUsuarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { email, nombre, apellidos, password, rol } = parsed.data;

    const existing = await prisma.usuario.findUnique({ where: { email } });

    // Audit RGPD
    const reqInfo_POST = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Usuario", ip: reqInfo_POST.ip, userAgent: reqInfo_POST.userAgent });
    if (existing) {
      return NextResponse.json({ error: "El email ya esta registrado" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);

    const usuario = await prisma.usuario.create({
      data: { email, nombre, apellidos, passwordHash, rol },
    });
return NextResponse.json({ data: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol } }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/usuarios error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const POST = withRateLimit(_POST);
