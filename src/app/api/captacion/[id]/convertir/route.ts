import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

const TIPO_MAP: Record<string, string> = {
  piso: "PISO", flat: "PISO", apartment: "PISO", apartamento: "PISO",
  casa: "CASA", house: "CASA",
  chalet: "CHALET",
  adosado: "ADOSADO",
  atico: "ATICO", ático: "ATICO", attic: "ATICO",
  duplex: "DUPLEX", dúplex: "DUPLEX",
  estudio: "ESTUDIO", studio: "ESTUDIO",
  local: "LOCAL",
  oficina: "OFICINA", office: "OFICINA",
};

function normalizarTipo(input?: string | null): string {
  if (!input) return "PISO";
  const key = input.toLowerCase().trim();
  return TIPO_MAP[key] ?? "OTRO";
}

async function _POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rol = (session.user as unknown as { rol: string }).rol;
    if (!["ADMIN", "COORDINADORA"].includes(rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;
    const opp = await prisma.captacionOportunidad.findUnique({ where: { id } });
    if (!opp) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    if (opp.inmuebleId) {
      return NextResponse.json({ error: "Esta oportunidad ya está convertida a inmueble", inmuebleId: opp.inmuebleId }, { status: 400 });
    }

    const referencia = `CAP-${Date.now().toString(36).slice(-7).toUpperCase()}`;
    const titulo = opp.titulo ?? `${opp.tipoInmueble ?? "Inmueble"} en ${opp.localidad ?? ""}`.trim();

    const inmueble = await prisma.inmueble.create({
      data: {
        referencia,
        tipo: normalizarTipo(opp.tipoInmueble) as "PISO",
        operacion: (opp.operacion === "ALQUILER" ? "ALQUILER" : "VENTA") as "VENTA",
        estado: "EN_CAPTACION",
        titulo,
        descripcion: opp.descripcionOriginal ?? null,
        precio: opp.precio ?? 1,
        metrosConstruidos: opp.metrosConstruidos ?? null,
        habitaciones: opp.habitaciones ?? null,
        banos: opp.banos ?? null,
        planta: opp.planta ?? null,
        direccion: opp.direccionAproximada ?? "(pendiente)",
        codigoPostal: opp.codigoPostal ?? null,
        localidad: opp.localidad ?? "Alicante",
        provincia: "Alicante",
        comercialId: opp.comercialId ?? null,
      },
    });

    await prisma.captacionOportunidad.update({
      where: { id },
      data: {
        inmuebleId: inmueble.id,
        estado: "MANDATO_FIRMADO",
        fechaMandato: new Date(),
      },
    });

    return NextResponse.json({ data: { oportunidadId: opp.id, inmuebleId: inmueble.id } });
  } catch (error) {
    logger.error({ err: error }, "POST /api/captacion/[id]/convertir error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
