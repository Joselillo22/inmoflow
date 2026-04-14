import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import logger from "@/lib/logger";

const provLogger = logger.child({ service: "proveedor" });

// ─── Generar referencia TRB-NNN ─────────────────────────
export async function generarReferenciaTrabajo(): Promise<string> {
  const last = await prisma.trabajo.findFirst({
    orderBy: { referencia: "desc" },
    select: { referencia: true },
  });
  const num = last ? parseInt(last.referencia.replace("TRB-", ""), 10) + 1 : 1;
  return `TRB-${String(num).padStart(3, "0")}`;
}

// ─── Token portal proveedor ─────────────────────────────
export async function generarTokenPortal(proveedorId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.proveedorAcceso.create({
    data: { proveedorId, token, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://inmo.eaistudio.es";
  return `${baseUrl}/portal/proveedor/${token}`;
}

// ─── Recalcular valoración media ────────────────────────
export async function recalcularValoracion(proveedorId: string) {
  const result = await prisma.solicitudPresupuesto.aggregate({
    where: { proveedorId, valoracion: { not: null } },
    _avg: { valoracion: true },
    _count: { valoracion: true },
  });

  const totalTrabajos = await prisma.solicitudPresupuesto.count({
    where: { proveedorId, seleccionada: true },
  });

  await prisma.proveedor.update({
    where: { id: proveedorId },
    data: {
      valoracionMedia: result._avg.valoracion ?? 0,
      totalTrabajos,
    },
  });
}

// ─── Enviar recordatorios (llamado por cron) ────────────
export async function enviarRecordatorios(): Promise<{ enviados: number; trabajosPendientes: number }> {
  const ahora = new Date();
  const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);

  // Buscar solicitudes pendientes de respuesta
  const solicitudes = await prisma.solicitudPresupuesto.findMany({
    where: {
      respondida: false,
      enviadaAt: { not: null },
      recordatoriosEnviados: { lt: 3 },
      OR: [
        { ultimoRecordatorio: null },
        { ultimoRecordatorio: { lt: hace24h } },
      ],
      trabajo: {
        estado: { in: ["ENVIADO", "EN_CURSO"] },
        OR: [
          { fechaLimite: null },
          { fechaLimite: { gt: ahora } },
        ],
      },
    },
    include: {
      proveedor: { select: { nombre: true, telefono: true } },
      trabajo: { select: { titulo: true, referencia: true } },
    },
  });

  let enviados = 0;
  const trabajoIds = new Set<string>();

  for (const sol of solicitudes) {
    trabajoIds.add(sol.trabajoId);

    if (sol.proveedor.telefono) {
      try {
        // Importar dinámicamente para no crear dependencia circular
        const { enviarRecordatorioPresupuesto } = await import("./whatsapp.service");
        const portalUrl = await getOrCreatePortalUrl(sol.proveedorId);
        await enviarRecordatorioPresupuesto(
          sol.proveedor.telefono,
          sol.proveedor.nombre,
          sol.trabajo.titulo,
          portalUrl,
        );
        enviados++;
      } catch (e) {
        provLogger.error({ err: e, solicitudId: sol.id }, "Error enviando recordatorio WhatsApp");
      }
    }

    await prisma.solicitudPresupuesto.update({
      where: { id: sol.id },
      data: {
        recordatoriosEnviados: { increment: 1 },
        ultimoRecordatorio: ahora,
      },
    });
  }

  provLogger.info({ enviados, trabajosPendientes: trabajoIds.size }, "Recordatorios enviados");
  return { enviados, trabajosPendientes: trabajoIds.size };
}

// ─── Helper: obtener o crear URL portal ─────────────────
async function getOrCreatePortalUrl(proveedorId: string): Promise<string> {
  const existing = await prisma.proveedorAcceso.findFirst({
    where: { proveedorId, activo: true, expiresAt: { gt: new Date() } },
    select: { token: true },
  });

  if (existing) {
    const baseUrl = process.env.NEXTAUTH_URL ?? "https://inmo.eaistudio.es";
    return `${baseUrl}/portal/proveedor/${existing.token}`;
  }

  return generarTokenPortal(proveedorId);
}

// ─── Enviar solicitudes a proveedores ───────────────────
export async function enviarSolicitudes(
  trabajoId: string,
  solicitudIds: string[],
  via: "whatsapp" | "email" | "manual",
) {
  const trabajo = await prisma.trabajo.findUnique({
    where: { id: trabajoId },
    select: { titulo: true, descripcion: true, referencia: true, fechaLimite: true },
  });
  if (!trabajo) throw new Error("Trabajo no encontrado");

  let enviados = 0;

  for (const solId of solicitudIds) {
    const sol = await prisma.solicitudPresupuesto.findUnique({
      where: { id: solId },
      include: { proveedor: { select: { id: true, nombre: true, telefono: true, email: true } } },
    });
    if (!sol) continue;

    const portalUrl = await getOrCreatePortalUrl(sol.proveedorId);

    if (via === "whatsapp" && sol.proveedor.telefono) {
      try {
        const { enviarSolicitudPresupuesto } = await import("./whatsapp.service");
        await enviarSolicitudPresupuesto(
          sol.proveedor.telefono,
          sol.proveedor.nombre,
          trabajo.titulo,
          trabajo.descripcion ?? "",
          portalUrl,
          trabajo.fechaLimite?.toLocaleDateString("es-ES") ?? "Sin fecha límite",
        );
        enviados++;
      } catch (e) {
        provLogger.error({ err: e, solicitudId: solId }, "Error enviando solicitud WhatsApp");
      }
    }

    await prisma.solicitudPresupuesto.update({
      where: { id: solId },
      data: { enviadaAt: new Date(), enviadaVia: via },
    });
  }

  // Actualizar estado trabajo
  if (enviados > 0) {
    await prisma.trabajo.update({
      where: { id: trabajoId },
      data: { estado: "ENVIADO" },
    });
  }

  return { enviados };
}

// ─── Estadísticas ───────────────────────────────────────
export async function getEstadisticas() {
  const [totalProveedores, solicitudesPendientes, trabajosActivos] = await Promise.all([
    prisma.proveedor.count({ where: { activo: true } }),
    prisma.solicitudPresupuesto.count({ where: { respondida: false, enviadaAt: { not: null } } }),
    prisma.trabajo.count({ where: { estado: { in: ["ENVIADO", "EN_CURSO"] } } }),
  ]);

  // Tiempo medio de respuesta (en horas)
  const respondidas = await prisma.solicitudPresupuesto.findMany({
    where: { respondida: true, enviadaAt: { not: null }, respondidaAt: { not: null } },
    select: { enviadaAt: true, respondidaAt: true },
  });

  let tiempoMedioHoras = 0;
  if (respondidas.length > 0) {
    const total = respondidas.reduce((sum, s) => {
      return sum + (s.respondidaAt!.getTime() - s.enviadaAt!.getTime());
    }, 0);
    tiempoMedioHoras = Math.round(total / respondidas.length / (1000 * 60 * 60));
  }

  // Gasto por categoría
  const gastoRaw = await prisma.trabajo.groupBy({
    by: ["categoria"],
    where: { estado: "ADJUDICADO", importeAdjudicado: { not: null } },
    _sum: { importeAdjudicado: true },
    _count: true,
  });

  const gastoPorCategoria = gastoRaw.map((g) => ({
    categoria: g.categoria,
    total: Number(g._sum.importeAdjudicado ?? 0),
    count: g._count,
  }));

  return {
    totalProveedores,
    solicitudesPendientes,
    trabajosActivos,
    tiempoMedioHoras,
    gastoPorCategoria,
  };
}
