import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { generateDescription, translateDescription } from "@/lib/services/ai-description.service";
import type { InmuebleData } from "@/lib/services/ai-description.service";

async function _POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (user.rol !== "ADMIN" && user.rol !== "COORDINADOR") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const idioma: string = body.idioma ?? "es";

    const inm = await prisma.inmueble.findUnique({
      where: { id },
      select: {
        tipo: true,
        operacion: true,
        precio: true,
        metrosConstruidos: true,
        metrosUtiles: true,
        habitaciones: true,
        banos: true,
        planta: true,
        localidad: true,
        direccion: true,
        ascensor: true,
        garaje: true,
        trastero: true,
        piscina: true,
        terraza: true,
        aireAcondicionado: true,
        calefaccion: true,
        certEnergetico: true,
        anoConst: true,
        descripcion: true,
      },
    });

    if (!inm) return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });

    const inmData: InmuebleData = {
      tipo: inm.tipo,
      operacion: inm.operacion,
      precio: Number(inm.precio),
      metrosConstruidos: inm.metrosConstruidos,
      metrosUtiles: inm.metrosUtiles,
      habitaciones: inm.habitaciones,
      banos: inm.banos,
      planta: inm.planta,
      localidad: inm.localidad,
      direccion: inm.direccion,
      extras: {
        ascensor: inm.ascensor,
        garaje: inm.garaje,
        trastero: inm.trastero,
        piscina: inm.piscina,
        terraza: inm.terraza,
        aireAcondicionado: inm.aireAcondicionado,
        calefaccion: inm.calefaccion,
      },
      certEnergetico: inm.certEnergetico,
      anoConst: inm.anoConst,
      descripcionExistente: inm.descripcion,
    };

    if (idioma === "es") {
      const result = await generateDescription(inmData, id);
      return NextResponse.json({
        data: {
          descripcion: result.descripcion,
          idioma: "es",
          proveedor: result.proveedor,
          tokens: result.tokens,
          costEur: result.costEur,
        },
      });
    } else {
      const descripcionEs = inm.descripcion;
      if (!descripcionEs) {
        return NextResponse.json(
          { error: "Genera primero la descripción en español" },
          { status: 400 }
        );
      }
      const result = await translateDescription(descripcionEs, idioma, id);
      return NextResponse.json({
        data: {
          descripcion: result.traduccion,
          idioma,
          proveedor: result.proveedor,
          tokens: result.tokens,
          costEur: result.costEur,
        },
      });
    }
  } catch (error) {
    logger.error({ err: error }, "POST /api/inmuebles/[id]/descripcion error");
    return NextResponse.json({ error: "Error al generar descripción" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
