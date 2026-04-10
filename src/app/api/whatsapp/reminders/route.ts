import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recordatorioVisita } from "@/lib/services/whatsapp.service";
import { withRateLimit } from "@/lib/rate-limit";

// Endpoint para enviar recordatorios de visitas de manana
// Llamado por cron diario a las 20:00
async function _POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PORTALES_API_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  manana.setHours(0, 0, 0, 0);

  const mananaFin = new Date(manana);
  mananaFin.setHours(23, 59, 59, 999);

  const visitas = await prisma.visita.findMany({
    where: {
      fecha: { gte: manana, lte: mananaFin },
      resultado: "PENDIENTE",
    },
    include: {
      lead: { select: { telefono: true, nombre: true } },
      inmueble: { select: { direccion: true } },
    },
  });

  let enviados = 0;
  const errores: string[] = [];

  for (const visita of visitas) {
    if (!visita.lead.telefono) continue;
    try {
      const hora = new Date(visita.fecha).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
      await recordatorioVisita(visita.lead.telefono, hora, visita.inmueble.direccion);
      enviados++;
    } catch (err) {
      errores.push("Error con lead " + visita.lead.nombre + ": " + (err as Error).message);
    }
  }

  return NextResponse.json({
    data: { visitasManana: visitas.length, recordatoriosEnviados: enviados, errores },
  });
}

export const POST = withRateLimit(_POST);
