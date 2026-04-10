import { prisma } from "@/lib/prisma";

interface AsignacionResult {
  comercialId: string;
  razon: string;
}

export async function asignarLeadAutomatico(leadId: string): Promise<AsignacionResult | null> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { demandas: true },
  });

  if (!lead || lead.comercialId) return null;

  // Buscar comerciales activos con su carga de trabajo
  const comerciales = await prisma.comercial.findMany({
    where: { activo: true },
    include: {
      usuario: { select: { nombre: true } },
      _count: {
        select: {
          leads: {
            where: { faseFunnel: { in: ["NUEVO", "CONTACTADO"] } },
          },
        },
      },
    },
  });

  if (comerciales.length === 0) return null;

  // Ordenar por carga de trabajo (menos leads primero)
  const sorted = comerciales.sort((a, b) => a._count.leads - b._count.leads);

  const zona = lead.demandas?.[0]?.zona;
  const idiomaLead = lead.idioma;

  // 1. Match por zona + idioma (prioridad máxima)
  if (zona && idiomaLead !== "es") {
    const match = sorted.find(
      (c) =>
        c.zona.toLowerCase().includes(zona.toLowerCase()) &&
        c.idiomas.includes(idiomaLead)
    );
    if (match) {
      await asignar(leadId, match.id);
      return {
        comercialId: match.id,
        razon: `Zona coincidente (${match.zona}) + habla ${idiomaLead} + menor carga`,
      };
    }
  }

  // 2. Match por idioma (lead extranjero)
  if (idiomaLead !== "es") {
    const match = sorted.find((c) => c.idiomas.includes(idiomaLead));
    if (match) {
      await asignar(leadId, match.id);
      return {
        comercialId: match.id,
        razon: `Habla ${idiomaLead} + menor carga (${match._count.leads} leads en cola)`,
      };
    }
  }

  // 3. Match por zona
  if (zona) {
    const match = sorted.find((c) =>
      c.zona.toLowerCase().includes(zona.toLowerCase())
    );
    if (match) {
      await asignar(leadId, match.id);
      return {
        comercialId: match.id,
        razon: `Zona coincidente (${match.zona}) + menor carga`,
      };
    }
  }

  // 4. Fallback: menor carga de trabajo
  const elegido = sorted[0];
  await asignar(leadId, elegido.id);
  return {
    comercialId: elegido.id,
    razon: `Menor carga de trabajo (${elegido._count.leads} leads en cola)`,
  };
}

async function asignar(leadId: string, comercialId: string) {
  await prisma.$transaction([
    prisma.lead.update({
      where: { id: leadId },
      data: { comercialId },
    }),
    prisma.tarea.create({
      data: {
        comercialId,
        tipo: "LLAMAR",
        descripcion: "Contactar nuevo lead asignado automáticamente",
        prioridad: 1,
        leadId,
      },
    }),
  ]);
}
