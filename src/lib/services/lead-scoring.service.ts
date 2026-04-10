import { prisma } from "@/lib/prisma";

// Sistema de scoring automatico para leads
// Se recalcula en cada interaccion, visita o cambio de datos

const SCORING_RULES = {
  // Datos de contacto
  tieneEmail: 10,
  tieneTelefono: 10,
  tieneNacionalidad: 5,

  // Engagement
  tieneDemanda: 15,
  interaccionTelefono: 8,
  interaccionWhatsApp: 5,
  interaccionEmail: 3,
  interaccionPresencial: 12,

  // Visitas
  visitaProgramada: 10,
  visitaRealizadaInteresado: 20,
  visitaRealizadaNoInteresado: 5,

  // Fase avanzada
  faseContactado: 5,
  faseCualificado: 10,
  faseVisitaProgramada: 15,
  faseVisitaRealizada: 20,
  faseOferta: 30,
  faseReserva: 40,
};

export async function recalcularScoreLead(leadId: string): Promise<number> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      demandas: { select: { id: true } },
      interacciones: { select: { canal: true } },
      visitas: { select: { resultado: true } },
    },
  });

  if (!lead) return 0;

  let score = 0;

  // Datos de contacto
  if (lead.email) score += SCORING_RULES.tieneEmail;
  if (lead.telefono) score += SCORING_RULES.tieneTelefono;
  if (lead.nacionalidad) score += SCORING_RULES.tieneNacionalidad;

  // Demandas
  if (lead.demandas.length > 0) score += SCORING_RULES.tieneDemanda;

  // Interacciones
  for (const inter of lead.interacciones) {
    switch (inter.canal) {
      case "TELEFONO": score += SCORING_RULES.interaccionTelefono; break;
      case "WHATSAPP": score += SCORING_RULES.interaccionWhatsApp; break;
      case "EMAIL": score += SCORING_RULES.interaccionEmail; break;
      case "PRESENCIAL": score += SCORING_RULES.interaccionPresencial; break;
    }
  }

  // Visitas
  for (const visita of lead.visitas) {
    if (visita.resultado === "PENDIENTE") score += SCORING_RULES.visitaProgramada;
    else if (visita.resultado === "REALIZADA_INTERESADO") score += SCORING_RULES.visitaRealizadaInteresado;
    else if (visita.resultado === "REALIZADA_NO_INTERESADO") score += SCORING_RULES.visitaRealizadaNoInteresado;
  }

  // Fase del funnel
  const faseScores: Record<string, number> = {
    CONTACTADO: SCORING_RULES.faseContactado,
    CUALIFICADO: SCORING_RULES.faseCualificado,
    VISITA_PROGRAMADA: SCORING_RULES.faseVisitaProgramada,
    VISITA_REALIZADA: SCORING_RULES.faseVisitaRealizada,
    OFERTA: SCORING_RULES.faseOferta,
    RESERVA: SCORING_RULES.faseReserva,
  };
  score += faseScores[lead.faseFunnel] ?? 0;

  // Cap at 100
  const finalScore = Math.min(score, 100);

  // Actualizar en BD
  await prisma.lead.update({
    where: { id: leadId },
    data: { score: finalScore },
  });

  return finalScore;
}

// Recalcular todos los leads activos (para cron o batch)
export async function recalcularScoreGlobal(): Promise<{ procesados: number }> {
  const leads = await prisma.lead.findMany({
    where: { faseFunnel: { notIn: ["PERDIDO", "CIERRE"] } },
    select: { id: true },
  });

  for (const lead of leads) {
    await recalcularScoreLead(lead.id);
  }

  return { procesados: leads.length };
}
