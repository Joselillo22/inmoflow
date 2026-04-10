import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { getRendimientoComercial } from "@/lib/services/rendimiento.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!["ADMIN", "COORDINADORA"].includes(session.user.rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const now = new Date();
    const desdeStr = searchParams.get("desde");
    const hastaStr = searchParams.get("hasta");

    const desde = desdeStr ? new Date(desdeStr) : new Date(now.getFullYear(), now.getMonth(), 1);
    const hasta = hastaStr ? new Date(hastaStr + "T23:59:59") : now;

    // Periodo de comparación: mes anterior por defecto
    const comparar = searchParams.get("comparar") ?? "mes_anterior";
    let compararDesde: Date | undefined;
    let compararHasta: Date | undefined;

    if (comparar === "mes_anterior") {
      compararDesde = new Date(desde.getFullYear(), desde.getMonth() - 1, 1);
      compararHasta = new Date(desde.getFullYear(), desde.getMonth(), 0, 23, 59, 59);
    } else if (comparar === "trimestre_anterior") {
      compararDesde = new Date(desde.getFullYear(), desde.getMonth() - 3, 1);
      compararHasta = new Date(desde.getFullYear(), desde.getMonth(), 0, 23, 59, 59);
    } else if (comparar === "mismo_mes_ano_anterior") {
      compararDesde = new Date(desde.getFullYear() - 1, desde.getMonth(), 1);
      compararHasta = new Date(desde.getFullYear() - 1, desde.getMonth() + 1, 0, 23, 59, 59);
    }

    const data = await getRendimientoComercial(id, desde, hasta, compararDesde, compararHasta);
    return NextResponse.json({ data });
  } catch (error) {
    logger.error({ err: error }, "GET /api/comerciales/[id]/rendimiento error");
    return NextResponse.json({ error: "Error al calcular rendimiento" }, { status: 500 });
  }
}
