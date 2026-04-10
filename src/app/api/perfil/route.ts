import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash, compare } from "bcryptjs";
import { z } from "zod";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

const updatePerfilSchema = z.object({
  nombre: z.string().min(1).optional(),
  apellidos: z.string().min(1).optional(),
  passwordActual: z.string().optional(),
  passwordNueva: z.string().min(8, "Minimo 8 caracteres").optional(),
});

async function _GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userId = (session.user as unknown as { id: string }).id;
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, nombre: true, apellidos: true,
        rol: true, activo: true, avatarUrl: true, createdAt: true,
        comercial: { select: { id: true, telefono: true, zona: true } },
      },
    });

    if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    return NextResponse.json({ data: usuario });
  } catch (error) {
    logger.error({ err: error }, "GET /api/perfil error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userId = (session.user as unknown as { id: string }).id;
    const body = await req.json();
    const parsed = updatePerfilSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: userId } });

    // Audit RGPD
    const reqInfo_PATCH = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "Perfil", ip: reqInfo_PATCH.ip, userAgent: reqInfo_PATCH.userAgent });
    if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (parsed.data.nombre) data.nombre = parsed.data.nombre;
    if (parsed.data.apellidos) data.apellidos = parsed.data.apellidos;

    // Cambio de password
    if (parsed.data.passwordNueva) {
      if (!parsed.data.passwordActual) {
        return NextResponse.json({ error: "Debes proporcionar la contrasena actual" }, { status: 400 });
      }
      const valid = await compare(parsed.data.passwordActual, usuario.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "La contrasena actual no es correcta" }, { status: 400 });
      }
      data.passwordHash = await hash(parsed.data.passwordNueva, 12);
    }

    const updated = await prisma.usuario.update({ where: { id: userId }, data });
return NextResponse.json({ data: { id: updated.id, nombre: updated.nombre, apellidos: updated.apellidos } });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/perfil error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const PATCH = withRateLimit(_PATCH);
