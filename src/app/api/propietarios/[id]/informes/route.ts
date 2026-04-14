import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import logger from "@/lib/logger";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!["ADMIN", "COORDINADORA"].includes(session.user.rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { id } = await params;
    const informes = await prisma.informePropietario.findMany({
      where: { propietarioId: id },
      include: {
        inmueble: { select: { id: true, titulo: true, referencia: true } },
      },
      orderBy: { periodo: "desc" },
    });

    return NextResponse.json({ data: informes });
  } catch (error) {
    logger.error({ err: error }, "GET /api/propietarios/[id]/informes error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
