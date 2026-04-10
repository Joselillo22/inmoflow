import { prisma } from "@/lib/prisma";

interface MatchScore {
  inmuebleId: string;
  score: number;
  reasons: string[];
}

export async function calcularMatching(demandaId: string): Promise<MatchScore[]> {
  const demanda = await prisma.demanda.findUnique({
    where: { id: demandaId },
    include: { lead: true },
  });

  if (!demanda) return [];

  const where: Record<string, unknown> = {
    estado: { in: ["ACTIVO", "EN_CAPTACION"] },
  };

  if (demanda.tipoOperacion) where.operacion = demanda.tipoOperacion;
  if (demanda.tipoInmueble) where.tipo = demanda.tipoInmueble;

  const inmuebles = await prisma.inmueble.findMany({
    where,
    select: {
      id: true,
      tipo: true,
      operacion: true,
      precio: true,
      localidad: true,
      habitaciones: true,
      metrosConstruidos: true,
      garaje: true,
      piscina: true,
      terraza: true,
    },
  });

  const results: MatchScore[] = [];

  for (const inm of inmuebles) {
    let score = 0;
    const reasons: string[] = [];
    const precio = Number(inm.precio);

    // Zona (30 pts exacta, 15 cercana)
    if (demanda.zona && inm.localidad) {
      if (inm.localidad.toLowerCase().includes(demanda.zona.toLowerCase())) {
        score += 30;
        reasons.push("Zona exacta");
      }
    }

    // Precio (25 pts centrado, 10 en límite)
    if (demanda.precioMin || demanda.precioMax) {
      const min = demanda.precioMin ? Number(demanda.precioMin) : 0;
      const max = demanda.precioMax ? Number(demanda.precioMax) : Infinity;

      if (precio >= min && precio <= max) {
        const rango = max - min;
        const centro = min + rango / 2;
        const distCentro = Math.abs(precio - centro);
        if (rango > 0 && distCentro < rango * 0.25) {
          score += 25;
          reasons.push("Precio centrado");
        } else {
          score += 10;
          reasons.push("Precio en rango");
        }
      }
    }

    // Habitaciones (20 pts exactas, 10 si más)
    if (demanda.habitacionesMin && inm.habitaciones) {
      if (inm.habitaciones === demanda.habitacionesMin) {
        score += 20;
        reasons.push("Habitaciones exactas");
      } else if (inm.habitaciones > demanda.habitacionesMin) {
        score += 10;
        reasons.push("Más habitaciones");
      }
    }

    // Metros (15 pts)
    if (demanda.metrosMin && inm.metrosConstruidos) {
      if (inm.metrosConstruidos >= demanda.metrosMin) {
        score += 15;
        reasons.push("Superficie suficiente");
      }
    }

    // Extras (5 pts cada uno)
    const extras = demanda.extras as Record<string, boolean> | null;
    if (extras) {
      if (extras.garaje && inm.garaje) { score += 5; reasons.push("Garaje"); }
      if (extras.piscina && inm.piscina) { score += 5; reasons.push("Piscina"); }
      if (extras.terraza && inm.terraza) { score += 5; reasons.push("Terraza"); }
    }

    if (score > 0) {
      results.push({ inmuebleId: inm.id, score: Math.min(score, 100), reasons });
    }
  }

  // Guardar matchings en BD
  for (const match of results) {
    await prisma.matching.upsert({
      where: {
        demandaId_inmuebleId: {
          demandaId,
          inmuebleId: match.inmuebleId,
        },
      },
      update: { score: match.score },
      create: {
        demandaId,
        inmuebleId: match.inmuebleId,
        score: match.score,
      },
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

export async function ejecutarMatchingGlobal() {
  const demandas = await prisma.demanda.findMany({
    where: {
      lead: { faseFunnel: { notIn: ["PERDIDO", "CIERRE"] } },
    },
  });

  let totalMatchings = 0;
  for (const demanda of demandas) {
    const matches = await calcularMatching(demanda.id);
    totalMatchings += matches.length;
  }

  return { demandasProcesadas: demandas.length, matchingsCreados: totalMatchings };
}
