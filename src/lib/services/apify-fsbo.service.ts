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
  zonas: string[] = ["alicante"]
): object[] {
  const actorId = actorIdFor(portal) ?? "";
  const urls = operaciones.map((op) => SEARCH_URLS[portal][op]);

  // igolaizola/idealista-scraper — operation="sale"|"rent", location, propertyType, country
  // Lanza 1 run por (zona × operación)
  if (actorId.includes("igolaizola") && actorId.includes("idealista")) {
    const inputs: object[] = [];
    for (const zona of zonas) {
      for (const op of operaciones) {
        inputs.push({
          location: zona,
          country: "es",
          operation: op === "VENTA" ? "sale" : "rent",
          propertyType: "homes",
          maxItems,
        });
      }
    }
    return inputs;
  }

  // igolaizola/fotocasa-scraper — operation="buy"|"rent", location, propertyType
  if (actorId.includes("igolaizola") && actorId.includes("fotocasa")) {
    const inputs: object[] = [];
    for (const zona of zonas) {
      for (const op of operaciones) {
        inputs.push({
          location: zona,
          operation: op === "VENTA" ? "buy" : "rent",
          propertyType: "home",
          maxItems,
        });
      }
    }
    return inputs;
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
  operacionDetectada?: "VENTA" | "ALQUILER";
  latitud?: number;
  longitud?: number;
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

function getNested(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function pickStringDeep(obj: Record<string, unknown>, ...paths: string[]): string | undefined {
  for (const p of paths) {
    const v = getNested(obj, p);
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}
function pickNumberDeep(obj: Record<string, unknown>, ...paths: string[]): number | undefined {
  for (const p of paths) {
    const v = getNested(obj, p);
    if (typeof v === "number" && !isNaN(v)) return v;
    if (typeof v === "string") {
      const n = parseFloat(v.replace(/[^0-9.]/g, ""));
      if (!isNaN(n)) return n;
    }
  }
  return undefined;
}
function pickBoolDeep(obj: Record<string, unknown>, ...paths: string[]): boolean | undefined {
  for (const p of paths) {
    const v = getNested(obj, p);
    if (typeof v === "boolean") return v;
  }
  return undefined;
}

// Fotocasa propertySubtype codes → tipo InmoFlow
const FOTOCASA_SUBTIPOS: Record<string, string> = {
  "1": "piso", "2": "atico", "3": "duplex", "4": "estudio", "5": "loft",
  "6": "apartamento", "7": "chalet", "8": "adosado", "9": "adosado",
  "10": "casa", "11": "casa", "13": "casa", "52": "atico",
};

function detectarEsFotocasa(raw: Record<string, unknown>): boolean {
  // Fotocasa items tienen propertyId + location.level5Name + transaction objects
  return !!(raw.propertyId && raw.transaction && typeof (raw as { transaction?: { type?: string } }).transaction?.type === "string");
}

export function normalizeRawItem(raw: Record<string, unknown>): NormalizedItem {
  // Fotos: handle multiple shapes
  let fotos: string[] | undefined;
  const mmImages = getNested(raw, "multimedia.images");
  if (Array.isArray(mmImages)) {
    fotos = mmImages.map((im) => (typeof im === "string" ? im : (im as { url?: string })?.url)).filter((x): x is string => typeof x === "string");
  } else if (Array.isArray(raw.multimedia)) {
    // Fotocasa: multimedia es array de {url} o strings directos
    fotos = (raw.multimedia as unknown[]).map((im) => (typeof im === "string" ? im : (im as { url?: string; src?: string })?.url ?? (im as { url?: string; src?: string })?.src)).filter((x): x is string => typeof x === "string");
  } else {
    fotos = pickArray(raw, "images", "photos", "pictures", "imageUrls");
  }
  if ((!fotos || fotos.length === 0)) {
    const thumb = pickString(raw, "thumbnail", "image");
    if (thumb) fotos = [thumb];
  }

  const esFotocasa = detectarEsFotocasa(raw);

  // Construir dirección para Fotocasa: street + number
  let direccionFotocasa: string | undefined;
  if (esFotocasa) {
    const street = pickString(raw, "street");
    const num = pickString(raw, "number");
    if (street) direccionFotocasa = num ? `${street}, ${num}` : street;
  }

  // Resolver tipoInmueble para Fotocasa desde propertySubtype numérico
  let tipoFotocasa: string | undefined;
  if (esFotocasa) {
    const subtype = pickString(raw, "propertySubtype");
    if (subtype && FOTOCASA_SUBTIPOS[subtype]) tipoFotocasa = FOTOCASA_SUBTIPOS[subtype];
    else tipoFotocasa = "piso"; // fallback
  }

  const item: NormalizedItem = {
    urlAnuncio: pickStringDeep(raw, "url", "detailUrl", "link", "adUrl", "originalUrl"),
    titulo: pickStringDeep(raw, "title", "name", "heading", "adTitle", "suggestedTexts.title"),
    descripcionOriginal: pickStringDeep(raw, "description", "desc", "text", "details"),
    precio: pickNumberDeep(raw, "transaction.price", "price", "priceNumber", "priceValue", "amount", "salePrice", "priceInfo.price.amount"),
    direccionAproximada: direccionFotocasa ?? pickStringDeep(raw, "address", "location", "street", "fullAddress"),
    localidad: pickStringDeep(raw, "location.level5Name", "location.level7Name", "municipality", "city", "locality", "town"),
    codigoPostal: pickStringDeep(raw, "postalCode", "zipCode", "cp", "zip"),
    tipoInmueble: tipoFotocasa ?? pickStringDeep(raw, "propertyType", "detailedType.typology", "type", "category", "subcategory"),
    habitaciones: pickNumberDeep(raw, "rooms", "bedrooms", "habitaciones", "numRooms"),
    banos: pickNumberDeep(raw, "baths", "bathrooms", "banos", "numBathrooms"),
    metrosConstruidos: pickNumberDeep(raw, "surface", "size", "area", "sqm", "m2", "sizeBuilt"),
    planta: pickNumberDeep(raw, "floor", "planta", "floorNumber"),
    fotos,
    nombrePropietario: pickStringDeep(raw, "agency.name", "contactInfo.contactName", "contactInfo.commercialName", "contactName", "sellerName", "ownerName", "advertiserName", "publisherName"),
    telefonoPropietario: pickStringDeep(raw, "phone", "contactInfo.phone1.phoneNumberForMobileDialing", "contactInfo.phone1.formattedPhone", "contactPhone", "ownerPhone", "telephone", "sellerPhone"),
    emailPropietario: pickStringDeep(raw, "contactInfo.email", "email", "contactEmail", "ownerEmail"),
  };

  // Autogenerar titulo si no viene
  if (!item.titulo && item.tipoInmueble && (item.direccionAproximada || item.localidad)) {
    const tipo = item.tipoInmueble.charAt(0).toUpperCase() + item.tipoInmueble.slice(1);
    const zona = item.direccionAproximada ?? item.localidad;
    item.titulo = `${tipo} en ${zona}`;
  }

  const extras: Record<string, boolean> = {};
  const garaje = pickBoolDeep(raw, "parkingSpace.hasParkingSpace", "features.hasParking", "hasParkingSpace", "garage", "parking", "garaje");
  if (garaje !== undefined) extras.garaje = garaje;
  const piscina = pickBoolDeep(raw, "features.hasSwimmingPool", "hasSwimmingPool", "pool", "piscina");
  if (piscina !== undefined) extras.piscina = piscina;
  const terraza = pickBoolDeep(raw, "features.hasTerrace", "hasTerrace", "terrace", "terraza", "balcony");
  if (terraza !== undefined) extras.terraza = terraza;
  const ascensor = pickBoolDeep(raw, "hasLift", "features.hasLift", "lift", "elevator", "ascensor");
  if (ascensor !== undefined) extras.ascensor = ascensor;
  const aire = pickBoolDeep(raw, "features.hasAirConditioning", "hasAirConditioning");
  if (aire !== undefined) extras.aireAcondicionado = aire;
  if (Object.keys(extras).length > 0) item.extras = extras;

  // Detectar si es particular
  // igolaizola idealista: contactInfo.userType → "private" | "professional"
  // fotocasa: agency.type → "private" | "professional"
  const userType = pickStringDeep(raw, "contactInfo.userType", "agency.type", "userType", "publisher", "publisherType", "advertiserType", "sellerType");
  if (userType) {
    const lower = userType.toLowerCase();
    item.esParticular = lower === "private" || lower.includes("particular") || lower.includes("owner");
  }

  // Detectar operación desde el raw
  // igolaizola idealista: "operation" = "sale"|"rent"
  // fotocasa: "transaction.type" = "SALE"|"RENT" (mayúsculas)
  const op = pickStringDeep(raw, "operation", "transaction.type");
  if (op) {
    const lower = op.toLowerCase();
    if (lower === "sale" || lower === "buy" || lower === "venta") item.operacionDetectada = "VENTA";
    else if (lower === "rent" || lower === "alquiler") item.operacionDetectada = "ALQUILER";
  }

  // Lat/lon
  const lat = pickNumberDeep(raw, "latitude", "location.latitude", "lat", "latitud");
  const lng = pickNumberDeep(raw, "longitude", "location.longitude", "lng", "lon", "longitud");
  if (typeof lat === "number") item.latitud = lat;
  if (typeof lng === "number") item.longitud = lng;

  return item;
}

export interface ScraperRunConfig {
  portal: "IDEALISTA" | "FOTOCASA" | "MILANUNCIOS";
  operaciones: ("VENTA" | "ALQUILER")[];
  zonas?: string[];
}

export async function lanzarScraping(config: ScraperRunConfig): Promise<ApifyRunSummary[]> {
  const actorId = actorIdFor(config.portal);
  if (!actorId) throw new Error(`Actor ID no configurado para ${config.portal}`);
  const zonas = config.zonas && config.zonas.length > 0 ? config.zonas : ["alicante"];
  const inputs = buildInputsFor(config.portal, config.operaciones, 100, zonas);
  const runs: ApifyRunSummary[] = [];
  for (const input of inputs) {
    logger.info({ portal: config.portal, actorId, input }, "Lanzando scraper Apify");
    const run = await runActor(actorId, input);
    runs.push(run);
  }
  return runs;
}
