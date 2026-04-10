import { ejecutarAutomatizaciones } from "@/lib/services/automation-engine.service";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createLeadSchema } from "@/lib/validations/lead";
import { asignarLeadAutomatico } from "@/lib/services/asignacion.service";
import { z } from "zod";
import { getSessionUser } from "@/lib/utils/auth-check";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

async function _GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const faseFunnel = searchParams.get("faseFunnel");
    const fuente = searchParams.get("fuente");
    const comercialId = searchParams.get("comercialId");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") ?? "createdAt";
    const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

    const where: Record<string, unknown> = {};
    if (faseFunnel) where.faseFunnel = faseFunnel;
    if (fuente) where.fuente = fuente;
    if (comercialId) where.comercialId = comercialId;
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { apellidos: { contains: search, mode: "insensitive" } },
        { telefono: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const rol = (session.user as unknown as { rol: string; comercialId: string | null }).rol;
    const userComercialId = (session.user as unknown as { comercialId: string | null }).comercialId;
    if (rol === "COMERCIAL" && userComercialId) {
      where.comercialId = userComercialId;
    }

    const orderBy: Record<string, string> = {};
    if (sortBy === "nombre") orderBy.nombre = sortOrder;
    else if (sortBy === "score") orderBy.score = sortOrder;
    else if (sortBy === "faseFunnel") orderBy.faseFunnel = sortOrder;
    else orderBy.createdAt = sortOrder;

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          comercial: { include: { usuario: { select: { nombre: true, apellidos: true } } } },
          _count: { select: { visitas: true, interacciones: true, demandas: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ]);

    return NextResponse.json({ data: leads, total, page, limit });
  } catch (error) {
    logger.error({ err: error }, "GET /api/leads error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

async function _POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const lead = await prisma.lead.create({ data: parsed.data });

    // Audit RGPD
    const reqInfo_POST = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Lead", ip: reqInfo_POST.ip, userAgent: reqInfo_POST.userAgent });

    if (lead.comercialId) {
      await prisma.tarea.create({
        data: {
          comercialId: lead.comercialId,
          tipo: "LLAMAR",
          descripcion: `Contactar nuevo lead: ${lead.nombre} ${lead.apellidos ?? ""}`.trim(),
          prioridad: 1,
          leadId: lead.id,
        },
      });
    } else {
      const asignacion = await asignarLeadAutomatico(lead.id);
      if (asignacion) {
        const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
        return NextResponse.json({
          data: updatedLead,
          asignacion: { comercialId: asignacion.comercialId, razon: asignacion.razon },
        }, { status: 201 });
      }
    }

// Trigger automatizaciones    ejecutarAutomatizaciones({ evento: "LEAD_NUEVO", entidadTipo: "lead", entidadId: lead.id, datos: { fuente: lead.fuente, faseFunnel: lead.faseFunnel } }).catch(() => {});
return NextResponse.json({ data: lead }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/leads error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

const bulkSchema = z.object({
  ids: z.array(z.string()).min(1),
  action: z.enum(["assignComercial", "changeFase"]),
  value: z.string().min(1),
});

async function _PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user || (user.rol !== "ADMIN" && user.rol !== "COORDINADORA")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = bulkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos invalidos" }, { status: 400 });
    }

    const { ids, action, value } = parsed.data;

    if (action === "assignComercial") {
      await prisma.lead.updateMany({
        where: { id: { in: ids } },
        data: { comercialId: value },
      });

    // Audit RGPD
    const reqInfo_PATCH = extractRequestInfo(req.headers);
    await audit({ accion: "ACTUALIZAR", entidad: "Lead", ip: reqInfo_PATCH.ip, userAgent: reqInfo_PATCH.userAgent });
    } else if (action === "changeFase") {
      await prisma.lead.updateMany({
        where: { id: { in: ids } },
        data: { faseFunnel: value as never },
      });
    }

    return NextResponse.json({ success: true, count: ids.length });
  } catch (error) {
    logger.error({ err: error }, "PATCH /api/leads error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);

export const POST = withRateLimit(_POST);

export const PATCH = withRateLimit(_PATCH);
