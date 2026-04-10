import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import {
  consultarPorRC,
  validarRC,
  esResultadoMultiple,
} from "@/lib/services/catastro.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (!["ADMIN", "COORDINADORA"].includes(session.user.rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const { referenciaCatastral } = body;

    if (!referenciaCatastral || typeof referenciaCatastral !== "string") {
      return NextResponse.json({ error: "referenciaCatastral requerida" }, { status: 400 });
    }

    const { valida, error } = validarRC(referenciaCatastral);
    if (!valida) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const resultado = await consultarPorRC(referenciaCatastral);

    if (esResultadoMultiple(resultado)) {
      return NextResponse.json({
        multiple: true,
        referenciaCatastral14: resultado.referenciaCatastral14,
        inmuebles: resultado.inmuebles,
        count: resultado.inmuebles.length,
      });
    }

    return NextResponse.json({ datos: resultado });
  } catch (error) {
    const msg = (error as Error).message;
    logger.error({ err: error }, "POST /api/catastro/consulta error");

    if (msg.includes("NO ENCONTRADA") || msg.includes("no encontrada") || msg.includes("NO ESTÁ CORRECTAMENTE")) {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg.includes("timeout") || msg.includes("no disponible")) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    return NextResponse.json({ error: "Error al consultar Catastro" }, { status: 500 });
  }
}
