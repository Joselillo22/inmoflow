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

  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 401 });
  }

  let propietarioId: string;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "portal-propietario") throw new Error("Invalid type");
    propietarioId = payload.propietarioId as string;
  } catch {
    return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });
  }

  const acceso = await prisma.propietarioAcceso.findUnique({ where: { token } });
  if (!acceso || !acceso.activo || acceso.expiresAt < new Date()) {
    return NextResponse.json({ error: "Acceso revocado o expirado" }, { status: 401 });
  }

  const { id: inmuebleId } = await params;

  const inm = await prisma.inmueble.findFirst({
    where: { id: inmuebleId, propietarioId },
    select: {
      id: true,
      referencia: true,
      titulo: true,
      descripcion: true,
      direccion: true,
      localidad: true,
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
      certEnergetico: true,
      fechaCaptacion: true,
      fotos: {
        orderBy: [{ esPrincipal: "desc" }, { orden: "asc" }],
        select: { id: true, url: true, thumbnailUrl: true, esPrincipal: true, orden: true },
      },
      visitas: {
        orderBy: { fecha: "desc" },
        take: 20,
        select: {
          id: true,
          fecha: true,
          resultado: true,
          notasDespues: true,
          // RGPD: no lead data
        },
      },
      publicaciones: {
        select: { id: true, portal: true, estado: true, ultimaSync: true, errorMsg: true },
      },
      documentos: {
        orderBy: { createdAt: "desc" },
        select: { id: true, tipo: true, nombre: true, url: true, createdAt: true },
      },
      _count: { select: { visitas: true } },
      operaciones: {
        where: { estado: { not: "CAIDA" } },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          tipo: true,
          estado: true,
          precioFinal: true,
          fechaOferta: true,
          fechaArras: true,
          fechaCierre: true,
        },
      },
    },
  });

  if (!inm) {
    return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
  }

  const now = new Date();
  const mesActual = new Date(now.getFullYear(), now.getMonth(), 1);
  const visitasMes = await prisma.visita.count({
    where: { inmuebleId, fecha: { gte: mesActual } },
  });
  const visitasInteresados = await prisma.visita.count({
    where: { inmuebleId, resultado: "REALIZADA_INTERESADO" },
  });
  const diasEnMercado = Math.floor(
    (now.getTime() - new Date(inm.fechaCaptacion).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Build timeline
  const timeline: { fecha: Date; tipo: string; descripcion: string }[] = [];

  inm.visitas.forEach((v) => {
    const resumen =
      v.resultado === "REALIZADA_INTERESADO"
        ? "Visita realizada — cliente interesado"
        : v.resultado === "REALIZADA_NO_INTERESADO"
        ? "Visita realizada — cliente no interesado"
        : v.resultado === "PENDIENTE"
        ? "Visita programada"
        : v.resultado === "CANCELADA"
        ? "Visita cancelada"
        : "Visita — no se presentó";
    timeline.push({ fecha: v.fecha, tipo: "visita", descripcion: resumen });
  });

  inm.publicaciones.forEach((p) => {
    if (p.ultimaSync) {
      timeline.push({
        fecha: p.ultimaSync,
        tipo: "publicacion",
        descripcion: `Publicado en ${p.portal.replace(/_/g, " ")}`,
      });
    }
  });

  inm.operaciones.forEach((op) => {
    if (op.fechaOferta) {
      timeline.push({
        fecha: op.fechaOferta,
        tipo: "oferta",
        descripcion: `Oferta recibida — ${new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(op.precioFinal))}`,
      });
    }
    if (op.fechaArras) {
      timeline.push({ fecha: op.fechaArras, tipo: "arras", descripcion: "Arras firmadas" });
    }
    if (op.fechaCierre) {
      timeline.push({ fecha: op.fechaCierre, tipo: "cierre", descripcion: "Operación cerrada" });
    }
  });

  timeline.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  return NextResponse.json({
    id: inm.id,
    referencia: inm.referencia,
    titulo: inm.titulo,
    descripcion: inm.descripcion,
    direccion: inm.direccion,
    localidad: inm.localidad,
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
      certEnergetico: inm.certEnergetico,
    },
    estadisticas: {
      visitasTotal: inm._count.visitas,
      visitasEsteMes: visitasMes,
      visitasInteresados,
      diasEnMercado,
    },
    fotos: inm.fotos,
    ultimasVisitas: inm.visitas.map((v) => ({
      id: v.id,
      fecha: v.fecha,
      resultado: v.resultado,
      feedbackResumen: v.notasDespues ?? null,
    })),
    publicaciones: inm.publicaciones,
    documentos: inm.documentos,
    operaciones: inm.operaciones.map((op) => ({
      ...op,
      precioFinal: Number(op.precioFinal),
    })),
    timeline: timeline.slice(0, 30),
  });
}
