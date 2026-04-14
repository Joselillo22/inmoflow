import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

async function _POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!["ADMIN", "COORDINADORA"].includes(session.user.rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;
    const trabajo = await prisma.trabajo.findUnique({ where: { id }, select: { id: true } });
    if (!trabajo) return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No se ha enviado archivo" }, { status: 400 });
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo no permitido. Solo JPG, PNG, WebP y PDF." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Archivo demasiado grande (máx 10MB)" }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), "public", "uploads", "trabajos", id);
    await mkdir(uploadDir, { recursive: true });

    const ext = file.name.split(".").pop() ?? "bin";
    const filename = `${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { writeFile } = await import("fs/promises");
    await writeFile(join(uploadDir, filename), buffer);

    const url = `/uploads/trabajos/${id}/${filename}`;
    const adjunto = await prisma.trabajoAdjunto.create({
      data: { trabajoId: id, nombre: file.name, url, tipo: file.type },
    });

    return NextResponse.json({ data: adjunto }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/trabajos/[id]/adjuntos error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const adjuntoId = searchParams.get("adjuntoId");
    if (!adjuntoId) return NextResponse.json({ error: "adjuntoId requerido" }, { status: 400 });

    const adjunto = await prisma.trabajoAdjunto.findUnique({ where: { id: adjuntoId } });
    if (!adjunto) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    try {
      const { unlink } = await import("fs/promises");
      await unlink(join(process.cwd(), "public", adjunto.url));
    } catch { /* file might not exist */ }

    await prisma.trabajoAdjunto.delete({ where: { id: adjuntoId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "DELETE /api/trabajos/[id]/adjuntos error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
export const DELETE = withRateLimit(_DELETE);
