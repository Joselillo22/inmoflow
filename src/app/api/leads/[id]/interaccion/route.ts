import { recalcularScoreLead } from "@/lib/services/lead-scoring.service";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { audit, extractRequestInfo } from "@/lib/services/audit.service";

const createInteraccionSchema = z.object({
  canal: z.enum(["TELEFONO", "WHATSAPP", "EMAIL", "PRESENCIAL", "PORTAL", "SISTEMA"]),
  contenido: z.string().optional(),
});

async function _POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = createInteraccionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const comercialId =
      (session.user as unknown as { comercialId: string | null }).comercialId;
    if (!comercialId) {
      return NextResponse.json({ error: "No eres comercial" }, { status: 403 });
    }

    const interaccion = await prisma.interaccion.create({
      data: {
        leadId: id,
        comercialId,
        canal: parsed.data.canal,
        contenido: parsed.data.contenido,
      },
    });

    // Audit RGPD
    const reqInfo_POST = extractRequestInfo(req.headers);
    await audit({ accion: "CREAR", entidad: "Lead", ip: reqInfo_POST.ip, userAgent: reqInfo_POST.userAgent });

recalcularScoreLead(id).catch(() => {});
return NextResponse.json({ data: interaccion }, { status: 201 });
  } catch (error) {
    logger.error({ err: error }, "POST /api/leads/[id]/interaccion error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
