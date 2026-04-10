// Servicio de transcripción de notas de voz
// Usa la API de OpenAI Whisper (o compatible)

const WHISPER_API_URL = process.env.WHISPER_API_URL ?? "https://api.openai.com/v1/audio/transcriptions";
const WHISPER_API_KEY = process.env.OPENAI_API_KEY;

export async function transcribirAudio(audioBuffer: Buffer, filename: string): Promise<{
  text: string;
  language: string;
  duration: number;
}> {
  if (!WHISPER_API_KEY) {
    logger.warn("OPENAI_API_KEY no configurada, transcripción deshabilitada");
    return { text: "[Transcripción no disponible — configurar OPENAI_API_KEY]", language: "es", duration: 0 };
  }

  const formData = new FormData();
  const blob = new Blob([audioBuffer as unknown as BlobPart], { type: "audio/webm" });
  formData.append("file", blob, filename);
  formData.append("model", "whisper-1");
  formData.append("language", "es");
  formData.append("response_format", "verbose_json");

  const res = await fetch(WHISPER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHISPER_API_KEY}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.text();
    logger.error({ err: error }, "Whisper API error");
    throw new Error("Error en transcripción");
  }

  const data = await res.json();

  return {
    text: data.text,
    language: data.language ?? "es",
    duration: data.duration ?? 0,
  };
}

// Transcribir y guardar como nota de visita
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";

export async function transcribirNotaVisita(
  visitaId: string,
  audioBuffer: Buffer
): Promise<string> {
  const transcripcion = await transcribirAudio(audioBuffer, `visita-${visitaId}.webm`);

  await prisma.visita.update({
    where: { id: visitaId },
    data: {
      notasDespues: transcripcion.text,
    },
  });

  return transcripcion.text;
}
