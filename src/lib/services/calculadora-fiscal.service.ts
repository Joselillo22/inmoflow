// Última actualización: 10 abril 2026
// Fuente: Ley 5/2025 Comunidad Valenciana
// Próxima revisión: 1 junio 2026 (entrada en vigor tipos reducidos ITP/AJD)

import Redis from "ioredis";
import logger from "@/lib/logger";

const DATOS_FISCALES_CV_2026 = {
  itp: {
    general: 0.10,
    reducido: 0.09, // Desde 1 junio 2026 para inmuebles <1M€
    fechaCambio: "2026-06-01",
    limiteReducido: 1_000_000,
    viviendaHabitual: 0.08,
  },
  ajd: {
    general: 0.015,
    reducido: 0.014, // Desde 1 junio 2026
    fechaCambio: "2026-06-01",
  },
  iva: {
    general: 0.10,
    vpo: 0.04,
  },
  irnr: {
    tipoUE: 0.19,
    tipoNoUE: 0.24,
    coeficienteVCRevisado: 0.011,
    coeficienteVCNoRevisado: 0.02,
  },
  gastosCompra: {
    notariaCoef: 0.003,
    notariaMin: 600,
    notariaMax: 1500,
    registroCoef: 0.002,
    registroMin: 400,
    registroMax: 800,
    gestoria: 400,
  },
  gastosAnuales: {
    ibiCoef: 0.005,
    seguroCoef: 0.002,
    comunidadMes: {
      bajo: 50,    // <100K
      medio: 80,   // 100K-250K
      alto: 150,   // 250K-500K
      premium: 300, // >500K
    },
  },
  paisesUE: new Set([
    "DE", "NL", "FR", "BE", "IT", "PT", "AT", "IE", "LU", "FI",
    "SE", "DK", "PL", "CZ", "HU", "RO", "BG", "HR", "SK", "SI",
    "EE", "LV", "LT", "CY", "MT", "GR",
    "NO", "IS", "LI",
  ]),
} as const;

export interface CalculadoraParams {
  precio: number;
  tipoOperacion: "segunda_mano" | "obra_nueva";
  paisComprador: string;
  moneda?: string;
  valorCatastral?: number;
  viviendaHabitual?: boolean;
}

export interface ResultadoCalculadora {
  precioInmueble: number;
  moneda: string;
  tipoOperacion: string;
  paisComprador: string;
  esUE: boolean;
  costesCompra: {
    impuestoTransmision: { tipo: number; importe: number; nota: string };
    ajd?: { tipo: number; importe: number };
    iva?: { tipo: number; importe: number };
    notaria: number;
    registro: number;
    gestoria: number;
    totalCostesCompra: number;
    totalConPrecio: number;
    porcentajeSobrePrecio: string;
  };
  costesAnuales: {
    ibi: { estimado: number; nota: string };
    irnr: { tipo: number; baseImponible: number; importe: number; nota: string };
    comunidad: { estimadoMes: number; estimadoAnual: number };
    seguro: { estimadoAnual: number };
    totalAnual: number;
    totalMensual: number;
  };
  conversion?: {
    monedaDestino: string;
    tipoCambio: number;
    precioConvertido: number;
    costesCompraConvertido: number;
    costesAnualesConvertido: number;
    fuenteTipoCambio: string;
    fechaTipoCambio: string;
  };
  avisos: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getComunidadMes(precio: number): number {
  const { comunidadMes } = DATOS_FISCALES_CV_2026.gastosAnuales;
  if (precio < 100_000) return comunidadMes.bajo;
  if (precio < 250_000) return comunidadMes.medio;
  if (precio < 500_000) return comunidadMes.alto;
  return comunidadMes.premium;
}

function determinarTipoITP(precio: number, viviendaHabitual: boolean): { tipo: number; nota: string } {
  const hoy = new Date();
  const fechaCambio = new Date(DATOS_FISCALES_CV_2026.itp.fechaCambio);
  const usarReducido = hoy >= fechaCambio && precio < DATOS_FISCALES_CV_2026.itp.limiteReducido;

  if (viviendaHabitual) {
    return { tipo: DATOS_FISCALES_CV_2026.itp.viviendaHabitual, nota: "ITP 8% vivienda habitual (con requisitos de residencia)" };
  }
  if (usarReducido) {
    return { tipo: DATOS_FISCALES_CV_2026.itp.reducido, nota: "ITP reducido 9% (Ley 5/2025, desde 1 junio 2026 para inmuebles <1M€)" };
  }
  return { tipo: DATOS_FISCALES_CV_2026.itp.general, nota: "ITP general 10% (Comunidad Valenciana)" };
}

export function calcularFiscal(params: CalculadoraParams): ResultadoCalculadora {
  const { precio, tipoOperacion, paisComprador, viviendaHabitual = false } = params;
  const esUE = DATOS_FISCALES_CV_2026.paisesUE.has(paisComprador.toUpperCase());
  const valorCatastral = params.valorCatastral ?? precio * 0.5; // Estimación si no se conoce

  const avisos: string[] = [];

  // --- COSTES DE COMPRA ---
  let impuestoTransmision: { tipo: number; importe: number; nota: string };
  let ajdResult: { tipo: number; importe: number } | undefined;
  let ivaResult: { tipo: number; importe: number } | undefined;

  if (tipoOperacion === "segunda_mano") {
    const { tipo, nota } = determinarTipoITP(precio, viviendaHabitual);
    impuestoTransmision = { tipo, importe: Math.round(precio * tipo), nota };

    const hoy = new Date();
    const fechaCambio = new Date(DATOS_FISCALES_CV_2026.ajd.fechaCambio);
    const tipoAjd = hoy >= fechaCambio ? DATOS_FISCALES_CV_2026.ajd.reducido : DATOS_FISCALES_CV_2026.ajd.general;
    ajdResult = { tipo: tipoAjd, importe: Math.round(precio * tipoAjd) };

    const hoy2 = new Date(DATOS_FISCALES_CV_2026.itp.fechaCambio);
    if (new Date() < hoy2 && precio < DATOS_FISCALES_CV_2026.itp.limiteReducido) {
      avisos.push("El ITP bajará del 10% al 9% a partir del 1 de junio de 2026 para inmuebles de menos de 1M€");
    }
  } else {
    const tipoIva = DATOS_FISCALES_CV_2026.iva.general;
    impuestoTransmision = { tipo: tipoIva, importe: Math.round(precio * tipoIva), nota: "IVA 10% obra nueva" };
    ivaResult = impuestoTransmision;

    const tipoAjd = DATOS_FISCALES_CV_2026.ajd.general;
    ajdResult = { tipo: tipoAjd, importe: Math.round(precio * tipoAjd) };
  }

  const g = DATOS_FISCALES_CV_2026.gastosCompra;
  const notaria = clamp(Math.round(precio * g.notariaCoef), g.notariaMin, g.notariaMax);
  const registro = clamp(Math.round(precio * g.registroCoef), g.registroMin, g.registroMax);
  const gestoria = g.gestoria;

  const totalCostesCompra = impuestoTransmision.importe +
    (ajdResult?.importe ?? 0) +
    notaria + registro + gestoria;
  const totalConPrecio = precio + totalCostesCompra;
  const pct = ((totalCostesCompra / precio) * 100).toFixed(1);

  // --- COSTES ANUALES ---
  const ibiEstimado = Math.round(valorCatastral * DATOS_FISCALES_CV_2026.gastosAnuales.ibiCoef);
  const seguroEstimado = Math.round(precio * DATOS_FISCALES_CV_2026.gastosAnuales.seguroCoef);

  const tipoIrnr = esUE
    ? DATOS_FISCALES_CV_2026.irnr.tipoUE
    : DATOS_FISCALES_CV_2026.irnr.tipoNoUE;
  const baseIrnr = Math.round(valorCatastral * DATOS_FISCALES_CV_2026.irnr.coeficienteVCRevisado);
  const irnrImporte = Math.round(baseIrnr * tipoIrnr);

  const comunidadMes = getComunidadMes(precio);
  const totalAnual = ibiEstimado + irnrImporte + (comunidadMes * 12) + seguroEstimado;

  // --- AVISOS ---
  if (esUE) {
    avisos.push(`Como residente en país UE/EEE, tributa al ${(tipoIrnr * 100).toFixed(0)}% de IRNR (Modelo 210 anual)`);
  } else {
    if (paisComprador.toUpperCase() === "GB") {
      avisos.push("Reino Unido ya no es UE (Brexit). Tributa al 24% de IRNR como no residente UE");
    } else {
      avisos.push(`Tributa al ${(tipoIrnr * 100).toFixed(0)}% de IRNR como residente fuera de la UE (Modelo 210 anual)`);
    }
  }
  avisos.push("Necesitará NIE para formalizar la compra. Tramitación: 3-6 semanas");
  avisos.push("Los gastos de comunidad son una estimación. Solicite el certificado al administrador de fincas");

  return {
    precioInmueble: precio,
    moneda: params.moneda ?? "EUR",
    tipoOperacion,
    paisComprador: paisComprador.toUpperCase(),
    esUE,
    costesCompra: {
      impuestoTransmision,
      ajd: ajdResult,
      iva: ivaResult,
      notaria,
      registro,
      gestoria,
      totalCostesCompra,
      totalConPrecio,
      porcentajeSobrePrecio: `${pct}%`,
    },
    costesAnuales: {
      ibi: { estimado: ibiEstimado, nota: "Estimación ~0.5% valor catastral. Varía por municipio." },
      irnr: { tipo: tipoIrnr, baseImponible: baseIrnr, importe: irnrImporte, nota: `IRNR ${(tipoIrnr * 100).toFixed(0)}% (${esUE ? "residente UE/EEE" : "no residente UE"}). Modelo 210 anual.` },
      comunidad: { estimadoMes: comunidadMes, estimadoAnual: comunidadMes * 12 },
      seguro: { estimadoAnual: seguroEstimado },
      totalAnual,
      totalMensual: Math.round(totalAnual / 12),
    },
    avisos,
  };
}

// --- Tipo de cambio via frankfurter.app con cache Redis 1h ---
const MONEDAS_SOPORTADAS = ["GBP", "SEK", "NOK", "CHF", "USD", "DKK", "PLN"];
const REDIS_KEY = "fx:eur:rates";
const REDIS_TTL = 3600;

function getRedis(): Redis {
  return new Redis(
    process.env.REDIS_URL ?? `redis://localhost:${process.env.REDIS_PORT ?? 6382}`
  );
}

export async function getTipoCambio(monedaDestino: string): Promise<{ tasa: number; fecha: string } | null> {
  if (!MONEDAS_SOPORTADAS.includes(monedaDestino.toUpperCase())) return null;

  const redis = getRedis();
  try {
    const cached = await redis.get(REDIS_KEY);
    if (cached) {
      const rates = JSON.parse(cached);
      if (rates[monedaDestino]) {
        return { tasa: rates[monedaDestino], fecha: rates._fecha };
      }
    }

    const res = await fetch(
      `https://api.frankfurter.app/latest?from=EUR&to=${MONEDAS_SOPORTADAS.join(",")}`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) throw new Error("frankfurter.app no disponible");
    const data = await res.json();
    const toSave = { ...data.rates, _fecha: data.date };
    await redis.setex(REDIS_KEY, REDIS_TTL, JSON.stringify(toSave));

    return { tasa: data.rates[monedaDestino], fecha: data.date };
  } catch (err) {
    logger.error({ err }, "Error obteniendo tipo de cambio");
    return null;
  } finally {
    await redis.quit();
  }
}
