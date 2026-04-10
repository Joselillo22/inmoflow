import { prisma } from "@/lib/prisma";

interface CrearNotificacionInput {
  usuarioId: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  enlace?: string;
  entidadTipo?: string;
  entidadId?: string;
}

export async function crearNotificacion(input: CrearNotificacionInput) {
  return prisma.notificacion.create({ data: input });
}

// Notificar a todos los admins
export async function notificarAdmins(data: Omit<CrearNotificacionInput, "usuarioId">) {
  const admins = await prisma.usuario.findMany({
    where: { rol: "ADMIN", activo: true },
    select: { id: true },
  });
  for (const admin of admins) {
    await crearNotificacion({ ...data, usuarioId: admin.id });
  }
}

// Notificar al comercial de un lead
export async function notificarComercialDeLead(leadId: string, data: Omit<CrearNotificacionInput, "usuarioId">) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { comercialId: true, comercial: { select: { usuarioId: true } } },
  });
  if (lead?.comercial?.usuarioId) {
    await crearNotificacion({ ...data, usuarioId: lead.comercial.usuarioId });
  }
}

// ═══════════════════════════════════════
// NOTIFICACIONES ESPECIFICAS
// ═══════════════════════════════════════

export async function notifLeadAsignado(leadId: string, leadNombre: string, comercialUsuarioId: string) {
  await crearNotificacion({
    usuarioId: comercialUsuarioId,
    tipo: "LEAD_ASIGNADO",
    titulo: "Nuevo lead asignado",
    mensaje: `Se te ha asignado el lead ${leadNombre}. Contactalo lo antes posible.`,
    enlace: "/leads",
    entidadTipo: "lead",
    entidadId: leadId,
  });
}

export async function notifVisitaManana(visitaId: string, comercialUsuarioId: string, leadNombre: string, inmuebleTitulo: string, hora: string) {
  await crearNotificacion({
    usuarioId: comercialUsuarioId,
    tipo: "VISITA_MANANA",
    titulo: "Visita programada manana",
    mensaje: `Tienes una visita manana a las ${hora} con ${leadNombre} en ${inmuebleTitulo}.`,
    enlace: "/calendario",
    entidadTipo: "visita",
    entidadId: visitaId,
  });
}

export async function notifTareaVencida(tareaId: string, comercialUsuarioId: string, descripcion: string) {
  await crearNotificacion({
    usuarioId: comercialUsuarioId,
    tipo: "TAREA_VENCIDA",
    titulo: "Tarea vencida",
    mensaje: `La tarea "${descripcion}" ha superado su fecha limite.`,
    enlace: "/mi-dia",
    entidadTipo: "tarea",
    entidadId: tareaId,
  });
}

export async function notifOperacionAvance(operacionId: string, nuevoEstado: string, comercialUsuarioId: string, inmuebleTitulo: string) {
  const estadoLabels: Record<string, string> = {
    OFERTA_ACEPTADA: "Oferta aceptada",
    ARRAS_FIRMADAS: "Arras firmadas",
    PENDIENTE_NOTARIA: "Pendiente de notaria",
    CERRADA: "Cerrada",
    CAIDA: "Caida",
  };
  await crearNotificacion({
    usuarioId: comercialUsuarioId,
    tipo: "OPERACION_AVANCE",
    titulo: `Operacion: ${estadoLabels[nuevoEstado] ?? nuevoEstado}`,
    mensaje: `La operacion de ${inmuebleTitulo} ha avanzado a "${estadoLabels[nuevoEstado] ?? nuevoEstado}".`,
    enlace: "/operaciones",
    entidadTipo: "operacion",
    entidadId: operacionId,
  });
}

export async function notifKYCPendiente(propietarioNombre: string, operacionId: string) {
  await notificarAdmins({
    tipo: "KYC_PENDIENTE",
    titulo: "KYC pendiente en operacion",
    mensaje: `El propietario ${propietarioNombre} no tiene KYC verificado y tiene una operacion activa >10.000EUR.`,
    enlace: "/kyc",
    entidadTipo: "operacion",
    entidadId: operacionId,
  });
}

export async function notifLeadSinContactar(leadId: string, leadNombre: string) {
  await notificarAdmins({
    tipo: "LEAD_SIN_CONTACTAR",
    titulo: "Lead sin contactar",
    mensaje: `El lead ${leadNombre} lleva mas de 5 minutos sin ser contactado.`,
    enlace: "/leads",
    entidadTipo: "lead",
    entidadId: leadId,
  });
}

// Detectar tareas vencidas (para cron)
export async function detectarTareasVencidas() {
  const now = new Date();
  const tareasVencidas = await prisma.tarea.findMany({
    where: {
      completada: false,
      fechaLimite: { lt: now },
      // Solo las que vencieron en las ultimas 24h (para no repetir)
      AND: {
        fechaLimite: { gt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      },
    },
    include: {
      comercial: { select: { usuarioId: true } },
    },
  });

  let notificadas = 0;
  for (const tarea of tareasVencidas) {
    // Verificar que no existe ya notificacion para esta tarea
    const existing = await prisma.notificacion.findFirst({
      where: { entidadTipo: "tarea", entidadId: tarea.id, tipo: "TAREA_VENCIDA" },
    });
    if (!existing) {
      await notifTareaVencida(tarea.id, tarea.comercial.usuarioId, tarea.descripcion);
      notificadas++;
    }
  }
  return { detectadas: tareasVencidas.length, notificadas };
}

// Detectar visitas de manana (para cron 20:00)
export async function notificarVisitasManana() {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  manana.setHours(0, 0, 0, 0);
  const mananaFin = new Date(manana);
  mananaFin.setHours(23, 59, 59, 999);

  const visitas = await prisma.visita.findMany({
    where: { fecha: { gte: manana, lte: mananaFin }, resultado: "PENDIENTE" },
    include: {
      lead: { select: { nombre: true, apellidos: true } },
      inmueble: { select: { titulo: true } },
      comercial: { select: { usuarioId: true } },
    },
  });

  let notificadas = 0;
  for (const v of visitas) {
    const hora = new Date(v.fecha).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    await notifVisitaManana(
      v.id,
      v.comercial.usuarioId,
      `${v.lead.nombre} ${v.lead.apellidos ?? ""}`.trim(),
      v.inmueble.titulo,
      hora
    );
    notificadas++;
  }
  return { notificadas };
}
