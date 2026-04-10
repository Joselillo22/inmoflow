import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { transcribirAudio } from "@/lib/services/transcripcion.service";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import logger from "@/lib/logger";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user || !user.comercialId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;

    if (!audio) {
      return NextResponse.json({ error: "No se ha enviado audio" }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: "Audio demasiado grande (max 25MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());

    // Guardar archivo
    const audioDir = join(process.cwd(), "public", "audio", "leads");
    await mkdir(audioDir, { recursive: true });
    const audioFilename = `${randomUUID()}.webm`;
    await writeFile(join(audioDir, audioFilename), buffer);
    const audioUrl = `/audio/leads/${audioFilename}`;

    // Transcribir con Whisper
    let transcripcion = "";
    try {
      const result = await transcribirAudio(buffer, `lead-${id}.webm`);
      transcripcion = result.text;
    } catch (err) {
      logger.error({ err }, "Error transcribiendo nota de voz del lead");
    }

    // Detectar canal automaticamente del contenido transcrito
    let canal: "TELEFONO" | "WHATSAPP" | "EMAIL" | "PRESENCIAL" = "PRESENCIAL";
    if (transcripcion) {
      const t = transcripcion.toLowerCase();
      if (t.includes("whatsapp") || t.includes("wasa") || t.includes("wasap") || t.includes("mensaje")) {
        canal = "WHATSAPP";
      } else if (t.includes("email") || t.includes("correo") || t.includes("mail")) {
        canal = "EMAIL";
      } else if (t.includes("llam") || t.includes("telefon") || t.includes("hablado por tel")) {
        canal = "TELEFONO";
      }
    }

    const contenido = transcripcion
      ? `[Nota de voz] ${transcripcion}`
      : `[Nota de voz - audio guardado] ${audioUrl}`;

    await prisma.interaccion.create({
      data: {
        leadId: id,
        comercialId: user.comercialId,
        canal,
        contenido,
      },
    });

    logger.info({ leadId: id, transcribed: !!transcripcion }, "Nota de voz lead procesada");

    return NextResponse.json({
      data: { audioUrl, transcripcion: transcripcion || null },
    }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/leads/[id]/voice-note error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
