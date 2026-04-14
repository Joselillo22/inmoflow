import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { enviarRecordatorios } from "@/lib/services/proveedor.service";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (apiKey !== process.env.PORTALES_API_KEY) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const result = await enviarRecordatorios();
    return NextResponse.json({ data: result });
  } catch (error) {
    logger.error({ err: error }, "POST /api/proveedores/recordatorios error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
