import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generarInformePropietario, generarInformeHTML } from "@/lib/services/informe.service";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

async function _GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const propietarioId = searchParams.get("propietarioId");
    const inmuebleId = searchParams.get("inmuebleId");
    const periodo = searchParams.get("periodo");
    const format = searchParams.get("format") ?? "json";

    if (!propietarioId || !inmuebleId || !periodo) {
      return NextResponse.json(
        { error: "Se requieren propietarioId, inmuebleId y periodo" },
        { status: 400 }
      );
    }

    const data = await generarInformePropietario(propietarioId, inmuebleId, periodo);

    if (format === "html") {
      const html = await generarInformeHTML(data);
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    logger.error({ err: error }, "GET /api/informes error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
