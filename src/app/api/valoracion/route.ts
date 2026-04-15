import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/rate-limit";
import { valorar, datosZona, type ValoracionInput } from "@/lib/services/valoracion.service";
import logger from "@/lib/logger";
import { z } from "zod";

const valoracionSchema = z.object({
  tipoInmueble: z.string().min(1),
  operacion: z.enum(["venta", "alquiler"]),
  localidad: z.string().min(1),
  codigoPostal: z.string().optional(),
  metrosConstruidos: z.number().int().positive(),
  habitaciones: z.number().int().min(0).optional(),
  banos: z.number().int().min(0).optional(),
  planta: z.number().int().optional(),
  anoConstruccion: z.number().int().optional(),
  latitud: z.number().optional(),
  longitud: z.number().optional(),
  garaje: z.boolean().optional(),
  piscina: z.boolean().optional(),
  terraza: z.boolean().optional(),
  ascensor: z.boolean().optional(),
});

async function _POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rol = (session.user as unknown as { rol: string }).rol;
    if (!["ADMIN", "COORDINADORA", "COMERCIAL"].includes(rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = valoracionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const result = await valorar(parsed.data as ValoracionInput);
    return NextResponse.json({ data: result });
  } catch (error) {
    logger.error({ err: error }, "POST /api/valoracion error");
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

async function _GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const localidad = searchParams.get("localidad");
    const operacion = searchParams.get("operacion") as "venta" | "alquiler" | null;
    if (!localidad || !operacion) {
      return NextResponse.json({ error: "localidad y operacion requeridos" }, { status: 400 });
    }
    const data = await datosZona(localidad, operacion);
    return NextResponse.json({ data });
  } catch (error) {
    logger.error({ err: error }, "GET /api/valoracion error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
export const GET = withRateLimit(_GET);
