import { GoogleGenAI } from "@google/genai";
import logger from "@/lib/logger";

export const ESTILOS_STAGING = {
  moderno: "moderno",
  clasico: "clásico",
  mediterraneo: "mediterráneo",
  minimalista: "minimalista",
  nordico: "nórdico",
} as const;

export const TIPOS_HABITACION = {
  salon: "salón",
  dormitorio: "dormitorio",
  cocina: "cocina",
  comedor: "comedor",
  bano: "baño",
  terraza: "terraza",
  oficina: "oficina",
} as const;

export type EstiloStaging = keyof typeof ESTILOS_STAGING;
export type TipoHabitacion = keyof typeof TIPOS_HABITACION;

export interface StagingOptions {
  estilo: EstiloStaging;
  tipoHabitacion: TipoHabitacion;
}

const ESTILOS_EN: Record<EstiloStaging, string> = {
  moderno: "modern contemporary style with clean lines, neutral tones, designer furniture",
  clasico: "classic elegant style with warm wood tones, traditional furniture, soft lighting",
  mediterraneo: "Mediterranean style with terracotta accents, natural materials, bright and airy",
  minimalista: "minimalist Scandinavian style with white walls, simple furniture, lots of natural light",
  nordico: "Nordic hygge style with cozy textiles, light wood, warm neutral palette",
};

const HABITACIONES_EN: Record<TipoHabitacion, string> = {
  salon: "living room with sofa, coffee table, rug, floor lamp, and wall art",
  dormitorio: "bedroom with bed, nightstands, reading lamps, and soft bedding",
  cocina: "kitchen with modern appliances, fruit bowl, cutting board, and pendant lights",
  comedor: "dining room with dining table, chairs, centerpiece, and pendant light",
  bano: "bathroom with fresh towels, plants, soap dispenser, and decorative mirror",
  terraza: "terrace with outdoor furniture, potted plants, and ambient lighting",
  oficina: "home office with desk, ergonomic chair, bookshelf, and desk lamp",
};

function buildStagingPrompt(options: StagingOptions): string {
  return `Virtually stage this empty ${options.tipoHabitacion} with ${ESTILOS_EN[options.estilo]}.
Add realistic ${HABITACIONES_EN[options.tipoHabitacion]}.

CRITICAL RULES:
1. Keep the original architecture, walls, floor, windows, and ceiling EXACTLY as they are
2. Only ADD furniture and decorative elements — do NOT modify the room structure
3. Furniture must be proportionally correct and realistically placed
4. Lighting must match the existing natural light in the photo
5. Do NOT add people or pets
6. Shadows must be consistent with existing light sources
7. The result must look like a professional real estate photo, not AI-generated
8. Maintain the same camera angle and perspective`;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY no configurada");
  return new GoogleGenAI({ apiKey });
}

export async function stageImage(
  imageBuffer: Buffer,
  mimeType: string,
  options: StagingOptions,
  fotoId: string,
  inmuebleId: string
): Promise<Buffer> {
  const ai = getGeminiClient();
  const prompt = buildStagingPrompt(options);
  const start = Date.now();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBuffer.toString("base64"),
            },
          },
          { text: prompt },
        ],
      },
    ],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

  const duration = Date.now() - start;
  logger.info(
    { fotoId, inmuebleId, estilo: options.estilo, tipoHabitacion: options.tipoHabitacion, duracionMs: duration },
    "Gemini staging completado"
  );

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Gemini no devolvió candidatos");
  }

  const parts = candidates[0].content?.parts;
  if (!parts) throw new Error("Gemini no devolvió partes");

  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }

  throw new Error("Gemini no devolvió imagen en la respuesta");
}
