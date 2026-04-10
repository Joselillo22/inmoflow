import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { z } from "zod";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

const createPubSchema = z.object({
  portal: z.enum(["IDEALISTA", "FOTOCASA", "HABITACLIA", "MILANUNCIOS", "KYERO", "THINKSPAIN", "WEB_PROPIA", "OTRO"]),
});

async function _POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || (user.rol !== "ADMIN" && user.rol !== "COORDINADORA")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = createPubSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
    }

    const pub = await prisma.publicacion.create({
      data: { inmuebleId: id, portal: parsed.data.portal, estado: "PENDIENTE" },
    });

    return NextResponse.json({ data: pub }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST publicaciones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _PATCH(
  req: NextRequest,
) {
  try {
    const user = await getSessionUser();
    if (!user || (user.rol !== "ADMIN" && user.rol !== "COORDINADORA")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { pubId, estado } = await req.json();
    const pub = await prisma.publicacion.update({
      where: { id: pubId },
      data: { estado, ultimaSync: new Date() },
    });

    return NextResponse.json({ data: pub });
  } catch (error) {
    logger.error({ err: error }, "PATCH publicaciones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _DELETE(
  req: NextRequest,
) {
  try {
    const user = await getSessionUser();
    if (!user || (user.rol !== "ADMIN" && user.rol !== "COORDINADORA")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const pubId = searchParams.get("pubId");
    if (!pubId) return NextResponse.json({ error: "pubId requerido" }, { status: 400 });

    await prisma.publicacion.delete({ where: { id: pubId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "DELETE publicaciones error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);

export const PATCH = withRateLimit(_PATCH);

export const DELETE = withRateLimit(_DELETE);
