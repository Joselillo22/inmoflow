import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/utils/auth-check";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { readFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { stageImage } from "@/lib/services/virtual-staging.service";
import type { EstiloStaging, TipoHabitacion } from "@/lib/services/virtual-staging.service";

const ESTILOS_VALIDOS: EstiloStaging[] = ["moderno", "clasico", "mediterraneo", "minimalista", "nordico"];
const HABITACIONES_VALIDAS: TipoHabitacion[] = ["salon", "dormitorio", "cocina", "comedor", "bano", "terraza", "oficina"];
const MAX_STAGING_POR_INMUEBLE = 5;
const MAX_STAGING_POR_DIA = 20;

async function _POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fotoId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (user.rol !== "ADMIN" && user.rol !== "COORDINADOR") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id: inmuebleId, fotoId } = await params;

    const body = await req.json().catch(() => ({}));
    const estilo = body.estilo as EstiloStaging;
    const tipoHabitacion = body.tipoHabitacion as TipoHabitacion;

    if (!ESTILOS_VALIDOS.includes(estilo)) {
      return NextResponse.json({ error: "Estilo inválido" }, { status: 400 });
    }
    if (!HABITACIONES_VALIDAS.includes(tipoHabitacion)) {
      return NextResponse.json({ error: "Tipo de habitación inválido" }, { status: 400 });
    }

    // Obtener la foto original
    const fotoOriginal = await prisma.foto.findUnique({ where: { id: fotoId } });
    if (!fotoOriginal || fotoOriginal.inmuebleId !== inmuebleId) {
      return NextResponse.json({ error: "Foto no encontrada" }, { status: 404 });
    }
    if (fotoOriginal.staged) {
      return NextResponse.json({ error: "No se puede hacer staging de una foto ya staged" }, { status: 400 });
    }

    // Límite 5 stagings por inmueble
    const stagingCount = await prisma.foto.count({
      where: { inmuebleId, staged: true },
    });
    if (stagingCount >= MAX_STAGING_POR_INMUEBLE) {
      return NextResponse.json(
        { error: `Límite de ${MAX_STAGING_POR_INMUEBLE} stagings por inmueble alcanzado` },
        { status: 429 }
      );
    }

    // Límite 20 stagings por día (global)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const stagingHoy = await prisma.foto.count({
      where: { staged: true, createdAt: { gte: hoy } },
    });
    if (stagingHoy >= MAX_STAGING_POR_DIA) {
      return NextResponse.json(
        { error: "Límite de staging diario alcanzado. Mañana se renueva." },
        { status: 429 }
      );
    }

    // Leer imagen original del filesystem
    const imagePath = join(process.cwd(), "public", fotoOriginal.url);
    let imageBuffer: Buffer;
    try {
      imageBuffer = await readFile(imagePath);
    } catch {
      return NextResponse.json({ error: "No se pudo leer la imagen original" }, { status: 500 });
    }

    // Llamar a Gemini para hacer el staging
    const stagedBuffer = await stageImage(
      imageBuffer,
      "image/webp",
      { estilo, tipoHabitacion },
      fotoId,
      inmuebleId
    );

    // Comprimir con Sharp: WebP, calidad 85, max 2000px
    const uuid = randomUUID();
    const filename = `${uuid}_staged.webp`;
    const thumbFilename = `${uuid}_staged_thumb.webp`;
    const uploadDir = join(process.cwd(), "public", "uploads", inmuebleId);
    await mkdir(uploadDir, { recursive: true });

    await sharp(stagedBuffer)
      .resize({ width: 2000, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(join(uploadDir, filename));

    await sharp(stagedBuffer)
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(join(uploadDir, thumbFilename));

    // Guardar en DB como nueva foto con staged=true
    const existingCount = await prisma.foto.count({ where: { inmuebleId } });
    const nuevaFoto = await prisma.foto.create({
      data: {
        inmuebleId,
        url: `/uploads/${inmuebleId}/${filename}`,
        thumbnailUrl: `/uploads/${inmuebleId}/${thumbFilename}`,
        orden: existingCount,
        esPrincipal: false,
        staged: true,
        estiloStaging: estilo,
        tipoHabitacion,
        originalFotoId: fotoId,
      },
    });

    return NextResponse.json({ data: nuevaFoto }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/inmuebles/[id]/fotos/[fotoId]/staging error");

    const msg = error instanceof Error ? error.message : "Error al generar staging";
    if (msg.includes("safety") || msg.includes("blocked")) {
      return NextResponse.json({ error: "La foto no pudo ser procesada. Prueba con otra." }, { status: 422 });
    }
    return NextResponse.json({ error: "Error al generar staging. Inténtalo de nuevo." }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
