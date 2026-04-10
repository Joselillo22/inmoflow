import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import { getRendimientoGlobal } from "@/lib/services/rendimiento.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (session.user.rol !== "ADMIN") {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const desdeStr = searchParams.get("desde");
    const hastaStr = searchParams.get("hasta");

    const desde = desdeStr ? new Date(desdeStr) : new Date(now.getFullYear(), now.getMonth(), 1);
    const hasta = hastaStr ? new Date(hastaStr + "T23:59:59") : now;

    const data = await getRendimientoGlobal(desde, hasta);
    return NextResponse.json({ data });
  } catch (error) {
    logger.error({ err: error }, "GET /api/comerciales/rendimiento/global error");
    return NextResponse.json({ error: "Error al calcular rendimiento global" }, { status: 500 });
  }
}
