import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { mkdir, unlink } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_REQUEST = 20;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total

const IMAGE_MAX_WIDTH = 1920;
const IMAGE_QUALITY = 82;
const THUMB_WIDTH = 400;
const THUMB_QUALITY = 70;

// Magic bytes para validar tipo real del archivo
const MAGIC_BYTES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF
};

function validateMagicBytes(buffer: ArrayBuffer, mimeType: string): boolean {
  const expected = MAGIC_BYTES[mimeType];
  if (!expected) return false;
  const bytes = new Uint8Array(buffer.slice(0, expected.length));
  return expected.every((b, i) => bytes[i] === b);
}

async function processImage(buffer: Buffer, id: string, uploadDir: string) {
  const uuid = randomUUID();
  const filename = `${uuid}.webp`;
  const thumbFilename = `${uuid}_thumb.webp`;

  // Imagen principal: resize a max 1920px ancho, convertir a WebP
  await sharp(buffer)
    .resize({ width: IMAGE_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: IMAGE_QUALITY })
    .toFile(join(uploadDir, filename));

  // Thumbnail: 400px ancho, calidad reducida
  await sharp(buffer)
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toFile(join(uploadDir, thumbFilename));

  return {
    url: `/uploads/${id}/${filename}`,
    thumbnailUrl: `/uploads/${id}/${thumbFilename}`,
  };
}

async function _POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que el inmueble existe
    const inmueble = await prisma.inmueble.findUnique({ where: { id }, select: { id: true, comercialId: true } });

    // Audit RGPD
    const reqInfo_POST = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Inmueble", ip: reqInfo_POST.ip, userAgent: reqInfo_POST.userAgent });
    if (!inmueble) {
      return NextResponse.json({ error: "Inmueble no encontrado" }, { status: 404 });
    }

    // IDOR check: comercial solo puede subir fotos a sus inmuebles
    const rol = (session.user as unknown as { rol: string; comercialId: string | null }).rol;
    const comercialId = (session.user as unknown as { comercialId: string | null }).comercialId;
    if (rol === "COMERCIAL" && inmueble.comercialId !== comercialId) {
      return NextResponse.json({ error: "No tienes permiso sobre este inmueble" }, { status: 403 });
    }

    const formData = await req.formData();
    const files = formData.getAll("fotos") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No se han enviado fotos" }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json({ error: `Máximo ${MAX_FILES_PER_REQUEST} archivos por petición` }, { status: 400 });
    }

    // Validar todos los archivos antes de escribir nada
    let totalSize = 0;
    const validatedBuffers: Buffer[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipo de archivo no permitido: ${file.type}. Solo se aceptan JPEG, PNG y WebP.` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Archivo demasiado grande: ${file.name}. Máximo 10MB por archivo.` },
          { status: 400 }
        );
      }

      totalSize += file.size;
      if (totalSize > MAX_TOTAL_SIZE) {
        return NextResponse.json({ error: "Tamaño total excede 50MB" }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();

      if (!validateMagicBytes(arrayBuffer, file.type)) {
        return NextResponse.json(
          { error: `El archivo ${file.name} no es una imagen válida` },
          { status: 400 }
        );
      }

      validatedBuffers.push(Buffer.from(arrayBuffer));
    }

    // Crear directorio y procesar imágenes con sharp
    const uploadDir = join(process.cwd(), "public", "uploads", id);
    await mkdir(uploadDir, { recursive: true });

    const fotos = [];
    const existingCount = await prisma.foto.count({ where: { inmuebleId: id } });

    for (let i = 0; i < validatedBuffers.length; i++) {
      const { url, thumbnailUrl } = await processImage(validatedBuffers[i], id, uploadDir);

      const foto = await prisma.foto.create({
        data: {
          inmuebleId: id,
          url,
          thumbnailUrl,
          orden: existingCount + i,
          esPrincipal: existingCount === 0 && i === 0,
        },
      });

      fotos.push(foto);
    }
return NextResponse.json({ data: fotos }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/inmuebles/[id]/fotos error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const fotoId = searchParams.get("fotoId");
    if (!fotoId) {
      return NextResponse.json({ error: "fotoId requerido" }, { status: 400 });
    }

    const foto = await prisma.foto.findUnique({ where: { id: fotoId } });

    // Audit RGPD
    const reqInfo_DELETE = extractRequestInfo(req.headers);
    await audit({ accion: "ELIMINAR", entidad: "Inmueble", ip: reqInfo_DELETE.ip, userAgent: reqInfo_DELETE.userAgent });
    if (!foto || foto.inmuebleId !== id) {
      return NextResponse.json({ error: "Foto no encontrada en este inmueble" }, { status: 404 });
    }

    // IDOR check
    const rol = (session.user as unknown as { rol: string; comercialId: string | null }).rol;
    if (rol === "COMERCIAL") {
      const inmueble = await prisma.inmueble.findUnique({ where: { id }, select: { comercialId: true } });
      const comercialId = (session.user as unknown as { comercialId: string | null }).comercialId;
      if (inmueble?.comercialId !== comercialId) {
        return NextResponse.json({ error: "No tienes permiso" }, { status: 403 });
      }
    }

    // Eliminar archivo principal + thumbnail
    for (const fileUrl of [foto.url, foto.thumbnailUrl]) {
      if (!fileUrl) continue;
      try {
        await unlink(join(process.cwd(), "public", fileUrl));
      } catch {
        // Archivo ya no existe
      }
    }

    await prisma.foto.delete({ where: { id: fotoId } });
return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "DELETE /api/inmuebles/[id]/fotos error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);

export const DELETE = withRateLimit(_DELETE);
