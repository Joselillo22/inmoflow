import logger from "@/lib/logger";

const APIFY_BASE = "https://api.apify.com/v2";

function token(): string {
  const t = process.env.APIFY_API_TOKEN;
  if (!t) throw new Error("APIFY_API_TOKEN no configurado");
  return t;
}

export interface ApifyRunSummary {
  id: string;
  status: "READY" | "RUNNING" | "SUCCEEDED" | "FAILED" | "ABORTED" | "TIMING-OUT" | "TIMED-OUT" | "ABORTING";
  actorId: string;
  startedAt: string;
  finishedAt?: string;
  defaultDatasetId?: string;
  stats?: {
    inputBodyLen?: number;
    restartCount?: number;
    resurrectCount?: number;
    durationMillis?: number;
  };
  meta?: Record<string, unknown>;
}

export async function runActor(actorId: string, input: object): Promise<ApifyRunSummary> {
  const res = await fetch(`${APIFY_BASE}/acts/${actorId}/runs?token=${token()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Apify runActor failed: ${res.status} — ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.data as ApifyRunSummary;
}

export async function getRun(runId: string): Promise<ApifyRunSummary> {
  const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${token()}`);
  if (!res.ok) throw new Error(`Apify getRun failed: ${res.status}`);
  const data = await res.json();
  return data.data as ApifyRunSummary;
}

export async function getDatasetItems(datasetId: string, limit = 1000): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?format=json&limit=${limit}&token=${token()}`);
  if (!res.ok) throw new Error(`Apify dataset fetch failed: ${res.status}`);
  return (await res.json()) as Record<string, unknown>[];
}

export function actorIdFor(portal: "IDEALISTA" | "FOTOCASA" | "MILANUNCIOS"): string | null {
  const map: Record<string, string | undefined> = {
    IDEALISTA: process.env.APIFY_ACTOR_IDEALISTA,
    FOTOCASA: process.env.APIFY_ACTOR_FOTOCASA,
    MILANUNCIOS: process.env.APIFY_ACTOR_MILANUNCIOS,
  };
  return map[portal] ?? null;
}

const SEARCH_URLS: Record<string, { VENTA: string; ALQUILER: string }> = {
  IDEALISTA: {
    VENTA: "https://www.idealista.com/venta-viviendas/alicante-provincia/con-publicado_particular/",
    ALQUILER: "https://www.idealista.com/alquiler-viviendas/alicante-provincia/con-publicado_particular/",
  },
  FOTOCASA: {
    VENTA: "https://www.fotocasa.es/es/comprar/viviendas/alicante-provincia/todas-las-zonas/l?publicadores=particulares",
    ALQUILER: "https://www.fotocasa.es/es/alquiler/viviendas/alicante-provincia/todas-las-zonas/l?publicadores=particulares",
  },
  MILANUNCIOS: {
    VENTA: "https://www.milanuncios.com/pisos-en-alicante/?fromSearch=1&vendedor=particular",
    ALQUILER: "https://www.milanuncios.com/alquiler-de-pisos-en-alicante/?fromSearch=1&vendedor=particular",
  },
};

// Algunos actors toman un solo startUrl (fotocasa) — en ese caso hay que lanzar
// un run por cada operación. Esta función devuelve N inputs (N=1 o N=operaciones.length).
export function buildInputsFor(
  portal: "IDEALISTA" | "FOTOCASA" | "MILANUNCIOS",
  operaciones: ("VENTA" | "ALQUILER")[],
  maxItems = 100,
  location = "alicante"
): object[] {
  const actorId = actorIdFor(portal) ?? "";
  const urls = operaciones.map((op) => SEARCH_URLS[portal][op]);

  // igolaizola/idealista-scraper — operation="sale"|"rent", location, propertyType, country
  // Lanza 1 run por operación (sale/rent no se pueden mezclar)
  if (actorId.includes("igolaizola") && actorId.includes("idealista")) {
    return operaciones.map((op) => ({
      location,
      country: "es",
      operation: op === "VENTA" ? "sale" : "rent",
      propertyType: "homes",
      maxItems,
      publishedBy: "particular",
    }));
  }

  // igolaizola/fotocasa-scraper — operation="buy"|"rent", location, propertyType
  if (actorId.includes("igolaizola") && actorId.includes("fotocasa")) {
    return operaciones.map((op) => ({
      location,
      operation: op === "VENTA" ? "buy" : "rent",
      propertyType: "home",
      maxItems,
    }));
  }

  // zen-studio/milanuncios-scraper (paid) → usa startUrls o search query
  if (actorId.includes("zen-studio") && actorId.includes("milanuncios")) {
    return [{
      startUrls: urls.map((url) => ({ url })),
      maxItems,
    }];
  }

  // dz_omar/idealista-scraper-api (free) → Property_urls array + desiredResults
  if (actorId.includes("dz_omar") || actorId.includes("idealista-scraper-api")) {
    return [{
      Property_urls: urls.map((url) => ({ url })),
      desiredResults: maxItems,
    }];
  }

  // azzouzana/fotocasa-...-ppr (free) → startUrl (single) + maxItems → un run por URL
  if (actorId.includes("fotocasa") && actorId.includes("ppr")) {
    return urls.map((url) => ({ startUrl: url, maxItems }));
  }

  // Formato genérico por defecto
  return [{
    startUrls: urls.map((url) => ({ url })),
    maxItems,
    fetchDetails: true,
  }];
}

// ─────────────────────────────────────────────────────────────
// Field mapping resiliente — acepta distintos nombres de campos
// ─────────────────────────────────────────────────────────────

export interface NormalizedItem {
  urlAnuncio?: string;
  titulo?: string;
  descripcionOriginal?: string;
  precio?: number;
  direccionAproximada?: string;
  localidad?: string;
  codigoPostal?: string;
  tipoInmueble?: string;
  habitaciones?: number;
  banos?: number;
  metrosConstruidos?: number;
  planta?: number;
  fotos?: string[];
  nombrePropietario?: string;
  telefonoPropietario?: string;
  emailPropietario?: string;
  extras?: Record<string, boolean>;
  esParticular?: boolean;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}
function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && !isNaN(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/[^0-9.]/g, ""));
      if (!isNaN(n)) return n;
    }
  }
  return undefined;
}
function pickBool(obj: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
    if (typeof v === "string") return v.toLowerCase() === "true" || v === "1";
  }
  return undefined;
}
function pickArray(obj: Record<string, unknown>, ...keys: string[]): string[] | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (Array.isArray(v)) {
      const arr = v.filter((x) => typeof x === "string") as string[];
      if (arr.length > 0) return arr;
    }
  }
  return undefined;
}

export function normalizeRawItem(raw: Record<string, unknown>): NormalizedItem {
  const item: NormalizedItem = {
    urlAnuncio: pickString(raw, "url", "detailUrl", "link", "adUrl", "originalUrl"),
    titulo: pickString(raw, "title", "name", "heading", "adTitle"),
    descripcionOriginal: pickString(raw, "description", "desc", "text", "details"),
    precio: pickNumber(raw, "price", "priceNumber", "priceValue", "amount", "salePrice"),
    direccionAproximada: pickString(raw, "address", "location", "street", "fullAddress"),
    localidad: pickString(raw, "city", "locality", "town", "municipality"),
    codigoPostal: pickString(raw, "postalCode", "zipCode", "cp", "zip"),
    tipoInmueble: pickString(raw, "propertyType", "type", "category", "subcategory"),
    habitaciones: pickNumber(raw, "rooms", "bedrooms", "habitaciones", "numRooms"),
    banos: pickNumber(raw, "bathrooms", "banos", "baths", "numBathrooms"),
    metrosConstruidos: pickNumber(raw, "size", "surface", "area", "sqm", "m2", "sizeBuilt"),
    planta: pickNumber(raw, "floor", "planta", "floorNumber"),
    fotos: pickArray(raw, "images", "photos", "pictures", "imageUrls") ?? (pickString(raw, "image", "thumbnail") ? [pickString(raw, "image", "thumbnail")!] : undefined),
    nombrePropietario: pickString(raw, "contactName", "sellerName", "ownerName", "advertiserName", "publisherName"),
    telefonoPropietario: pickString(raw, "phone", "contactPhone", "ownerPhone", "telephone", "sellerPhone"),
    emailPropietario: pickString(raw, "email", "contactEmail", "ownerEmail"),
  };

  const extras: Record<string, boolean> = {};
  const garaje = pickBool(raw, "garage", "parking", "garaje");
  if (garaje !== undefined) extras.garaje = garaje;
  const piscina = pickBool(raw, "pool", "swimmingPool", "piscina");
  if (piscina !== undefined) extras.piscina = piscina;
  const terraza = pickBool(raw, "terrace", "terraza", "balcony");
  if (terraza !== undefined) extras.terraza = terraza;
  const ascensor = pickBool(raw, "lift", "elevator", "ascensor");
  if (ascensor !== undefined) extras.ascensor = ascensor;
  if (Object.keys(extras).length > 0) item.extras = extras;

  // Detectar si es particular (varía según actor)
  const publisher = pickString(raw, "publisher", "publisherType", "advertiserType", "sellerType");
  if (publisher) {
    const lower = publisher.toLowerCase();
    item.esParticular = lower.includes("particular") || lower.includes("owner") || lower.includes("private");
  }

  return item;
}

export interface ScraperRunConfig {
  portal: "IDEALISTA" | "FOTOCASA" | "MILANUNCIOS";
  operaciones: ("VENTA" | "ALQUILER")[];
}

export async function lanzarScraping(config: ScraperRunConfig): Promise<ApifyRunSummary[]> {
  const actorId = actorIdFor(config.portal);
  if (!actorId) throw new Error(`Actor ID no configurado para ${config.portal}`);
  const inputs = buildInputsFor(config.portal, config.operaciones);
  const runs: ApifyRunSummary[] = [];
  for (const input of inputs) {
    logger.info({ portal: config.portal, actorId, input }, "Lanzando scraper Apify");
    const run = await runActor(actorId, input);
    runs.push(run);
  }
  return runs;
}
