import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { descartarCaptacionSchema } from "@/lib/validations/captacion";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

async function _POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rol = (session.user as unknown as { rol: string }).rol;
    const comId = (session.user as unknown as { comercialId: string | null }).comercialId;

    const { id } = await params;
    const existing = await prisma.captacionOportunidad.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

    if (!["ADMIN", "COORDINADORA"].includes(rol) && existing.comercialId !== comId) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = descartarCaptacionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "motivo requerido" }, { status: 400 });
    }

    const opp = await prisma.captacionOportunidad.update({
      where: { id },
      data: { estado: "DESCARTADA", motivoDescarte: parsed.data.motivo },
    });

    return NextResponse.json({ data: opp });
  } catch (error) {
    logger.error({ err: error }, "POST /api/captacion/[id]/descartar error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const POST = withRateLimit(_POST);
