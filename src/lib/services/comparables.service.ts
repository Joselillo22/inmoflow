import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";

const TIPO_NORMALIZADOR: Record<string, string> = {
  // Spanish/Idealista
  piso: "piso", flat: "piso", apartment: "piso", apartamento: "piso",
  casa: "casa", house: "casa", chalet: "chalet", villa: "chalet",
  adosado: "adosado", "semi-detached": "adosado", townhouse: "adosado",
  atico: "atico", "ático": "atico", penthouse: "atico",
  duplex: "duplex", "dúplex": "duplex",
  estudio: "estudio", studio: "estudio",
  // Idealista subcategories
  independanthouse: "chalet", independenthouse: "chalet",
};

function normalizarTipo(raw?: string | null): string | null {
  if (!raw) return null;
  const k = raw.toLowerCase().replace(/[\s_-]/g, "").trim();
  return TIPO_NORMALIZADOR[k] ?? k;
}

function normalizarOperacion(raw?: string | null): string | null {
  if (!raw) return null;
  const k = raw.toLowerCase();
  if (k === "sale" || k === "buy" || k === "venta") return "venta";
  if (k === "rent" || k === "alquiler") return "alquiler";
  return null;
}

/**
 * Importa inmuebles internos de InmoFlow a la tabla de comparables.
 * - Inmuebles ACTIVOS → esVentaReal=false (son anuncios)
 * - Inmuebles con Operacion CERRADA → esVentaReal=true (precio real de cierre)
 */
export async function importarInmueblesInternos(): Promise<{ creados: number; actualizados: number }> {
  const inmuebles = await prisma.inmueble.findMany({
    where: {
      estado: { in: ["ACTIVO", "RESERVADO", "VENDIDO", "ALQUILADO"] },
      precio: { gt: 0 },
    },
    include: {
      operaciones: { where: { estado: "CERRADA" }, take: 1 },
    },
  });

  let creados = 0;
  let actualizados = 0;

  for (const inm of inmuebles) {
    const tipo = normalizarTipo(inm.tipo);
    const operacion = normalizarOperacion(inm.operacion);
    if (!tipo || !operacion) continue;

    const precio = inm.operaciones[0]?.precioFinal ? Number(inm.operaciones[0].precioFinal) : Number(inm.precio);
    const esVentaReal = inm.operaciones.length > 0;
    const m2 = inm.metrosConstruidos ?? null;
    const precioM2 = m2 && m2 > 0 ? precio / m2 : null;

    const data = {
      fuente: "inmoflow",
      fuenteId: inm.id,
      tipoInmueble: tipo,
      operacion,
      precio,
      precioM2,
      metrosConstruidos: inm.metrosConstruidos,
      habitaciones: inm.habitaciones,
      banos: inm.banos,
      planta: inm.planta,
      anoConstruccion: inm.anoConst,
      localidad: inm.localidad,
      codigoPostal: inm.codigoPostal,
      latitud: inm.latitud ?? null,
      longitud: inm.longitud ?? null,
      garaje: !!inm.garaje,
      piscina: !!inm.piscina,
      terraza: !!inm.terraza,
      ascensor: !!inm.ascensor,
      esVentaReal,
      esAnuncioActivo: inm.estado === "ACTIVO" || inm.estado === "RESERVADO",
    };

    const existing = await prisma.comparablesMercado.findFirst({
      where: { fuente: "inmoflow", fuenteId: inm.id },
    });
    if (existing) {
      await prisma.comparablesMercado.update({ where: { id: existing.id }, data });
      actualizados++;
    } else {
      await prisma.comparablesMercado.create({ data });
      creados++;
    }
  }
  logger.info({ creados, actualizados }, "Comparables: inmuebles internos");
  return { creados, actualizados };
}

/**
 * Importa oportunidades de captación activas (no descartadas) a comparables.
 * Fuente = "apify_{portal}" para saber de dónde vino.
 */
export async function importarDesdeCaptacion(): Promise<{ creados: number; actualizados: number }> {
  const oportunidades = await prisma.captacionOportunidad.findMany({
    where: {
      precio: { gt: 0 },
      metrosConstruidos: { gt: 0 },
      estado: { not: "DESCARTADA" },
    },
  });

  let creados = 0;
  let actualizados = 0;

  for (const opp of oportunidades) {
    const tipo = normalizarTipo(opp.tipoInmueble);
    if (!tipo) continue;
    const operacion = opp.operacion === "VENTA" ? "venta" : "alquiler";
    const precio = Number(opp.precio);
    const m2 = opp.metrosConstruidos ?? null;
    const precioM2 = m2 && m2 > 0 ? precio / m2 : null;

    // Intentar extraer lat/lon de extras si no están en columnas directas
    let latitud: number | null = null;
    let longitud: number | null = null;
    const extras = opp.extras as Record<string, unknown> | null;
    if (extras && typeof extras === "object") {
      if (typeof extras.latitud === "number") latitud = extras.latitud;
      if (typeof extras.longitud === "number") longitud = extras.longitud;
    }

    const garaje = !!(extras?.garaje);
    const piscina = !!(extras?.piscina);
    const terraza = !!(extras?.terraza);
    const ascensor = !!(extras?.ascensor);

    const data = {
      fuente: `apify_${opp.portal.toLowerCase()}`,
      fuenteId: opp.id,
      urlAnuncio: opp.urlAnuncio,
      tipoInmueble: tipo,
      operacion,
      precio,
      precioM2,
      metrosConstruidos: opp.metrosConstruidos,
      habitaciones: opp.habitaciones,
      banos: opp.banos,
      planta: opp.planta,
      localidad: opp.localidad ?? "Desconocida",
      codigoPostal: opp.codigoPostal,
      latitud,
      longitud,
      garaje,
      piscina,
      terraza,
      ascensor,
      esVentaReal: false,
      esAnuncioActivo: true,
      fechaPublicacion: opp.fechaDeteccion,
    };

    let existing = null;
    if (opp.urlAnuncio) {
      existing = await prisma.comparablesMercado.findUnique({ where: { urlAnuncio: opp.urlAnuncio } });
    }
    if (!existing) {
      existing = await prisma.comparablesMercado.findFirst({
        where: { fuente: data.fuente, fuenteId: opp.id },
      });
    }

    if (existing) {
      await prisma.comparablesMercado.update({ where: { id: existing.id }, data });
      actualizados++;
    } else {
      try {
        await prisma.comparablesMercado.create({ data });
        creados++;
      } catch {
        // URL duplicada por otro insert concurrente — ignorar
      }
    }
  }
  logger.info({ creados, actualizados }, "Comparables: captación");
  return { creados, actualizados };
}

/**
 * Importa todo: InmoFlow + captación.
 */
export async function importarTodo(): Promise<{ inmoflow: { creados: number; actualizados: number }; captacion: { creados: number; actualizados: number }; total: number }> {
  const inmoflow = await importarInmueblesInternos();
  const captacion = await importarDesdeCaptacion();
  const total = inmoflow.creados + inmoflow.actualizados + captacion.creados + captacion.actualizados;
  return { inmoflow, captacion, total };
}
