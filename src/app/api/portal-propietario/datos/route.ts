import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "fallback-secret");

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token requerido" }, { status: 401 });
  }

  // Verify JWT
  let propietarioId: string;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "portal-propietario") throw new Error("Invalid type");
    propietarioId = payload.propietarioId as string;
  } catch {
    return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });
  }

  // Check acceso is still active in DB
  const acceso = await prisma.propietarioAcceso.findUnique({
    where: { token },
  });
  if (!acceso || !acceso.activo || acceso.expiresAt < new Date()) {
    return NextResponse.json({ error: "Acceso revocado o expirado" }, { status: 401 });
  }

  // Update last access
  await prisma.propietarioAcceso.update({
    where: { id: acceso.id },
    data: { ultimoAcceso: new Date() },
  });

  // Get propietario + inmuebles with all needed data
  const propietario = await prisma.propietario.findUnique({
    where: { id: propietarioId },
    select: {
      nombre: true,
      email: true,
      telefono: true,
      inmuebles: {
        where: { estado: { not: "VENDIDO" } },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          referencia: true,
          titulo: true,
          direccion: true,
          localidad: true,
          precio: true,
          estado: true,
          fechaCaptacion: true,
          fotos: {
            where: { esPrincipal: true },
            take: 1,
            select: { url: true },
          },
          _count: {
            select: { visitas: true },
          },
          visitas: {
            orderBy: { fecha: "desc" },
            take: 10,
            select: {
              id: true,
              fecha: true,
              resultado: true,
              notasDespues: true,
              // RGPD: NO incluir nombre del comprador
            },
          },
          publicaciones: {
            select: {
              portal: true,
              estado: true,
              ultimaSync: true,
            },
          },
          documentos: {
            select: {
              id: true,
              tipo: true,
              nombre: true,
              url: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!propietario) {
    return NextResponse.json({ error: "Propietario no encontrado" }, { status: 404 });
  }

  // Build response with stats and timeline
  const now = new Date();
  const mesActual = new Date(now.getFullYear(), now.getMonth(), 1);

  const inmuebles = await Promise.all(
    propietario.inmuebles.map(async (inm) => {
      const visitasMes = await prisma.visita.count({
        where: { inmuebleId: inm.id, fecha: { gte: mesActual } },
      });

      const diasEnMercado = Math.floor(
        (now.getTime() - new Date(inm.fechaCaptacion).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Build timeline from visitas + publicaciones
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

      timeline.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

      return {
        id: inm.id,
        referencia: inm.referencia,
        titulo: inm.titulo,
        direccion: inm.direccion,
        localidad: inm.localidad,
        precio: Number(inm.precio),
        estado: inm.estado,
        fotoPrincipal: inm.fotos[0]?.url ?? null,
        estadisticas: {
          visitasTotal: inm._count.visitas,
          visitasEsteMes: visitasMes,
          diasEnMercado,
        },
        ultimasVisitas: inm.visitas.map((v) => ({
          fecha: v.fecha,
          resultado: v.resultado,
          feedbackResumen: v.notasDespues ?? null,
        })),
        publicaciones: inm.publicaciones,
        documentos: inm.documentos,
        timeline: timeline.slice(0, 20),
      };
    })
  );

  return NextResponse.json({
    propietario: {
      nombre: propietario.nombre,
      email: propietario.email,
      telefono: propietario.telefono,
    },
    inmuebles,
  });
}
