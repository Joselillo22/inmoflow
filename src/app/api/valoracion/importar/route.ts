import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/rate-limit";
import { importarTodo } from "@/lib/services/comparables.service";
import logger from "@/lib/logger";

async function _POST(req: NextRequest) {
  try {
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

    const result = await importarTodo();
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ err: error }, "POST /api/valoracion/importar error");
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
