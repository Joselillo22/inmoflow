import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { hash } from "bcryptjs";
import { z } from "zod";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

const updateUsuarioSchema = z.object({
  nombre: z.string().min(1).optional(),
  apellidos: z.string().min(1).optional(),
  email: z.string().email().optional(),
  rol: z.enum(["ADMIN", "COORDINADORA", "COMERCIAL"]).optional(),
  activo: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

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
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true, email: true, nombre: true, apellidos: true,
        rol: true, activo: true, avatarUrl: true, createdAt: true, updatedAt: true,
        comercial: { select: { id: true, telefono: true, zona: true, idiomas: true } },
      },
    });

    if (!usuario) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    return NextResponse.json({ data: usuario });
  } catch (error) {
    logger.error({ err: error }, "GET /api/usuarios/[id] error");
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
    const parsed = updateUsuarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.usuario.findUnique({ where: { id } });

    // Audit RGPD
    const reqInfo_PATCH = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "Usuario", ip: reqInfo_PATCH.ip, userAgent: reqInfo_PATCH.userAgent });
    if (!existing) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (parsed.data.nombre) data.nombre = parsed.data.nombre;
    if (parsed.data.apellidos) data.apellidos = parsed.data.apellidos;
    if (parsed.data.email) data.email = parsed.data.email;
    if (parsed.data.rol) data.rol = parsed.data.rol;
    if (parsed.data.activo !== undefined) data.activo = parsed.data.activo;
    if (parsed.data.password) data.passwordHash = await hash(parsed.data.password, 12);

    const usuario = await prisma.usuario.update({ where: { id }, data });
return NextResponse.json({ data: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol, activo: usuario.activo } });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/usuarios/[id] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const PATCH = withRateLimit(_PATCH);
