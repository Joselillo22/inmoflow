import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "fallback-secret");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 401 });

  let leadId: string;
  let idioma = "es";
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "portal-comprador") throw new Error();
    leadId = payload.leadId as string;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const acceso = await prisma.leadAcceso.findUnique({ where: { token } });
  if (!acceso || !acceso.activo || acceso.expiresAt < new Date()) {
    return NextResponse.json({ error: "Acceso revocado o expirado" }, { status: 401 });
  }

  // Get lead idioma
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { idioma: true } });
  if (lead) idioma = lead.idioma;

  const { id: inmuebleId } = await params;

  const inm = await prisma.inmueble.findUnique({
    where: { id: inmuebleId },
    select: {
      id: true,
      referencia: true,
      titulo: true,
      descripcion: true,
      descripcionEn: true,
      descripcionDe: true,
      descripcionFr: true,
      descripcionNl: true,
      direccion: true,
      localidad: true,
      provincia: true,
      latitud: true,
      longitud: true,
      precio: true,
      estado: true,
      tipo: true,
      operacion: true,
      habitaciones: true,
      banos: true,
      metrosConstruidos: true,
      metrosUtiles: true,
      planta: true,
      ascensor: true,
      garaje: true,
      trastero: true,
      piscina: true,
      terraza: true,
      aireAcondicionado: true,
      calefaccion: true,
      certEnergetico: true,
      anoConst: true,
      ibiAnual: true,
      comunidadMes: true,
      fotos: {
        orderBy: [{ esPrincipal: "desc" }, { orden: "asc" }],
        select: { id: true, url: true, thumbnailUrl: true, esPrincipal: true },
      },
    },
  });

  if (!inm) return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });

  // Pick description based on lead idioma
  const descMap: Record<string, string | null> = {
    en: inm.descripcionEn,
    de: inm.descripcionDe,
    fr: inm.descripcionFr,
    nl: inm.descripcionNl,
  };
  const descripcionLocalizada = descMap[idioma] ?? inm.descripcion;

  return NextResponse.json({
    id: inm.id,
    referencia: inm.referencia,
    titulo: inm.titulo,
    descripcion: descripcionLocalizada,
    direccion: inm.direccion,
    localidad: inm.localidad,
    provincia: inm.provincia,
    coordenadas: inm.latitud && inm.longitud ? { lat: inm.latitud, lng: inm.longitud } : null,
    precio: Number(inm.precio),
    estado: inm.estado,
    tipo: inm.tipo,
    operacion: inm.operacion,
    caracteristicas: {
      habitaciones: inm.habitaciones,
      banos: inm.banos,
      metrosConstruidos: inm.metrosConstruidos,
      metrosUtiles: inm.metrosUtiles,
      planta: inm.planta,
      ascensor: inm.ascensor,
      garaje: inm.garaje,
      trastero: inm.trastero,
      piscina: inm.piscina,
      terraza: inm.terraza,
      aireAcondicionado: inm.aireAcondicionado,
      calefaccion: inm.calefaccion,
    },
    legal: {
      certEnergetico: inm.certEnergetico,
      anoConst: inm.anoConst,
      ibiAnual: inm.ibiAnual ? Number(inm.ibiAnual) : null,
      comunidadMes: inm.comunidadMes ? Number(inm.comunidadMes) : null,
    },
    fotos: inm.fotos,
    idioma,
  });
}
