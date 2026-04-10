import { NextRequest, NextResponse } from "next/server";
import { detectarTareasVencidas, notificarVisitasManana } from "@/lib/services/notificacion.service";
import { withRateLimit } from "@/lib/rate-limit";

// Cron endpoint: detectar tareas vencidas + visitas de manana
async function _POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PORTALES_API_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [tareas, visitas] = await Promise.all([
    detectarTareasVencidas(),
    notificarVisitasManana(),
  ]);

  return NextResponse.json({ data: { tareas, visitas } });
}

export const POST = withRateLimit(_POST);
