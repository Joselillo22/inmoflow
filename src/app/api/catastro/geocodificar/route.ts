import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import logger from "@/lib/logger";
import {
  consultarPorCoordenadas,
  consultarPorRC,
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
    const { latitud, longitud } = body;

    if (typeof latitud !== "number" || typeof longitud !== "number") {
      return NextResponse.json({ error: "latitud y longitud requeridos (número)" }, { status: 400 });
    }

    if (latitud < 27 || latitud > 44 || longitud < -19 || longitud > 5) {
      return NextResponse.json({ error: "Coordenadas fuera de España" }, { status: 400 });
    }

    const coordResult = await consultarPorCoordenadas(latitud, longitud);

    if (!coordResult) {
      return NextResponse.json({ error: "No se encontró referencia catastral en esas coordenadas" }, { status: 404 });
    }

    // Consultar datos completos con la RC encontrada
    const datos = await consultarPorRC(coordResult.referenciaCatastral);

    if (esResultadoMultiple(datos)) {
      return NextResponse.json({
        referenciaCatastral: coordResult.referenciaCatastral,
        multiple: true,
        inmuebles: datos.inmuebles,
        count: datos.inmuebles.length,
      });
    }

    return NextResponse.json({
      referenciaCatastral: coordResult.referenciaCatastral,
      datos,
    });
  } catch (error) {
    logger.error({ err: error }, "POST /api/catastro/geocodificar error");
    const msg = (error as Error).message;

    if (msg.includes("no disponible") || msg.includes("timeout")) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }

    return NextResponse.json({ error: "Error al geocodificar" }, { status: 500 });
  }
}
