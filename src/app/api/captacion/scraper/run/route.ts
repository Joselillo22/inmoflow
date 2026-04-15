import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/rate-limit";
import { lanzarScraping } from "@/lib/services/apify-fsbo.service";
import logger from "@/lib/logger";

async function _POST(req: NextRequest) {
  try {
    // Permitir llamada interna vía API key (para cron) sin auth de sesión
    const apiKey = req.headers.get("x-api-key");
    const isInternal = apiKey && apiKey === process.env.PORTALES_API_KEY;

    if (!isInternal) {
      const session = await auth();
      if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      const rol = (session.user as unknown as { rol: string }).rol;
      if (!["ADMIN", "COORDINADORA"].includes(rol)) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }
    }

    if (!process.env.APIFY_API_TOKEN) {
      return NextResponse.json({ error: "Apify no está configurado (falta APIFY_API_TOKEN en .env)" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const portales: string[] = body.portales ?? ["MILANUNCIOS"];

    // Obtener config
    const config = await prisma.configuracionCaptacion.findUnique({ where: { id: "default" } });

    const operaciones: ("VENTA" | "ALQUILER")[] = [];
    if (!config || config.operacionVenta) operaciones.push("VENTA");
    if (!config || config.operacionAlquiler) operaciones.push("ALQUILER");

    if (operaciones.length === 0) {
      return NextResponse.json({ error: "Ninguna operación activa en la configuración" }, { status: 400 });
    }

    // Filtrar portales según config
    const portalesValidos = portales.filter((p) => {
      if (p === "IDEALISTA") return !config || config.idealista;
      if (p === "FOTOCASA") return !config || config.fotocasa;
      if (p === "MILANUNCIOS") return !config || config.milanuncios;
      return false;
    });

    if (portalesValidos.length === 0) {
      return NextResponse.json({ error: "Ninguno de los portales pedidos está activo" }, { status: 400 });
    }

    const runs: Record<string, unknown>[] = [];
    const errores: { portal: string; error: string }[] = [];

    for (const portal of portalesValidos) {
      try {
        const lanzados = await lanzarScraping({ portal: portal as "MILANUNCIOS", operaciones });
        for (const run of lanzados) {
          runs.push({ portal, runId: run.id, status: run.status, actorId: run.actorId });
        }
      } catch (error) {
        const msg = (error as Error).message;
        logger.error({ portal, err: error }, "Error lanzando actor");
        errores.push({ portal, error: msg });
      }
    }

    return NextResponse.json({
      message: `${runs.length} scraper(s) lanzados`,
      runs,
      errores,
    });
  } catch (error) {
    logger.error({ err: error }, "POST /api/captacion/scraper/run error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
