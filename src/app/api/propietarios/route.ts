import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { createPropietarioSchema } from "@/lib/validations/propietario";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _GET() {
  try {
    const user = await getSessionUser();
    if (!user || user.rol !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const propietarios = await prisma.propietario.findMany({
      select: {
        id: true, nombre: true, apellidos: true, telefono: true, email: true,
        dniNie: true, nacionalidad: true, kycVerificado: true, kycFecha: true,
        origenFondos: true, actividadPro: true, createdAt: true,
        _count: { select: { inmuebles: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: propietarios });
  } catch (error) {
    logger.error({ err: error }, "GET /api/propietarios error");
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
    const parsed = createPropietarioSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const propietario = await prisma.propietario.create({
      data: parsed.data,
    });

    // Audit RGPD
    const reqInfo_POST = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Propietario", ip: reqInfo_POST.ip, userAgent: reqInfo_POST.userAgent });
return NextResponse.json({ data: propietario }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/propietarios error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const POST = withRateLimit(_POST);
