// Script para crear las automatizaciones por defecto
// Ejecutar: curl -X POST https://inmo.eaistudio.es/api/automatizaciones/seed -H "x-api-key: API_KEY"

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit } from "@/lib/rate-limit";

const DEFAULT_RULES = [
  {
    nombre: "Lead nuevo: crear tarea llamar urgente",
    evento: "LEAD_NUEVO",
    accion: "CREAR_TAREA",
    parametros: { tipo: "LLAMAR", descripcion: "Contactar nuevo lead - automatico", prioridad: 1, delay_minutos: 0 },
  },
  {
    nombre: "Lead sin contactar 5 min: escalar a admin",
    evento: "LEAD_SIN_CONTACTAR",
    accion: "ESCALAR_ADMIN",
    parametros: { descripcion: "URGENTE: Lead sin contactar despues de 5 minutos" },
  },
  {
    nombre: "Visita realizada: tarea seguimiento 24h",
    evento: "VISITA_REALIZADA",
    accion: "CREAR_TAREA",
    parametros: { tipo: "SEGUIMIENTO", descripcion: "Seguimiento post-visita - contactar al lead", prioridad: 1, delay_minutos: 1440 },
  },
  {
    nombre: "Operacion creada: tarea documentacion",
    evento: "OPERACION_CREADA",
    accion: "CREAR_TAREA",
    parametros: { tipo: "DOCUMENTACION", descripcion: "Preparar documentacion para la operacion", prioridad: 1 },
  },
];

async function _POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PORTALES_API_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let created = 0;
  for (const rule of DEFAULT_RULES) {
    const exists = await prisma.automatizacion.findFirst({
      where: { nombre: rule.nombre },
    });
    if (!exists) {
      await prisma.automatizacion.create({ data: { ...rule, activa: true } });
      created++;
    }
  }

  return NextResponse.json({ data: { created, total: DEFAULT_RULES.length } });
}

export const POST = withRateLimit(_POST);
