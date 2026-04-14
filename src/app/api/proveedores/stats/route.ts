import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEstadisticas } from "@/lib/services/proveedor.service";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

async function _GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!["ADMIN", "COORDINADORA"].includes(session.user.rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const data = await getEstadisticas();
    return NextResponse.json({ data });
  } catch (error) {
    logger.error({ err: error }, "GET /api/proveedores/stats error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
