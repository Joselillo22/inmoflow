import { NextRequest, NextResponse } from "next/server";
import { generarInformesMensuales } from "@/lib/services/informe.service";
import { withRateLimit } from "@/lib/rate-limit";

// POST — Generar informes mensuales de todos los propietarios
// Protegido por API key, llamado por cron el dia 1 de cada mes
async function _POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PORTALES_API_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await generarInformesMensuales();
  return NextResponse.json({ data: result });
}

export const POST = withRateLimit(_POST);
