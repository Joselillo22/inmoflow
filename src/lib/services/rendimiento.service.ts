import { prisma } from "@/lib/prisma";
import Redis from "ioredis";
import logger from "@/lib/logger";

const rendLogger = logger.child({ service: "rendimiento" });

function getRedis(): Redis {
  return new Redis(
    process.env.REDIS_URL ?? `redis://localhost:${process.env.REDIS_PORT ?? 6382}`
  );
}

// ─── Tipos ──────────────────────────────────────────────
interface MetricaConVariacion {
  valor: number;
  variacion: number | null; // null si no hay periodo de comparación
}

function m(valor: number, anterior?: number): MetricaConVariacion {
  return {
    valor,
    variacion: anterior !== undefined ? valor - anterior : null,
  };
}

export interface RendimientoComercial {
  comercial: {
    id: string;
    nombre: string;
    zona: string;
    fechaAlta: string;
  };
  periodo: { desde: string; hasta: string };
  funnel: {
    leadsAsignados: MetricaConVariacion;
    leadsContactados: MetricaConVariacion;
    tasaContacto: MetricaConVariacion;
    tiempoMedio1erContacto: MetricaConVariacion; // minutos
    visitasRealizadas: MetricaConVariacion;
    tasaVisita: MetricaConVariacion;
    ofertas: MetricaConVariacion;
    tasaOferta: MetricaConVariacion;
    cierres: MetricaConVariacion;
    tasaCierre: MetricaConVariacion;
  };
  revenue: {
    comisionesTotal: MetricaConVariacion;
    comisionesEmpresa: MetricaConVariacion;
    comisionesComercial: MetricaConVariacion;
  };
  actividad: {
    tareasCompletadas: MetricaConVariacion;
    tareasVencidas: MetricaConVariacion;
    noShows: MetricaConVariacion;
    interacciones: {
      total: number;
      porCanal: Record<string, number>;
    };
  };
  cartera: {
    inmueblesActivos: number;
    inmueblesReservados: number;
  };
  historico: {
    labels: string[];
    cierres: number[];
    visitas: number[];
    leads: number[];
  };
}

export interface RendimientoGlobal {
  periodo: { desde: string; hasta: string };
  totales: {
    leadsAsignados: number;
    leadsContactados: number;
    tasaContactoGlobal: number;
    tiempoMedio1erContacto: number;
    visitasRealizadas: number;
    cierres: number;
    revenueTotal: number;
  };
  comerciales: {
    id: string;
    nombre: string;
    zona: string;
    leadsAsignados: number;
    leadsContactados: number;
    tasaContacto: number;
    visitasRealizadas: number;
    cierres: number;
    revenue: number;
    tiempoMedio1erContacto: number;
  }[];
}

// ─── Queries de métricas para un comercial en un periodo ──
async function getFunnelData(comercialId: string, desde: Date, hasta: Date) {
  // Leads asignados en el periodo
  const leadsAsignados = await prisma.lead.count({
    where: { comercialId, createdAt: { gte: desde, lte: hasta } },
  });

  // Leads contactados (tienen al menos 1 interacción)
  const leadsContactados = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(DISTINCT l.id) as count
    FROM leads l
    INNER JOIN interacciones i ON i."leadId" = l.id
    WHERE l."comercialId" = ${comercialId}
    AND l."createdAt" BETWEEN ${desde} AND ${hasta}
  `;
  const contactados = Number(leadsContactados[0]?.count ?? 0);

  // Tiempo medio 1er contacto (minutos)
  const tiempoResult = await prisma.$queryRaw<[{ avg_minutes: number | null }]>`
    SELECT AVG(EXTRACT(EPOCH FROM (fi.first_interaction - l."createdAt")) / 60) as avg_minutes
    FROM leads l
    INNER JOIN LATERAL (
      SELECT MIN(i.fecha) as first_interaction
      FROM interacciones i WHERE i."leadId" = l.id
    ) fi ON true
    WHERE l."comercialId" = ${comercialId}
    AND l."createdAt" BETWEEN ${desde} AND ${hasta}
    AND fi.first_interaction IS NOT NULL
  `;
  const tiempoMedio = Math.round(Number(tiempoResult[0]?.avg_minutes ?? 0));

  // Visitas realizadas
  const visitasRealizadas = await prisma.visita.count({
    where: {
      comercialId,
      fecha: { gte: desde, lte: hasta },
      resultado: { in: ["REALIZADA_INTERESADO", "REALIZADA_NO_INTERESADO"] },
    },
  });

  // No-shows
  const noShows = await prisma.visita.count({
    where: {
      comercialId,
      fecha: { gte: desde, lte: hasta },
      resultado: "NO_SHOW",
    },
  });

  // Ofertas (operaciones no caídas)
  const ofertas = await prisma.operacion.count({
    where: {
      comercialId,
      createdAt: { gte: desde, lte: hasta },
      estado: { not: "CAIDA" },
    },
  });

  // Cierres
  const cierres = await prisma.operacion.count({
    where: {
      comercialId,
      estado: "CERRADA",
      fechaCierre: { gte: desde, lte: hasta },
    },
  });

  // Revenue
  const revenueResult = await prisma.comision.aggregate({
    where: {
      comercialId,
      createdAt: { gte: desde, lte: hasta },
    },
    _sum: {
      total: true,
      importeEmpresa: true,
      importeComercial: true,
    },
  });

  // Tareas completadas
  const tareasCompletadas = await prisma.tarea.count({
    where: {
      comercialId,
      completada: true,
      completadaAt: { gte: desde, lte: hasta },
    },
  });

  // Tareas vencidas
  const tareasVencidas = await prisma.tarea.count({
    where: {
      comercialId,
      completada: false,
      fechaLimite: { lt: hasta },
    },
  });

  // Interacciones por canal
  const interacciones = await prisma.interaccion.groupBy({
    by: ["canal"],
    where: {
      comercialId,
      fecha: { gte: desde, lte: hasta },
    },
    _count: true,
  });

  const porCanal: Record<string, number> = {};
  let totalInteracciones = 0;
  for (const i of interacciones) {
    porCanal[i.canal] = i._count;
    totalInteracciones += i._count;
  }

  const tasaContacto = leadsAsignados > 0 ? Math.round((contactados / leadsAsignados) * 1000) / 10 : 0;
  const tasaVisita = contactados > 0 ? Math.round((visitasRealizadas / contactados) * 1000) / 10 : 0;
  const tasaOferta = visitasRealizadas > 0 ? Math.round((ofertas / visitasRealizadas) * 1000) / 10 : 0;
  const tasaCierre = ofertas > 0 ? Math.round((cierres / ofertas) * 1000) / 10 : 0;

  return {
    leadsAsignados,
    contactados,
    tasaContacto,
    tiempoMedio,
    visitasRealizadas,
    noShows,
    ofertas,
    tasaOferta,
    cierres,
    tasaCierre,
    tasaVisita,
    revenueTotal: Number(revenueResult._sum.total ?? 0),
    revenueEmpresa: Number(revenueResult._sum.importeEmpresa ?? 0),
    revenueComercial: Number(revenueResult._sum.importeComercial ?? 0),
    tareasCompletadas,
    tareasVencidas,
    totalInteracciones,
    porCanal,
  };
}

// ─── Histórico de los últimos 6 meses ──────────────────
async function getHistorico(comercialId: string) {
  const now = new Date();
  const labels: string[] = [];
  const cierres: number[] = [];
  const visitas: number[] = [];
  const leads: number[] = [];
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    labels.push(meses[d.getMonth()]);

    const [c, v, l] = await Promise.all([
      prisma.operacion.count({
        where: { comercialId, estado: "CERRADA", fechaCierre: { gte: d, lte: fin } },
      }),
      prisma.visita.count({
        where: {
          comercialId,
          fecha: { gte: d, lte: fin },
          resultado: { in: ["REALIZADA_INTERESADO", "REALIZADA_NO_INTERESADO"] },
        },
      }),
      prisma.lead.count({
        where: { comercialId, createdAt: { gte: d, lte: fin } },
      }),
    ]);

    cierres.push(c);
    visitas.push(v);
    leads.push(l);
  }

  return { labels, cierres, visitas, leads };
}

// ─── Rendimiento individual ─────────────────────────────
export async function getRendimientoComercial(
  comercialId: string,
  desde: Date,
  hasta: Date,
  compararDesde?: Date,
  compararHasta?: Date,
): Promise<RendimientoComercial> {
  const start = Date.now();

  // Cache check
  const cacheKey = `rendimiento:${comercialId}:${desde.toISOString().slice(0, 10)}:${hasta.toISOString().slice(0, 10)}`;
  const redis = getRedis();
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      redis.disconnect();
      return JSON.parse(cached);
    }
  } catch { /* ignore */ }

  // Info del comercial
  const comercial = await prisma.comercial.findUnique({
    where: { id: comercialId },
    include: { usuario: { select: { nombre: true, apellidos: true } } },
  });
  if (!comercial) throw new Error("Comercial no encontrado");

  // Datos actuales + comparación + histórico en paralelo
  const [actual, anterior, historico, cartera] = await Promise.all([
    getFunnelData(comercialId, desde, hasta),
    compararDesde && compararHasta ? getFunnelData(comercialId, compararDesde, compararHasta) : undefined,
    getHistorico(comercialId),
    prisma.inmueble.groupBy({
      by: ["estado"],
      where: { comercialId, estado: { in: ["ACTIVO", "RESERVADO"] } },
      _count: true,
    }),
  ]);

  const inmueblesActivos = cartera.find((c) => c.estado === "ACTIVO")?._count ?? 0;
  const inmueblesReservados = cartera.find((c) => c.estado === "RESERVADO")?._count ?? 0;

  const result: RendimientoComercial = {
    comercial: {
      id: comercialId,
      nombre: `${comercial.usuario.nombre} ${comercial.usuario.apellidos}`,
      zona: comercial.zona,
      fechaAlta: comercial.fechaAlta.toISOString(),
    },
    periodo: { desde: desde.toISOString(), hasta: hasta.toISOString() },
    funnel: {
      leadsAsignados: m(actual.leadsAsignados, anterior?.leadsAsignados),
      leadsContactados: m(actual.contactados, anterior?.contactados),
      tasaContacto: m(actual.tasaContacto, anterior?.tasaContacto),
      tiempoMedio1erContacto: m(actual.tiempoMedio, anterior?.tiempoMedio),
      visitasRealizadas: m(actual.visitasRealizadas, anterior?.visitasRealizadas),
      tasaVisita: m(actual.tasaVisita, anterior?.tasaVisita),
      ofertas: m(actual.ofertas, anterior?.ofertas),
      tasaOferta: m(actual.tasaOferta, anterior?.tasaOferta),
      cierres: m(actual.cierres, anterior?.cierres),
      tasaCierre: m(actual.tasaCierre, anterior?.tasaCierre),
    },
    revenue: {
      comisionesTotal: m(actual.revenueTotal, anterior?.revenueTotal),
      comisionesEmpresa: m(actual.revenueEmpresa, anterior?.revenueEmpresa),
      comisionesComercial: m(actual.revenueComercial, anterior?.revenueComercial),
    },
    actividad: {
      tareasCompletadas: m(actual.tareasCompletadas, anterior?.tareasCompletadas),
      tareasVencidas: m(actual.tareasVencidas, anterior?.tareasVencidas),
      noShows: m(actual.noShows, anterior?.noShows),
      interacciones: {
        total: actual.totalInteracciones,
        porCanal: actual.porCanal,
      },
    },
    cartera: { inmueblesActivos, inmueblesReservados },
    historico,
  };

  // Cache: 5 min si incluye hoy, 1h si es periodo cerrado
  const hoy = new Date();
  const ttl = hasta >= hoy ? 300 : 3600;
  try { await redis.set(cacheKey, JSON.stringify(result), "EX", ttl); } catch { /* ignore */ }
  redis.disconnect();

  rendLogger.info({ comercialId, ms: Date.now() - start }, "Rendimiento calculado");
  return result;
}

// ─── Rendimiento global ─────────────────────────────────
export async function getRendimientoGlobal(
  desde: Date,
  hasta: Date,
): Promise<RendimientoGlobal> {
  const start = Date.now();

  const cacheKey = `rendimiento:global:${desde.toISOString().slice(0, 10)}:${hasta.toISOString().slice(0, 10)}`;
  const redis = getRedis();
  try {
    const cached = await redis.get(cacheKey);
    if (cached) { redis.disconnect(); return JSON.parse(cached); }
  } catch { /* ignore */ }

  const comerciales = await prisma.comercial.findMany({
    where: { activo: true },
    include: { usuario: { select: { nombre: true, apellidos: true } } },
  });

  const items = await Promise.all(
    comerciales.map(async (c) => {
      const data = await getFunnelData(c.id, desde, hasta);
      return {
        id: c.id,
        nombre: `${c.usuario.nombre} ${c.usuario.apellidos}`,
        zona: c.zona,
        leadsAsignados: data.leadsAsignados,
        leadsContactados: data.contactados,
        tasaContacto: data.tasaContacto,
        visitasRealizadas: data.visitasRealizadas,
        cierres: data.cierres,
        revenue: data.revenueEmpresa,
        tiempoMedio1erContacto: data.tiempoMedio,
      };
    }),
  );

  const totales = {
    leadsAsignados: items.reduce((s, i) => s + i.leadsAsignados, 0),
    leadsContactados: items.reduce((s, i) => s + i.leadsContactados, 0),
    tasaContactoGlobal: 0,
    tiempoMedio1erContacto: 0,
    visitasRealizadas: items.reduce((s, i) => s + i.visitasRealizadas, 0),
    cierres: items.reduce((s, i) => s + i.cierres, 0),
    revenueTotal: items.reduce((s, i) => s + i.revenue, 0),
  };
  totales.tasaContactoGlobal = totales.leadsAsignados > 0
    ? Math.round((totales.leadsContactados / totales.leadsAsignados) * 1000) / 10
    : 0;
  const tiempos = items.filter((i) => i.tiempoMedio1erContacto > 0);
  totales.tiempoMedio1erContacto = tiempos.length > 0
    ? Math.round(tiempos.reduce((s, i) => s + i.tiempoMedio1erContacto, 0) / tiempos.length)
    : 0;

  const result: RendimientoGlobal = {
    periodo: { desde: desde.toISOString(), hasta: hasta.toISOString() },
    totales,
    comerciales: items,
  };

  const hoy = new Date();
  const ttl = hasta >= hoy ? 300 : 3600;
  try { await redis.set(cacheKey, JSON.stringify(result), "EX", ttl); } catch { /* ignore */ }
  redis.disconnect();

  rendLogger.info({ ms: Date.now() - start }, "Rendimiento global calculado");
  return result;
}

// ─── Mini resumen para el comercial (Mi Día) ────────────
export async function getMiRendimiento(comercialId: string) {
  const now = new Date();
  const mesActual = new Date(now.getFullYear(), now.getMonth(), 1);
  const finMes = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const finMesAnterior = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [actual, anterior] = await Promise.all([
    getFunnelData(comercialId, mesActual, finMes),
    getFunnelData(comercialId, mesAnterior, finMesAnterior),
  ]);

  return {
    mesActual: {
      leads: actual.leadsAsignados,
      visitas: actual.visitasRealizadas,
      cierres: actual.cierres,
    },
    mesAnterior: {
      leads: anterior.leadsAsignados,
      visitas: anterior.visitasRealizadas,
      cierres: anterior.cierres,
    },
    variacion: {
      leads: actual.leadsAsignados - anterior.leadsAsignados,
      visitas: actual.visitasRealizadas - anterior.visitasRealizadas,
      cierres: actual.cierres - anterior.cierres,
    },
  };
}
