import Redis from "ioredis";
import { XMLParser } from "fast-xml-parser";
import logger from "@/lib/logger";

const catastroLogger = logger.child({ service: "catastro" });

// ─── Redis ──────────────────────────────────────────────
function getRedis(): Redis {
  return new Redis(
    process.env.REDIS_URL ?? `redis://localhost:${process.env.REDIS_PORT ?? 6382}`
  );
}

// ─── Tipos ──────────────────────────────────────────────
export interface DatosCatastro {
  referenciaCatastral: string;
  direccion: string;
  tipoVia: string;
  nombreVia: string;
  numero: string;
  bloque?: string;
  escalera?: string;
  planta?: string;
  puerta?: string;
  codigoPostal: string;
  localidad: string;
  provincia: string;
  uso: string;
  superficieConstruida: number;
  anoConstruccion: number;
  coeficienteParticipacion?: number;
  naturaleza: string;
}

export interface DatosCatastroResumen {
  referenciaCatastral: string;
  direccion: string;
  planta?: string;
  puerta?: string;
  codigoPostal: string;
  localidad: string;
}

export interface DatosCatastroMultiple {
  referenciaCatastral14: string;
  inmuebles: DatosCatastroResumen[];
}

// ─── Constantes ─────────────────────────────────────────
const BASE_URL = "https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC";
const CONSULTA_RC = `${BASE_URL}/OVCCallejero.asmx/Consulta_DNPRC`;
const CONSULTA_COORD = `${BASE_URL}/OVCCoordenadas.asmx/Consulta_RCCOOR`;
const CACHE_TTL = 86400; // 24 horas
const TIMEOUT_MS = 5000;

const TIPO_VIA_MAP: Record<string, string> = {
  CL: "Calle", AV: "Avenida", PZ: "Plaza", PS: "Paseo",
  CR: "Carretera", CM: "Camino", RD: "Ronda", TR: "Travesía",
  UR: "Urbanización", PJ: "Pasaje", GV: "Gran Vía", AL: "Alameda",
  GL: "Glorieta", BO: "Barrio", DS: "Diseminado", LG: "Lugar",
  PQ: "Parque", SD: "Senda", VR: "Vereda",
};

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  isArray: (name) => name === "rcdnp" || name === "cons",
});

// ─── Validación ─────────────────────────────────────────
export function validarRC(rc: string): { valida: boolean; error?: string } {
  const clean = rc.replace(/\s/g, "").toUpperCase();
  if (!/^[A-Z0-9]+$/.test(clean)) {
    return { valida: false, error: "Solo caracteres alfanuméricos" };
  }
  if (clean.length !== 14 && clean.length !== 20) {
    return { valida: false, error: "La referencia debe tener 14 o 20 caracteres" };
  }
  return { valida: true };
}

// ─── Formatear dirección ────────────────────────────────
function formatDir(tipoVia: string, nombreVia: string, numero: string, planta?: string, puerta?: string, cp?: string, localidad?: string): string {
  const via = TIPO_VIA_MAP[tipoVia] ?? tipoVia;
  let dir = `${via} ${nombreVia} ${numero}`.trim();

  const partes: string[] = [];
  if (planta && planta !== "0" && planta !== "00") partes.push(`${planta}º`);
  if (puerta) partes.push(puerta);
  if (partes.length) dir += `, ${partes.join(" ")}`;
  if (cp) dir += `, ${cp}`;
  if (localidad) dir += ` ${localidad}`;

  return dir;
}

// ─── Fetch con timeout ──────────────────────────────────
async function fetchCatastro(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Catastro HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Extraer localidad y provincia de la respuesta ──────
function extraerLocalidad(dt: Record<string, unknown>): { localidad: string; provincia: string } {
  const nm = String(dt.nm ?? "");
  const np = String(dt.np ?? "");
  // nm = "ALICANTE/ALACANT", np = "ALICANTE"
  const localidad = nm || np;
  const provincia = np || "";
  return { localidad, provincia };
}

// ─── Parsear inmueble completo (RC 20 chars, nodo bico.bi) ──
function parsearInmuebleCompleto(bi: Record<string, unknown>): DatosCatastro {
  const idbi = (bi.idbi ?? {}) as Record<string, unknown>;
  const rc = (idbi.rc ?? {}) as Record<string, string>;
  const dt = (bi.dt ?? {}) as Record<string, unknown>;
  const debi = (bi.debi ?? {}) as Record<string, unknown>;

  const locs = (dt.locs ?? {}) as Record<string, unknown>;
  const lous = (locs.lous ?? {}) as Record<string, unknown>;
  const lourb = (lous.lourb ?? {}) as Record<string, unknown>;
  const dir = (lourb.dir ?? {}) as Record<string, string>;
  const loint = (lourb.loint ?? {}) as Record<string, string>;
  const { localidad, provincia } = extraerLocalidad(dt as Record<string, unknown>);

  const referenciaCatastral = `${rc.pc1 ?? ""}${rc.pc2 ?? ""}${rc.car ?? ""}${rc.cc1 ?? ""}${rc.cc2 ?? ""}`;
  const tipoVia = String(dir.tv ?? "");
  const nombreVia = String(dir.nv ?? "");
  const numero = String(dir.pnp ?? "");
  const planta = loint.pt ? String(loint.pt).replace(/^0+/, "") || undefined : undefined;
  const puerta = loint.pu ? String(loint.pu) : undefined;
  const escalera = loint.es ? String(loint.es) : undefined;
  const bloque = loint.bq ? String(loint.bq) : undefined;
  const codigoPostal = String(lourb.dp ?? "");

  const datos: DatosCatastro = {
    referenciaCatastral,
    tipoVia,
    nombreVia,
    numero,
    bloque,
    escalera,
    planta,
    puerta,
    codigoPostal,
    localidad,
    provincia,
    uso: String(debi.luso ?? "Desconocido"),
    superficieConstruida: parseInt(String(debi.sfc ?? "0"), 10),
    anoConstruccion: parseInt(String(debi.ant ?? "0"), 10),
    coeficienteParticipacion: debi.cpt ? parseFloat(String(debi.cpt).replace(",", ".")) : undefined,
    naturaleza: String(idbi.cn ?? "UR"),
    direccion: "",
  };
  datos.direccion = formatDir(tipoVia, nombreVia, numero, planta, puerta, codigoPostal, localidad);
  return datos;
}

// ─── Parsear resumen de inmueble (RC 14 chars, nodo lrcdnp.rcdnp) ──
function parsearResumen(rcdnp: Record<string, unknown>): DatosCatastroResumen {
  const rc = (rcdnp.rc ?? {}) as Record<string, string>;
  const dt = (rcdnp.dt ?? {}) as Record<string, unknown>;

  const locs = (dt.locs ?? {}) as Record<string, unknown>;
  const lous = (locs.lous ?? {}) as Record<string, unknown>;
  const lourb = (lous.lourb ?? {}) as Record<string, unknown>;
  const dir = (lourb.dir ?? {}) as Record<string, string>;
  const loint = (lourb.loint ?? {}) as Record<string, string>;
  const { localidad } = extraerLocalidad(dt as Record<string, unknown>);

  const referenciaCatastral = `${rc.pc1 ?? ""}${rc.pc2 ?? ""}${rc.car ?? ""}${rc.cc1 ?? ""}${rc.cc2 ?? ""}`;
  const tipoVia = String(dir.tv ?? "");
  const nombreVia = String(dir.nv ?? "");
  const numero = String(dir.pnp ?? "");
  const planta = loint.pt ? String(loint.pt).replace(/^0+/, "") || undefined : undefined;
  const puerta = loint.pu ? String(loint.pu) : undefined;
  const codigoPostal = String(lourb.dp ?? "");

  return {
    referenciaCatastral,
    direccion: formatDir(tipoVia, nombreVia, numero, planta, puerta, codigoPostal, localidad),
    planta,
    puerta,
    codigoPostal,
    localidad,
  };
}

// ─── Consulta por referencia catastral ──────────────────
export async function consultarPorRC(
  referenciaCatastral: string
): Promise<DatosCatastro | DatosCatastroMultiple> {
  const clean = referenciaCatastral.replace(/\s/g, "").toUpperCase();
  const { valida, error } = validarRC(clean);
  if (!valida) throw new Error(error);

  const redis = getRedis();
  try {
    const cached = await redis.get(`catastro:${clean}`);
    if (cached) {
      catastroLogger.debug({ rc: clean }, "Cache hit catastro");
      redis.disconnect();
      return JSON.parse(cached);
    }
  } catch (e) {
    catastroLogger.warn({ err: e }, "Redis cache read error");
  }

  const start = Date.now();
  const url = `${CONSULTA_RC}?Provincia=&Municipio=&RC=${encodeURIComponent(clean)}`;

  let xmlText: string;
  try {
    xmlText = await fetchCatastro(url);
  } catch (e) {
    redis.disconnect();
    const msg = (e as Error).name === "AbortError"
      ? "Catastro no disponible (timeout)"
      : "Error de conexión con Catastro";
    catastroLogger.error({ err: e, rc: clean, ms: Date.now() - start }, msg);
    throw new Error(msg);
  }

  const parsed = parser.parse(xmlText);
  const duration = Date.now() - start;
  const root = parsed.consulta_dnp ?? parsed;

  // Check errors
  const control = root.control ?? {};
  if (control.cuerr && String(control.cuerr) !== "0") {
    const errNode = root.lerr?.err;
    const errDesc = errNode ? String(errNode.des ?? "Error desconocido") : "Referencia catastral no encontrada";
    redis.disconnect();
    catastroLogger.info({ rc: clean, error: errDesc, ms: duration }, "Catastro: error");
    throw new Error(errDesc);
  }

  // Case 1: RC 20 chars → bico.bi with full details
  if (root.bico) {
    const bi = root.bico.bi as Record<string, unknown>;
    const datos = parsearInmuebleCompleto(bi);

    try { await redis.set(`catastro:${clean}`, JSON.stringify(datos), "EX", CACHE_TTL); } catch { /* ignore */ }
    redis.disconnect();
    catastroLogger.info({ rc: clean, localidad: datos.localidad, sfc: datos.superficieConstruida, ms: duration }, "Catastro: consulta OK");
    return datos;
  }

  // Case 2: RC 14 chars → lrcdnp.rcdnp[] list of subunits
  if (root.lrcdnp?.rcdnp) {
    const rcdnpList = Array.isArray(root.lrcdnp.rcdnp) ? root.lrcdnp.rcdnp : [root.lrcdnp.rcdnp];

    // If only 1 result, fetch full details with 20-char RC
    if (rcdnpList.length === 1) {
      const resumen = parsearResumen(rcdnpList[0]);
      redis.disconnect();
      // Re-query with full 20-char RC for complete data
      return consultarPorRC(resumen.referenciaCatastral);
    }

    const inmuebles = rcdnpList.map((r: Record<string, unknown>) => parsearResumen(r));
    const result: DatosCatastroMultiple = {
      referenciaCatastral14: clean,
      inmuebles,
    };

    try { await redis.set(`catastro:${clean}`, JSON.stringify(result), "EX", CACHE_TTL); } catch { /* ignore */ }
    redis.disconnect();
    catastroLogger.info({ rc: clean, count: inmuebles.length, ms: duration }, "Catastro: múltiples inmuebles");
    return result;
  }

  redis.disconnect();
  throw new Error("Referencia catastral no encontrada");
}

// ─── Consulta por coordenadas ───────────────────────────
export async function consultarPorCoordenadas(
  lat: number,
  lng: number
): Promise<{ referenciaCatastral: string; direccion: string } | null> {
  // IMPORTANTE: Coordenada_X = longitud, Coordenada_Y = latitud
  const url = `${CONSULTA_COORD}?SRS=EPSG:4326&Coordenada_X=${lng}&Coordenada_Y=${lat}`;

  const start = Date.now();
  let xmlText: string;
  try {
    xmlText = await fetchCatastro(url);
  } catch (e) {
    catastroLogger.error({ err: e, lat, lng, ms: Date.now() - start }, "Catastro geocodificación error");
    throw new Error("Catastro no disponible");
  }

  const parsed = parser.parse(xmlText);
  const duration = Date.now() - start;
  const root = parsed.consulta_coordenadas ?? parsed;

  const coord = root.coordenadas?.coord;
  if (!coord) {
    catastroLogger.info({ lat, lng, ms: duration }, "Catastro: sin resultado para coordenadas");
    return null;
  }

  const pc = coord.pc ?? {};
  const rc = `${pc.pc1 ?? ""}${pc.pc2 ?? ""}`;
  if (!rc || rc.length < 14) return null;

  catastroLogger.info({ lat, lng, rc, ms: duration }, "Catastro: geocodificación OK");
  return {
    referenciaCatastral: rc,
    direccion: String(coord.ldt ?? ""),
  };
}

// ─── Helper: es resultado múltiple ──────────────────────
export function esResultadoMultiple(
  result: DatosCatastro | DatosCatastroMultiple
): result is DatosCatastroMultiple {
  return "inmuebles" in result;
}
