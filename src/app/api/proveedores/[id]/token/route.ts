import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generarTokenPortal } from "@/lib/services/proveedor.service";
import logger from "@/lib/logger";

// POST /api/proveedores/[id]/token — generar token portal
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { id } = await params;
    const url = await generarTokenPortal(id);
    return NextResponse.json({ data: { url } });
  } catch (error) {
    logger.error({ err: error }, "POST /api/proveedores/[id]/token error");
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
