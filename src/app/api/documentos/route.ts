import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE = 10 * 1024 * 1024;

async function _POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const inmuebleId = formData.get("inmuebleId") as string;
    const tipo = (formData.get("tipo") as string) ?? "otro";
    const nombre = (formData.get("nombre") as string) ?? file?.name ?? "documento";

    if (!file || !inmuebleId) {
      return NextResponse.json({ error: "file e inmuebleId requeridos" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Archivo demasiado grande (máx 10MB)" }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), "public", "uploads", "documentos", inmuebleId);
    await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop() ?? "bin";
    const filename = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { writeFile } = await import("fs/promises");
    await writeFile(join(uploadDir, filename), buffer);

    const url = `/uploads/documentos/${inmuebleId}/${filename}`;
    const doc = await prisma.documento.create({
      data: { inmuebleId, tipo, nombre, url },
    });

    return NextResponse.json({ data: doc }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/documentos error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    const doc = await prisma.documento.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    try {
      const { unlink } = await import("fs/promises");
      await unlink(join(process.cwd(), "public", doc.url));
    } catch { /* file might not exist */ }

    await prisma.documento.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "DELETE /api/documentos error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
export const DELETE = withRateLimit(_DELETE);
