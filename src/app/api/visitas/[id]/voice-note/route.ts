import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, canAccessResource } from "@/lib/utils/auth-check";
import { transcribirNotaVisita } from "@/lib/services/transcripcion.service";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB (limite Whisper)

// POST — Subir nota de voz y transcribirla
async function _POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;

    const visita = await prisma.visita.findUnique({
      where: { id },
      select: { comercialId: true },
    });

    if (!visita) return NextResponse.json({ error: "Visita no encontrada" }, { status: 404 });
    if (!canAccessResource(user, visita.comercialId)) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const formData = await req.formData();
    const audio = formData.get("audio") as File | null;

    if (!audio) {
      return NextResponse.json({ error: "No se ha enviado audio" }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: "Audio demasiado grande (max 25MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await audio.arrayBuffer());

    // Guardar archivo de audio
    const audioDir = join(process.cwd(), "public", "audio", "visitas");
    await mkdir(audioDir, { recursive: true });
    const audioFilename = `${randomUUID()}.webm`;
    const audioPath = join(audioDir, audioFilename);
    await writeFile(audioPath, buffer);

    const audioUrl = `/audio/visitas/${audioFilename}`;

    // Actualizar URL del audio en la visita
    await prisma.visita.update({
      where: { id },
      data: { audioUrl },
    });

    // Transcribir
    let transcripcion = "";
    try {
      transcripcion = await transcribirNotaVisita(id, buffer);
    } catch (err) {
      logger.error({ err: err }, "Error transcribiendo audio");
    }

    // Obtener leadId de la visita para registrar interaccion
    const visitaCompleta = await prisma.visita.findUnique({
      where: { id },
      select: { leadId: true, comercialId: true },
    });

    if (visitaCompleta && transcripcion) {
      // Detectar canal del contenido
      let canal: "TELEFONO" | "WHATSAPP" | "EMAIL" | "PRESENCIAL" = "PRESENCIAL";
      const t = transcripcion.toLowerCase();
      if (t.includes("whatsapp") || t.includes("wasa") || t.includes("wasap") || t.includes("mensaje")) {
        canal = "WHATSAPP";
      } else if (t.includes("email") || t.includes("correo") || t.includes("mail")) {
        canal = "EMAIL";
      } else if (t.includes("llam") || t.includes("telefon") || t.includes("hablado por tel")) {
        canal = "TELEFONO";
      }

      await prisma.interaccion.create({
        data: {
          leadId: visitaCompleta.leadId,
          comercialId: visitaCompleta.comercialId,
          canal,
          contenido: `[Nota de voz] ${transcripcion}`,
        },
      });
      logger.info({ visitaId: id, leadId: visitaCompleta.leadId }, "Nota de voz transcrita y registrada en historial");
    }

    return NextResponse.json({
      data: {
        audioUrl,
        transcripcion: transcripcion || null,
      },
    }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/visitas/[id]/voice-note error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
