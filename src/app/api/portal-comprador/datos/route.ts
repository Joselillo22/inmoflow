import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "fallback-secret");

async function verifyToken(req: NextRequest): Promise<{ leadId: string; token: string } | null> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? req.nextUrl.searchParams.get("token");
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "portal-comprador") return null;
    return { leadId: payload.leadId as string, token };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const verified = await verifyToken(req);
  if (!verified) {
    return NextResponse.json({ error: "Token requerido o inválido" }, { status: 401 });
  }

  const { leadId, token } = verified;

  const acceso = await prisma.leadAcceso.findUnique({ where: { token } });
  if (!acceso || !acceso.activo || acceso.expiresAt < new Date()) {
    return NextResponse.json({ error: "Acceso revocado o expirado" }, { status: 401 });
  }

  // Update last access
  await prisma.leadAcceso.update({
    where: { id: acceso.id },
    data: { ultimoAcceso: new Date() },
  });

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      nombre: true,
      email: true,
      idioma: true,
      favoritos: true,
      demandas: {
        include: {
          matchings: {
            where: { descartado: false },
            orderBy: { score: "desc" },
            take: 20,
            include: {
              inmueble: {
                select: {
                  id: true,
                  titulo: true,
                  localidad: true,
                  precio: true,
                  habitaciones: true,
                  metrosConstruidos: true,
                  tipo: true,
                  operacion: true,
                  estado: true,
                  fotos: {
                    where: { esPrincipal: true },
                    take: 1,
                    select: { url: true, thumbnailUrl: true },
                  },
                },
              },
            },
          },
        },
      },
      operaciones: {
        where: { estado: { not: "CAIDA" } },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          inmueble: {
            select: {
              titulo: true,
              direccion: true,
              precio: true,
              fotos: {
                where: { esPrincipal: true },
                take: 1,
                select: { url: true },
              },
            },
          },
        },
      },
      visitas: {
        where: { resultado: "PENDIENTE" },
        orderBy: { fecha: "asc" },
        take: 5,
        include: {
          inmueble: {
            select: { titulo: true, direccion: true, localidad: true },
          },
        },
      },
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  // Flatten matchings across all demandas, dedup by inmueble id
  const seenIds = new Set<string>();
  const inmuebles_matching = lead.demandas
    .flatMap((d) =>
      d.matchings.map((m) => ({
        id: m.inmueble.id,
        titulo: m.inmueble.titulo,
        localidad: m.inmueble.localidad,
        precio: Number(m.inmueble.precio),
        habitaciones: m.inmueble.habitaciones,
        metros: m.inmueble.metrosConstruidos,
        tipo: m.inmueble.tipo,
        operacion: m.inmueble.operacion,
        estado: m.inmueble.estado,
        fotoPrincipal: m.inmueble.fotos[0]?.url ?? null,
        score: m.score,
      }))
    )
    .filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    })
    .sort((a, b) => b.score - a.score);

  // Build operacion pipeline if active
  let operacion = null;
  if (lead.operaciones.length > 0) {
    const op = lead.operaciones[0];
    const estadoOrder = ["EN_NEGOCIACION", "OFERTA_ACEPTADA", "ARRAS_FIRMADAS", "PENDIENTE_NOTARIA", "CERRADA"];
    const currentIdx = estadoOrder.indexOf(op.estado);
    operacion = {
      inmueble: {
        titulo: op.inmueble.titulo,
        direccion: op.inmueble.direccion,
        precio: Number(op.inmueble.precio),
        fotoPrincipal: op.inmueble.fotos[0]?.url ?? null,
      },
      estado: op.estado,
      timeline: [
        { paso: "Oferta", fecha: op.fechaOferta?.toISOString() ?? null, completado: currentIdx >= 1 },
        { paso: "Arras", fecha: op.fechaArras?.toISOString() ?? null, completado: currentIdx >= 2 },
        { paso: "Notaría", fecha: null, completado: currentIdx >= 3 },
        { paso: "Entrega llaves", fecha: op.fechaCierre?.toISOString() ?? null, completado: currentIdx >= 4 },
      ],
    };
  }

  // Upcoming visits as citas
  const citas = lead.visitas.map((v) => ({
    id: v.id,
    fecha: v.fecha,
    inmueble: v.inmueble.titulo,
    direccion: v.inmueble.direccion,
    localidad: v.inmueble.localidad,
  }));

  return NextResponse.json({
    comprador: { nombre: lead.nombre, email: lead.email, idioma: lead.idioma },
    inmuebles_matching,
    favoritos: lead.favoritos,
    operacion,
    citas,
  });
}
