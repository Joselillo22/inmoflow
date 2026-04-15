import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";
import type { Prisma } from "@prisma/client";

export interface ValoracionInput {
  tipoInmueble: string;
  operacion: "venta" | "alquiler";
  localidad: string;
  codigoPostal?: string;
  metrosConstruidos: number;
  habitaciones?: number;
  banos?: number;
  planta?: number;
  anoConstruccion?: number;
  latitud?: number;
  longitud?: number;
  garaje?: boolean;
  piscina?: boolean;
  terraza?: boolean;
  ascensor?: boolean;
}

export interface ComparableResumen {
  id: string;
  fuente: string;
  urlAnuncio: string | null;
  precio: number;
  precioM2: number;
  metros: number | null;
  habitaciones: number | null;
  localidad: string;
  distanciaKm?: number;
  esVentaReal: boolean;
  fechaPublicacion: string | null;
}

export interface ValoracionResult {
  precioEstimado: number;
  precioM2Estimado: number;
  rangoMin: number;
  rangoMax: number;
  confianza: "alta" | "media" | "baja";
  numComparables: number;
  numVentasReales: number;
  comparables: ComparableResumen[];
  datosZona: {
    precioM2Medio: number;
    precioM2Mediana: number;
    numAnunciosActivos: number;
    tendencia3m: number;
  };
  fuente: string;
  fecha: string;
  ajusteAplicado: number;
}

function mediana(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function media(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function mediaPonderada(items: { value: number; weight: number }[]): number {
  const totalWeight = items.reduce((a, b) => a + b.weight, 0);
  if (totalWeight === 0) return 0;
  return items.reduce((a, b) => a + b.value * b.weight, 0) / totalWeight;
}

function normalizarTipo(raw?: string | null): string | null {
  if (!raw) return null;
  const mapa: Record<string, string> = {
    piso: "piso", flat: "piso", apartment: "piso",
    casa: "casa", house: "casa", chalet: "chalet", villa: "chalet",
    adosado: "adosado",
    atico: "atico", "ático": "atico",
    duplex: "duplex", "dúplex": "duplex",
    estudio: "estudio", studio: "estudio",
    independanthouse: "chalet", independenthouse: "chalet",
  };
  return mapa[raw.toLowerCase().trim()] ?? raw.toLowerCase().trim();
}

async function buscarPorPostGIS(input: ValoracionInput, radioKm: number, maxItems = 30): Promise<Array<Record<string, unknown> & { distancia_km: number }>> {
  if (!input.latitud || !input.longitud) return [];
  const tipo = normalizarTipo(input.tipoInmueble);
  const metrosMin = Math.round(input.metrosConstruidos * 0.6);
  const metrosMax = Math.round(input.metrosConstruidos * 1.4);
  const radioMetros = radioKm * 1000;

  const rows = await prisma.$queryRaw<Array<Record<string, unknown> & { distancia_km: number }>>`
    SELECT id, fuente, "urlAnuncio", precio, "precioM2", "metrosConstruidos", habitaciones, localidad, "esVentaReal", "fechaPublicacion",
      ST_Distance(
        ST_MakePoint(longitud, latitud)::geography,
        ST_MakePoint(${input.longitud}, ${input.latitud})::geography
      ) / 1000 AS distancia_km
    FROM comparables_mercado
    WHERE "tipoInmueble" = ${tipo}
      AND operacion = ${input.operacion}
      AND "metrosConstruidos" BETWEEN ${metrosMin} AND ${metrosMax}
      AND "esAnuncioActivo" = true
      AND latitud IS NOT NULL
      AND longitud IS NOT NULL
      AND ST_DWithin(
        ST_MakePoint(longitud, latitud)::geography,
        ST_MakePoint(${input.longitud}, ${input.latitud})::geography,
        ${radioMetros}
      )
    ORDER BY distancia_km ASC
    LIMIT ${maxItems}
  `;
  return rows;
}

async function buscarPorLocalidad(input: ValoracionInput, maxItems = 30): Promise<Prisma.ComparablesMercadoGetPayload<object>[]> {
  const tipo = normalizarTipo(input.tipoInmueble);
  const metrosMin = Math.round(input.metrosConstruidos * 0.6);
  const metrosMax = Math.round(input.metrosConstruidos * 1.4);

  const where: Prisma.ComparablesMercadoWhereInput = {
    tipoInmueble: tipo ?? undefined,
    operacion: input.operacion,
    esAnuncioActivo: true,
    metrosConstruidos: { gte: metrosMin, lte: metrosMax },
  };
  if (input.codigoPostal) {
    where.codigoPostal = input.codigoPostal;
  } else {
    where.localidad = { contains: input.localidad, mode: "insensitive" };
  }

  return await prisma.comparablesMercado.findMany({
    where,
    orderBy: [{ esVentaReal: "desc" }, { createdAt: "desc" }],
    take: maxItems,
  });
}

function calcularAjuste(input: ValoracionInput, anoMedioComps?: number): number {
  let ajuste = 1.0;

  if (input.anoConstruccion && anoMedioComps) {
    const dif = anoMedioComps - input.anoConstruccion;
    if (dif > 0) ajuste -= dif * 0.005;
    else if (dif < 0) ajuste += Math.abs(dif) * 0.003;
    ajuste = Math.max(0.8, Math.min(1.2, ajuste));
  }

  if (input.planta && input.planta > 1) {
    ajuste += (input.planta - 1) * 0.02;
    ajuste = Math.min(ajuste, 1.15);
  }

  if (input.garaje) ajuste += 0.03;
  if (input.piscina) ajuste += 0.05;
  if (input.terraza) ajuste += 0.02;
  if (input.ascensor) ajuste += 0.01;

  return ajuste;
}

export async function valorar(input: ValoracionInput): Promise<ValoracionResult> {
  const tipo = normalizarTipo(input.tipoInmueble);
  if (!tipo || !input.metrosConstruidos || input.metrosConstruidos <= 0) {
    throw new Error("tipoInmueble y metrosConstruidos son obligatorios");
  }

  // Nivel 1: mismo CP + mismo tipo + misma operación
  let comparablesRaw: Array<Record<string, unknown>> = [];
  if (input.codigoPostal) {
    const nivel1 = await buscarPorLocalidad({ ...input, codigoPostal: input.codigoPostal }, 20);
    comparablesRaw = nivel1 as unknown as Array<Record<string, unknown>>;
  }

  // Nivel 2: localidad entera si pocos resultados
  if (comparablesRaw.length < 5) {
    const nivel2 = await buscarPorLocalidad({ ...input, codigoPostal: undefined }, 30);
    comparablesRaw = nivel2 as unknown as Array<Record<string, unknown>>;
  }

  // Nivel 3: radio geográfico
  if (comparablesRaw.length < 5 && input.latitud && input.longitud) {
    const nivel3 = await buscarPorPostGIS(input, 3, 30);
    comparablesRaw = nivel3;
  }

  // Calcular €/m² base con ponderación
  const filtrados = comparablesRaw
    .filter((c) => (typeof c.precioM2 === "object" ? c.precioM2 !== null : !!c.precioM2))
    .map((c: Record<string, unknown>) => ({
      id: String(c.id ?? ""),
      fuente: String(c.fuente ?? ""),
      urlAnuncio: c.urlAnuncio ? String(c.urlAnuncio) : null,
      localidad: String(c.localidad ?? ""),
      precioM2Num: Number(c.precioM2 ?? (c.precio && c.metrosConstruidos ? Number(c.precio) / Number(c.metrosConstruidos) : 0)),
      precioNum: Number(c.precio),
      anoConst: c.anoConstruccion != null ? Number(c.anoConstruccion) : null,
      esVentaReal: !!c.esVentaReal,
      metrosConstruidos: c.metrosConstruidos != null ? Number(c.metrosConstruidos) : null,
      habitaciones: c.habitaciones != null ? Number(c.habitaciones) : null,
      distancia_km: typeof c.distancia_km === "number" ? c.distancia_km : undefined,
      fechaPublicacion: c.fechaPublicacion ?? null,
    }));

  const ventasReales = filtrados.filter((c) => c.esVentaReal);
  const anuncios = filtrados.filter((c) => !c.esVentaReal);

  let precioM2Base: number;
  if (ventasReales.length >= 3) {
    precioM2Base = mediana(ventasReales.map((c) => c.precioM2Num));
  } else if (filtrados.length > 0) {
    const ponderados = [
      ...ventasReales.map((c) => ({ value: c.precioM2Num, weight: 3 })),
      ...anuncios.map((c) => ({ value: c.precioM2Num, weight: 1 })),
    ];
    precioM2Base = mediaPonderada(ponderados);
  } else {
    precioM2Base = 0;
  }

  // Ajuste por características
  const anos = filtrados.map((c) => c.anoConst).filter((x): x is number => typeof x === "number");
  const anoMedio = anos.length > 0 ? media(anos) : undefined;
  const ajuste = calcularAjuste(input, anoMedio);

  const precioM2Ajustado = precioM2Base * ajuste;
  const precioEstimado = Math.round(precioM2Ajustado * input.metrosConstruidos);

  // Confianza
  let confianza: "alta" | "media" | "baja";
  if (filtrados.length >= 10 && ventasReales.length >= 3) confianza = "alta";
  else if (filtrados.length >= 5) confianza = "media";
  else confianza = "baja";

  // Datos de zona — todos los comparables de la zona (sin filtrar por tamaño)
  const zonaAll = await prisma.comparablesMercado.findMany({
    where: {
      localidad: { contains: input.localidad, mode: "insensitive" },
      operacion: input.operacion,
      esAnuncioActivo: true,
      precioM2: { not: null },
    },
    select: { precioM2: true, createdAt: true },
    take: 500,
  });
  const precioM2Zona = zonaAll.map((z) => Number(z.precioM2));

  // Tendencia: comparar con hace 3 meses
  const hace3m = new Date();
  hace3m.setMonth(hace3m.getMonth() - 3);
  const zonaRecent = zonaAll.filter((z) => z.createdAt > hace3m).map((z) => Number(z.precioM2));
  const zonaOlder = zonaAll.filter((z) => z.createdAt <= hace3m).map((z) => Number(z.precioM2));
  let tendencia3m = 0;
  if (zonaRecent.length > 3 && zonaOlder.length > 3) {
    const recentMed = mediana(zonaRecent);
    const olderMed = mediana(zonaOlder);
    if (olderMed > 0) tendencia3m = Math.round(((recentMed - olderMed) / olderMed) * 1000) / 10;
  }

  // Ordenar comparables por relevancia (ventas reales > más cercanos en m²)
  const comparablesOrdenados = [...filtrados].sort((a, b) => {
    if (a.esVentaReal !== b.esVentaReal) return a.esVentaReal ? -1 : 1;
    const da = Math.abs((a.metrosConstruidos ?? 0) - input.metrosConstruidos);
    const db = Math.abs((b.metrosConstruidos ?? 0) - input.metrosConstruidos);
    return da - db;
  }).slice(0, 10);

  const result: ValoracionResult = {
    precioEstimado,
    precioM2Estimado: Math.round(precioM2Ajustado),
    rangoMin: Math.round(precioEstimado * 0.9),
    rangoMax: Math.round(precioEstimado * 1.1),
    confianza,
    numComparables: filtrados.length,
    numVentasReales: ventasReales.length,
    comparables: comparablesOrdenados.map((c) => ({
      id: c.id,
      fuente: c.fuente,
      urlAnuncio: c.urlAnuncio,
      precio: c.precioNum,
      precioM2: Math.round(c.precioM2Num),
      metros: c.metrosConstruidos,
      habitaciones: c.habitaciones,
      localidad: c.localidad,
      distanciaKm: c.distancia_km !== undefined ? Math.round(c.distancia_km * 10) / 10 : undefined,
      esVentaReal: c.esVentaReal,
      fechaPublicacion: c.fechaPublicacion ? new Date(c.fechaPublicacion as string | Date).toISOString() : null,
    })),
    datosZona: {
      precioM2Medio: Math.round(media(precioM2Zona)),
      precioM2Mediana: Math.round(mediana(precioM2Zona)),
      numAnunciosActivos: zonaAll.length,
      tendencia3m,
    },
    ajusteAplicado: Math.round((ajuste - 1) * 1000) / 10,
    fuente: `InmoFlow AVM — ${filtrados.length} comparables en ${input.localidad}`,
    fecha: new Date().toISOString(),
  };

  logger.info({ input, numComparables: filtrados.length, precioEstimado, confianza }, "Valoración calculada");
  return result;
}

export async function datosZona(localidad: string, operacion: "venta" | "alquiler"): Promise<{ precioM2Medio: number; precioM2Mediana: number; numAnunciosActivos: number; tendencia3m: number; tendencia12m: number }> {
  const all = await prisma.comparablesMercado.findMany({
    where: {
      localidad: { contains: localidad, mode: "insensitive" },
      operacion,
      esAnuncioActivo: true,
      precioM2: { not: null },
    },
    select: { precioM2: true, createdAt: true },
    take: 1000,
  });
  const values = all.map((x) => Number(x.precioM2));
  const hace3m = new Date(); hace3m.setMonth(hace3m.getMonth() - 3);
  const hace12m = new Date(); hace12m.setMonth(hace12m.getMonth() - 12);

  const trend = (cutoff: Date): number => {
    const recent = all.filter((a) => a.createdAt > cutoff).map((a) => Number(a.precioM2));
    const older = all.filter((a) => a.createdAt <= cutoff).map((a) => Number(a.precioM2));
    if (recent.length < 3 || older.length < 3) return 0;
    const rMed = mediana(recent), oMed = mediana(older);
    return oMed > 0 ? Math.round(((rMed - oMed) / oMed) * 1000) / 10 : 0;
  };

  return {
    precioM2Medio: Math.round(media(values)),
    precioM2Mediana: Math.round(mediana(values)),
    numAnunciosActivos: all.length,
    tendencia3m: trend(hace3m),
    tendencia12m: trend(hace12m),
  };
}
