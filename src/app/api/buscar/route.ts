import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) return NextResponse.json({ data: { leads: [], inmuebles: [], propietarios: [] } });

    const search = { contains: q, mode: "insensitive" as const };

    const [leads, inmuebles, propietarios] = await Promise.all([
      prisma.lead.findMany({
        where: { OR: [{ nombre: search }, { apellidos: search }, { telefono: { contains: q } }, { email: search }] },
        select: { id: true, nombre: true, apellidos: true, telefono: true, faseFunnel: true },
        take: 5,
      }),
      prisma.inmueble.findMany({
        where: { OR: [{ titulo: search }, { referencia: search }, { direccion: search }, { localidad: search }] },
        select: { id: true, titulo: true, referencia: true, localidad: true, estado: true },
        take: 5,
      }),
      prisma.propietario.findMany({
        where: { OR: [{ nombre: search }, { apellidos: search }, { telefono: { contains: q } }, { dniNie: search }] },
        select: { id: true, nombre: true, apellidos: true, telefono: true },
        take: 5,
      }),
    ]);

    return NextResponse.json({ data: { leads, inmuebles, propietarios } });
  } catch {
    return NextResponse.json({ data: { leads: [], inmuebles: [], propietarios: [] } });
  }
}
