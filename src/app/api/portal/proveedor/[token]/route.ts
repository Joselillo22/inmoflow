import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import logger from "@/lib/logger";

// GET — validar token, devolver solicitudes pendientes
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const acceso = await prisma.proveedorAcceso.findUnique({
      where: { token },
      include: {
        proveedor: { select: { id: true, nombre: true, contacto: true } },
      },
    });

    if (!acceso || !acceso.activo || acceso.expiresAt < new Date()) {
      return NextResponse.json({ error: "Enlace no válido o expirado" }, { status: 404 });
    }

    // Obtener solicitudes de este proveedor
    const solicitudes = await prisma.solicitudPresupuesto.findMany({
      where: { proveedorId: acceso.proveedorId },
      include: {
        trabajo: {
          select: {
            id: true,
            referencia: true,
            titulo: true,
            descripcion: true,
            categoria: true,
            fechaLimite: true,
            adjuntos: { select: { id: true, nombre: true, url: true, tipo: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      proveedor: acceso.proveedor,
      solicitudes: solicitudes.map((s) => ({
        id: s.id,
        trabajo: s.trabajo,
        respondida: s.respondida,
        importe: s.importe ? Number(s.importe) : null,
        detallePresupuesto: s.detallePresupuesto,
        documentoUrl: s.documentoUrl,
        enviadaAt: s.enviadaAt,
      })),
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/portal/proveedor/[token] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST — enviar presupuesto
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const acceso = await prisma.proveedorAcceso.findUnique({
      where: { token },
      select: { proveedorId: true, activo: true, expiresAt: true },
    });

    if (!acceso || !acceso.activo || acceso.expiresAt < new Date()) {
      return NextResponse.json({ error: "Enlace no válido o expirado" }, { status: 404 });
    }

    const formData = await req.formData();
    const solicitudId = formData.get("solicitudId") as string;
    const importeStr = formData.get("importe") as string;
    const detalle = formData.get("detalle") as string;
    const file = formData.get("documento") as File | null;

    if (!solicitudId || !importeStr) {
      return NextResponse.json({ error: "solicitudId e importe requeridos" }, { status: 400 });
    }

    const importe = parseFloat(importeStr);
    if (isNaN(importe) || importe <= 0) {
      return NextResponse.json({ error: "Importe inválido" }, { status: 400 });
    }

    // Verificar que la solicitud pertenece a este proveedor
    const solicitud = await prisma.solicitudPresupuesto.findUnique({
      where: { id: solicitudId },
    });

    if (!solicitud || solicitud.proveedorId !== acceso.proveedorId) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    if (solicitud.respondida) {
      return NextResponse.json({ error: "Ya has enviado un presupuesto para este trabajo" }, { status: 400 });
    }

    // Subir documento si lo hay
    let documentoUrl: string | undefined;
    if (file && file.size > 0) {
      const uploadDir = join(process.cwd(), "public", "uploads", "presupuestos", solicitudId);
      await mkdir(uploadDir, { recursive: true });
      const ext = file.name.split(".").pop() ?? "bin";
      const filename = `${randomUUID()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { writeFile } = await import("fs/promises");
      await writeFile(join(uploadDir, filename), buffer);
      documentoUrl = `/uploads/presupuestos/${solicitudId}/${filename}`;
    }

    // Actualizar solicitud
    await prisma.solicitudPresupuesto.update({
      where: { id: solicitudId },
      data: {
        respondida: true,
        respondidaAt: new Date(),
        importe,
        detallePresupuesto: detalle || undefined,
        documentoUrl,
      },
    });

    // Actualizar estado trabajo a EN_CURSO si estaba en ENVIADO
    const trabajo = await prisma.trabajo.findUnique({ where: { id: solicitud.trabajoId }, select: { estado: true } });
    if (trabajo?.estado === "ENVIADO") {
      await prisma.trabajo.update({ where: { id: solicitud.trabajoId }, data: { estado: "EN_CURSO" } });
    }

    // Notificar admins
    try {
      const { crearNotificacion } = await import("@/lib/services/notificacion.service");
      const admins = await prisma.usuario.findMany({ where: { rol: "ADMIN", activo: true }, select: { id: true } });
      const prov = await prisma.proveedor.findUnique({ where: { id: acceso.proveedorId }, select: { nombre: true } });
      const trab = await prisma.trabajo.findUnique({ where: { id: solicitud.trabajoId }, select: { titulo: true, referencia: true } });
      for (const admin of admins) {
        await crearNotificacion({
          usuarioId: admin.id,
          tipo: "SISTEMA",
          titulo: `Presupuesto recibido: ${importe.toLocaleString("es-ES")} €`,
          mensaje: `${prov?.nombre} ha enviado su presupuesto para ${trab?.referencia} — ${trab?.titulo}`,
          enlace: "/proveedores",
        });
      }
    } catch { /* ignore notification errors */ }

    return NextResponse.json({ success: true, message: "Presupuesto enviado correctamente" });
  } catch (error) {
    logger.error({ err: error }, "POST /api/portal/proveedor/[token] error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
