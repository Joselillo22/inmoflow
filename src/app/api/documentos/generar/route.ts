import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/utils/auth-check";
import { generarHojaEncargo, generarDocumentoArras } from "@/lib/services/firma-digital.service";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

// POST — Generar documentos legales (hoja encargo o arras)
async function _POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const { tipo, inmuebleId, propietarioId, operacionId } = body;

    if (tipo === "hoja_encargo") {
      if (!inmuebleId || !propietarioId) {
        return NextResponse.json({ error: "inmuebleId y propietarioId son requeridos" }, { status: 400 });
      }
      const url = await generarHojaEncargo({ inmuebleId, propietarioId });
      return NextResponse.json({ data: { url } });
    }

    if (tipo === "arras") {
      if (!operacionId) {
        return NextResponse.json({ error: "operacionId es requerido" }, { status: 400 });
      }
      const url = await generarDocumentoArras(operacionId);
      return NextResponse.json({ data: { url } });
    }

    return NextResponse.json({ error: "Tipo de documento no valido. Usar: hoja_encargo o arras" }, { status: 400 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/documentos/generar error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
