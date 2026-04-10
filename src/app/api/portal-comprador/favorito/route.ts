import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "fallback-secret");

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 401 });

  let leadId: string;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== "portal-comprador") throw new Error();
    leadId = payload.leadId as string;
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }

  const acceso = await prisma.leadAcceso.findUnique({ where: { token } });
  if (!acceso || !acceso.activo || acceso.expiresAt < new Date()) {
    return NextResponse.json({ error: "Acceso revocado o expirado" }, { status: 401 });
  }

  const body = await req.json();
  const { inmuebleId } = body;
  if (!inmuebleId) return NextResponse.json({ error: "inmuebleId requerido" }, { status: 400 });

  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { favoritos: true } });
  if (!lead) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });

  const isFav = lead.favoritos.includes(inmuebleId);
  const newFavoritos = isFav
    ? lead.favoritos.filter((id) => id !== inmuebleId)
    : [...lead.favoritos, inmuebleId];

  await prisma.lead.update({ where: { id: leadId }, data: { favoritos: newFavoritos } });

  return NextResponse.json({ favoritos: newFavoritos, added: !isFav });
}
