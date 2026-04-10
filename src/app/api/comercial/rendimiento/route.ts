import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import logger from "@/lib/logger";
import { getMiRendimiento } from "@/lib/services/rendimiento.service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const comercial = await prisma.comercial.findUnique({
      where: { usuarioId: session.user.id },
    });

    if (!comercial) {
      return NextResponse.json({ error: "No eres comercial" }, { status: 403 });
    }

    const data = await getMiRendimiento(comercial.id);
    return NextResponse.json({ data });
  } catch (error) {
    logger.error({ err: error }, "GET /api/comercial/rendimiento error");
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
