import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/rate-limit";
import { getRun, getDatasetItems, normalizeRawItem } from "@/lib/services/apify-fsbo.service";
import logger from "@/lib/logger";

interface ProcessBody {
  runId: string;
  portal: "IDEALISTA" | "FOTOCASA" | "MILANUNCIOS";
  operacion?: "VENTA" | "ALQUILER";
}

async function _POST(req: NextRequest) {
  try {
    const session = await auth();
    const apiKey = req.headers.get("x-api-key");
    const isInternal = apiKey && apiKey === process.env.PORTALES_API_KEY;

    if (!isInternal) {
      if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      const rol = (session.user as unknown as { rol: string }).rol;
      if (!["ADMIN", "COORDINADORA"].includes(rol)) {
        return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
      }
    }

    const body = (await req.json()) as ProcessBody;
    if (!body.runId || !body.portal) {
      return NextResponse.json({ error: "runId y portal requeridos" }, { status: 400 });
    }

    const run = await getRun(body.runId);
    if (run.status !== "SUCCEEDED") {
      return NextResponse.json({ error: `Run no completado. Estado: ${run.status}` }, { status: 400 });
    }
    if (!run.defaultDatasetId) {
      return NextResponse.json({ error: "Run sin dataset" }, { status: 400 });
    }

    const items = await getDatasetItems(run.defaultDatasetId);
    logger.info({ runId: body.runId, count: items.length }, "Procesando dataset Apify");

    let creadas = 0;
    let actualizadas = 0;
    let duplicadas = 0;
    let saltadas = 0;

    for (const raw of items) {
      const norm = normalizeRawItem(raw);

      // Solo particulares
      if (norm.esParticular === false) {
        saltadas++;
        continue;
      }

      // Debe tener al menos URL o título para ser útil
      if (!norm.urlAnuncio && !norm.titulo) {
        saltadas++;
        continue;
      }

      // Dedup por URL (única constraint)
      if (norm.urlAnuncio) {
        const existing = await prisma.captacionOportunidad.findUnique({ where: { urlAnuncio: norm.urlAnuncio } });
        if (existing) {
          // Actualizar precio si cambió + contador + ultimaDeteccion
          const updates: Record<string, unknown> = {
            vecesDetectada: { increment: 1 },
            ultimaDeteccion: new Date(),
          };
          if (norm.precio && existing.precio && Number(existing.precio) !== norm.precio) {
            const historial = (Array.isArray(existing.historialPrecios) ? existing.historialPrecios : []) as { fecha: string; precio: number }[];
            updates.historialPrecios = [...historial, { fecha: new Date().toISOString(), precio: Number(existing.precio) }];
            updates.precio = norm.precio;
          }
          await prisma.captacionOportunidad.update({ where: { id: existing.id }, data: updates });
          actualizadas++;
          continue;
        }
      }

      // Dedup cruzada por dirección + precio ±5%
      let posibleDuplicadoId: string | null = null;
      if (norm.direccionAproximada && norm.precio) {
        const margen = norm.precio * 0.05;
        const similar = await prisma.captacionOportunidad.findFirst({
          where: {
            direccionAproximada: { contains: norm.direccionAproximada, mode: "insensitive" },
            precio: { gte: norm.precio - margen, lte: norm.precio + margen },
            portal: { not: body.portal },
            estado: { not: "DESCARTADA" },
          },
        });
        if (similar) {
          posibleDuplicadoId = similar.id;
          duplicadas++;
        }
      }

      const operacion = body.operacion ?? (norm.tipoInmueble?.toLowerCase().includes("alquiler") ? "ALQUILER" : "VENTA");

      await prisma.captacionOportunidad.create({
        data: {
          urlAnuncio: norm.urlAnuncio ?? undefined,
          portal: body.portal,
          operacion,
          titulo: norm.titulo,
          descripcionOriginal: norm.descripcionOriginal,
          precio: norm.precio,
          precioOriginal: norm.precio,
          direccionAproximada: norm.direccionAproximada,
          localidad: norm.localidad,
          codigoPostal: norm.codigoPostal,
          tipoInmueble: norm.tipoInmueble,
          habitaciones: norm.habitaciones,
          banos: norm.banos,
          metrosConstruidos: norm.metrosConstruidos,
          planta: norm.planta,
          extras: (norm.extras as object | undefined) ?? undefined,
          fotos: norm.fotos ? (norm.fotos as unknown as object) : undefined,
          nombrePropietario: norm.nombrePropietario,
          telefonoPropietario: norm.telefonoPropietario,
          emailPropietario: norm.emailPropietario,
          posibleDuplicadoId: posibleDuplicadoId ?? undefined,
        },
      });
      creadas++;
    }

    // Notificar al admin
    const admins = await prisma.usuario.findMany({ where: { rol: "ADMIN" }, select: { id: true } });
    for (const a of admins) {
      await prisma.notificacion.create({
        data: {
          usuarioId: a.id,
          tipo: "CAPTACION",
          titulo: `Scraper ${body.portal} completado`,
          mensaje: `${creadas} nuevas · ${actualizadas} actualizadas · ${duplicadas} posibles duplicados`,
          enlace: "/captacion",
        },
      }).catch(() => {});
    }

    logger.info({ creadas, actualizadas, duplicadas, saltadas }, "Dataset procesado");

    return NextResponse.json({
      runId: body.runId,
      portal: body.portal,
      totalItems: items.length,
      creadas,
      actualizadas,
      duplicadas,
      saltadas,
    });
  } catch (error) {
    logger.error({ err: error }, "POST /api/captacion/scraper/process error");
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
