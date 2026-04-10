import OpenAI from "openai";
import logger from "@/lib/logger";

export interface InmuebleData {
  tipo: string;
  operacion: string;
  precio: number;
  metrosConstruidos?: number | null;
  metrosUtiles?: number | null;
  habitaciones?: number | null;
  banos?: number | null;
  planta?: number | null;
  localidad: string;
  direccion: string;
  extras: {
    ascensor?: boolean | null;
    garaje?: boolean | null;
    trastero?: boolean | null;
    piscina?: boolean | null;
    terraza?: boolean | null;
    aireAcondicionado?: boolean | null;
    calefaccion?: boolean | null;
  };
  certEnergetico?: string | null;
  anoConst?: number | null;
  descripcionExistente?: string | null;
}

export const IDIOMAS_DISPONIBLES = {
  es: "Español",
  en: "English",
  de: "Deutsch",
  nl: "Nederlands",
  fr: "Français",
  sv: "Svenska",
  no: "Norsk",
} as const;

export type IdiomaCode = keyof typeof IDIOMAS_DISPONIBLES;

const IDIOMA_NOMBRES: Record<string, string> = {
  en: "inglés",
  de: "alemán",
  nl: "neerlandés",
  fr: "francés",
  sv: "sueco",
  no: "noruego",
};

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no configurada");
  return new OpenAI({ apiKey });
}

function buildGenerationPrompt(inm: InmuebleData): string {
  const extrasActivos = Object.entries(inm.extras)
    .filter(([, v]) => v === true)
    .map(([k]) => {
      const labels: Record<string, string> = {
        ascensor: "Ascensor",
        garaje: "Garaje",
        trastero: "Trastero",
        piscina: "Piscina",
        terraza: "Terraza",
        aireAcondicionado: "Aire acondicionado",
        calefaccion: "Calefacción",
      };
      return labels[k] ?? k;
    })
    .join(", ");

  return `Eres un experto copywriter inmobiliario especializado en la Costa Blanca, Alicante.
Genera una descripción comercial atractiva para este inmueble.

DATOS DEL INMUEBLE:
- Tipo: ${inm.tipo}
- Operación: ${inm.operacion}
- Precio: ${inm.precio.toLocaleString("es-ES")} €
${inm.metrosConstruidos ? `- Superficie construida: ${inm.metrosConstruidos} m²` : ""}
${inm.metrosUtiles ? `- Superficie útil: ${inm.metrosUtiles} m²` : ""}
${inm.habitaciones ? `- Habitaciones: ${inm.habitaciones}` : ""}
${inm.banos ? `- Baños: ${inm.banos}` : ""}
${inm.planta != null ? `- Planta: ${inm.planta}` : ""}
- Localidad: ${inm.localidad}
${extrasActivos ? `- Extras: ${extrasActivos}` : ""}
${inm.certEnergetico ? `- Certificado energético: ${inm.certEnergetico}` : ""}
${inm.anoConst ? `- Año construcción: ${inm.anoConst}` : ""}
${inm.descripcionExistente ? `\nDESCRIPCIÓN ACTUAL (mejorar esta):\n${inm.descripcionExistente}` : ""}

REGLAS:
1. Máximo 200 palabras
2. Tono profesional pero cálido
3. Destacar los puntos fuertes del inmueble
4. Mencionar la zona/localidad y sus atractivos (playa, servicios, transporte)
5. Si tiene vistas, terraza, piscina o garaje, destacarlo al principio
6. No inventar características que no estén en los datos
7. No mencionar la dirección exacta
8. Incluir un cierre con llamada a la acción suave
9. Escribir en español

Devuelve únicamente el texto de la descripción, sin títulos ni formateo adicional.`;
}

function buildTranslationPrompt(descripcion: string, idiomaDestino: string): string {
  const nombreIdioma = IDIOMA_NOMBRES[idiomaDestino] ?? idiomaDestino;
  return `Traduce el siguiente texto inmobiliario al ${nombreIdioma}.
Mantén el tono comercial y profesional.
Adapta las unidades si es necesario (m² a sq ft para inglés americano/británico).
Usa terminología inmobiliaria local del país de destino.
No traduzcas nombres propios de zonas o calles.

GLOSARIO DE TÉRMINOS SIN TRADUCCIÓN DIRECTA:
- "Comunidad de propietarios" → EN: "Service charges" / DE: "Hausgeld" / NL: "Servicekosten"
- "Escritura pública" → EN: "Title deed" / DE: "Grundbucheintragung" / NL: "Eigendomsakte"
- "Plusvalía" → EN: "Capital gains tax" / DE: "Wertzuwachssteuer" / NL: "Vermogenswinstbelasting"
- "IBI" → EN: "Local property tax" / DE: "Grundsteuer" / NL: "Onroerendezaakbelasting"
- "Nota simple" → EN: "Land registry extract" / DE: "Grundbuchauszug" / NL: "Kadasteruittreksel"

TEXTO A TRADUCIR:
${descripcion}

Devuelve únicamente el texto traducido, sin explicaciones adicionales.`;
}

async function callOpenAI(
  prompt: string,
  temperature: number,
  maxTokens: number,
  inmuebleId: string,
  operacion: string
): Promise<{ text: string; tokens: number; costEur: number }> {
  const client = getOpenAIClient();
  const start = Date.now();

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature,
    max_tokens: maxTokens,
  });

  const tokens = response.usage?.total_tokens ?? 0;
  const costUsd = tokens * 0.00001;
  const costEur = costUsd * 0.92;
  const duration = Date.now() - start;

  logger.info(
    { inmuebleId, operacion, modelo: "gpt-4o", tokens, costEur: costEur.toFixed(4), duracionMs: duration },
    "OpenAI API call"
  );

  return { text: response.choices[0].message.content ?? "", tokens, costEur };
}

export async function generateDescription(
  inm: InmuebleData,
  inmuebleId: string
): Promise<{ descripcion: string; proveedor: string; tokens: number; costEur: number }> {
  const prompt = buildGenerationPrompt(inm);

  let result = await callOpenAI(prompt, 0.7, 1000, inmuebleId, "generate");

  if (!result.text) {
    await new Promise((r) => setTimeout(r, 2000));
    result = await callOpenAI(prompt, 0.7, 1000, inmuebleId, "generate-retry");
  }

  if (!result.text) throw new Error("No se pudo generar la descripción");

  return { descripcion: result.text.trim(), proveedor: "openai/gpt-4o", tokens: result.tokens, costEur: result.costEur };
}

export async function translateDescription(
  descripcion: string,
  idiomaDestino: string,
  inmuebleId: string
): Promise<{ traduccion: string; proveedor: string; tokens: number; costEur: number }> {
  const prompt = buildTranslationPrompt(descripcion, idiomaDestino);

  let result = await callOpenAI(prompt, 0.3, 1500, inmuebleId, `translate-${idiomaDestino}`);

  if (!result.text) {
    await new Promise((r) => setTimeout(r, 2000));
    result = await callOpenAI(prompt, 0.3, 1500, inmuebleId, `translate-${idiomaDestino}-retry`);
  }

  if (!result.text) throw new Error(`No se pudo traducir al ${idiomaDestino}`);

  return { traduccion: result.text.trim(), proveedor: "openai/gpt-4o", tokens: result.tokens, costEur: result.costEur };
}

export async function translateToAllLanguages(
  descripcionEs: string,
  inmuebleId: string
): Promise<Record<string, string>> {
  const idiomas = ["en", "de", "nl", "fr", "sv", "no"];
  const results = await Promise.allSettled(
    idiomas.map((lang) => translateDescription(descripcionEs, lang, inmuebleId))
  );

  const traducciones: Record<string, string> = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      traducciones[idiomas[i]] = r.value.traduccion;
    } else {
      logger.error({ err: r.reason, idioma: idiomas[i], inmuebleId }, "Error traduciendo");
    }
  });

  return traducciones;
}
