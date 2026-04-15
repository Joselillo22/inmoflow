import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { configuracionCaptacionSchema } from "@/lib/validations/captacion";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

const DEFAULT_TEMPLATE = `Hola {nombre}, he visto su anuncio de {tipo} en {localidad} publicado en {portal}.

Soy {agente} de {inmo}. Trabajamos en la zona y tenemos compradores interesados en inmuebles como el suyo.

¿Le gustaría que le ayudemos a venderlo más rápido y al mejor precio? Sin compromiso.

Un saludo`;

async function _GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    let config = await prisma.configuracionCaptacion.findUnique({ where: { id: "default" } });
    if (!config) {
      config = await prisma.configuracionCaptacion.create({
        data: { id: "default", plantillaWhatsApp: DEFAULT_TEMPLATE },
      });
    }
    return NextResponse.json({ data: config });
  } catch (error) {
    logger.error({ err: error }, "GET /api/captacion/configuracion error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rol = (session.user as unknown as { rol: string }).rol;
    if (!["ADMIN", "COORDINADORA"].includes(rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = configuracionCaptacionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const config = await prisma.configuracionCaptacion.upsert({
      where: { id: "default" },
      create: { id: "default", ...parsed.data, plantillaWhatsApp: parsed.data.plantillaWhatsApp ?? DEFAULT_TEMPLATE },
      update: parsed.data,
    });
    return NextResponse.json({ data: config });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/captacion/configuracion error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
export const PATCH = withRateLimit(_PATCH);
