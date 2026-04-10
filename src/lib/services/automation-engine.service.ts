import { notifLeadSinContactar } from "./notificacion.service";
import { prisma } from "@/lib/prisma";

type EventType =
  | "LEAD_NUEVO"
  | "LEAD_SIN_CONTACTAR"
  | "VISITA_REALIZADA"
  | "OPERACION_CREADA"
  | "LEAD_FASE_CAMBIO";

interface EventPayload {
  evento: EventType;
  entidadTipo: string;
  entidadId: string;
  datos?: Record<string, unknown>;
}

export async function ejecutarAutomatizaciones(payload: EventPayload) {
  const reglas = await prisma.automatizacion.findMany({
    where: { activa: true, evento: payload.evento },
  });

  for (const regla of reglas) {
    try {
      // Verificar condiciones extra si existen
      if (regla.condicion) {
        const condiciones = regla.condicion as Record<string, unknown>;
        const cumple = Object.entries(condiciones).every(
          ([key, val]) => payload.datos?.[key] === val
        );
        if (!cumple) continue;
      }

      const params = (regla.parametros ?? {}) as Record<string, unknown>;

      // Ejecutar accion
      switch (regla.accion) {
        case "CREAR_TAREA":
          await accionCrearTarea(payload, params);
          break;
        case "CAMBIAR_FASE":
          await accionCambiarFase(payload, params);
          break;
        case "ESCALAR_ADMIN":
          await accionEscalarAdmin(payload, params);
          break;
        case "ASIGNAR_COMERCIAL":
          // Se gestiona via asignacion.service.ts existente
          const { asignarLeadAutomatico } = await import("./asignacion.service");
          if (payload.entidadTipo === "lead") {
            await asignarLeadAutomatico(payload.entidadId);
          }
          break;
      }

      // Log exito
      await prisma.automatizacionLog.create({
        data: {
          automatizacionId: regla.id,
          evento: payload.evento,
          entidadTipo: payload.entidadTipo,
          entidadId: payload.entidadId,
          resultado: "OK",
          detalle: `Accion ${regla.accion} ejecutada`,
        },
      });
    } catch (err) {
      await prisma.automatizacionLog.create({
        data: {
          automatizacionId: regla.id,
          evento: payload.evento,
          entidadTipo: payload.entidadTipo,
          entidadId: payload.entidadId,
          resultado: "ERROR",
          detalle: (err as Error).message,
        },
      });
    }
  }
}

async function accionCrearTarea(
  payload: EventPayload,
  params: Record<string, unknown>
) {
  // Necesitamos un comercialId
  let comercialId: string | null = null;
  let leadId: string | null = null;

  if (payload.entidadTipo === "lead") {
    const lead = await prisma.lead.findUnique({
      where: { id: payload.entidadId },
      select: { comercialId: true },
    });
    comercialId = lead?.comercialId ?? null;
    leadId = payload.entidadId;
  } else if (payload.entidadTipo === "visita") {
    const visita = await prisma.visita.findUnique({
      where: { id: payload.entidadId },
      select: { comercialId: true, leadId: true },
    });
    comercialId = visita?.comercialId ?? null;
    leadId = visita?.leadId ?? null;
  }

  if (!comercialId) return;

  const delayMin = Number(params.delay_minutos ?? 0);
  const fechaLimite = delayMin > 0
    ? new Date(Date.now() + delayMin * 60 * 1000)
    : undefined;

  await prisma.tarea.create({
    data: {
      comercialId,
      tipo: ((params.tipo as string) ?? "SEGUIMIENTO") as "LLAMAR" | "WHATSAPP" | "EMAIL" | "SUBIR_FOTOS" | "ENVIAR_INFORME" | "DOCUMENTACION" | "VISITA_CAPTACION" | "SEGUIMIENTO" | "OTRO",
      descripcion: (params.descripcion as string) ?? `Tarea automatica: ${payload.evento}`,
      prioridad: Number(params.prioridad ?? 1),
      leadId,
      fechaLimite,
    },
  });
}

async function accionCambiarFase(
  payload: EventPayload,
  params: Record<string, unknown>
) {
  if (payload.entidadTipo !== "lead") return;
  const nuevaFase = params.fase as string;
  if (!nuevaFase) return;

  await prisma.lead.update({
    where: { id: payload.entidadId },
    data: { faseFunnel: nuevaFase as unknown as "CONTACTADO" | "CUALIFICADO" | "VISITA_PROGRAMADA" | "VISITA_REALIZADA" | "OFERTA" | "RESERVA" | "CIERRE" | "PERDIDO" },
  });
}

async function accionEscalarAdmin(
  payload: EventPayload,
  params: Record<string, unknown>
) {
  // Crear tarea urgente para el primer admin
  const admin = await prisma.usuario.findFirst({
    where: { rol: "ADMIN", activo: true },
    include: { comercial: true },
  });

  // Si el admin tiene perfil comercial, crear tarea ahi
  // Si no, crear una tarea con el comercialId del lead
  let comercialId: string | null = admin?.comercial?.id ?? null;

  if (!comercialId && payload.entidadTipo === "lead") {
    const lead = await prisma.lead.findUnique({
      where: { id: payload.entidadId },
      select: { comercialId: true },
    });
    comercialId = lead?.comercialId ?? null;
  }

  if (!comercialId) return;

  await prisma.tarea.create({
    data: {
      comercialId,
      tipo: "SEGUIMIENTO",
      descripcion: (params.descripcion as string) ?? `ESCALADO: ${payload.evento} - requiere atencion inmediata`,
      prioridad: 2, // URGENTE
      leadId: payload.entidadTipo === "lead" ? payload.entidadId : undefined,
    },
  });
}

// Funcion para el cron: detectar leads sin contactar en X minutos
export async function detectarLeadsSinContactar(minutosLimite: number = 5) {
  const limite = new Date(Date.now() - minutosLimite * 60 * 1000);

  const leadsSinContactar = await prisma.lead.findMany({
    where: {
      faseFunnel: "NUEVO",
      createdAt: { lte: limite },
      interacciones: { none: {} },
    },
    select: { id: true },
  });

  for (const lead of leadsSinContactar) {
    await ejecutarAutomatizaciones({
      evento: "LEAD_SIN_CONTACTAR",
      entidadTipo: "lead",
      entidadId: lead.id,
    });

    // Marcar como contactado para no repetir (cambia fase a evitar duplicados)
    // No cambiar fase, mejor crear interaccion de sistema
    await prisma.interaccion.create({
      data: {
        leadId: lead.id,
        comercialId: (await prisma.lead.findUnique({ where: { id: lead.id }, select: { comercialId: true } }))?.comercialId ?? "",
        canal: "SISTEMA",
        contenido: `Alerta automatica: lead sin contactar despues de ${minutosLimite} minutos`,
// Crear notificacion para admins    const leadData = await prisma.lead.findUnique({ where: { id: lead.id }, select: { nombre: true, apellidos: true } });    if (leadData) notifLeadSinContactar(lead.id, leadData.nombre + " " + (leadData.apellidos ?? "")).catch(() => {});
      },
    });
  }

  return { detectados: leadsSinContactar.length };
}
