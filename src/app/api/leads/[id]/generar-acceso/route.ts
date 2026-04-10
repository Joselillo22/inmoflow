import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.AUTH_SECRET ?? "fallback-secret");

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const token = await new SignJWT({ leadId: id, type: "portal-comprador" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const acceso = await prisma.leadAcceso.create({
    data: { leadId: id, token, expiresAt },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "https://inmo.eaistudio.es";
  const url = `${baseUrl}/comprador/${token}`;

  return NextResponse.json({ url, expiresAt: acceso.expiresAt, id: acceso.id });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const accesos = await prisma.leadAcceso.findMany({
    where: { leadId: id, activo: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: accesos });
}

export async function DELETE(
  req: NextRequest,
  _ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const accesoId = searchParams.get("accesoId");
  if (!accesoId) {
    return NextResponse.json({ error: "accesoId requerido" }, { status: 400 });
  }

  await prisma.leadAcceso.update({
    where: { id: accesoId },
    data: { activo: false },
  });

  return NextResponse.json({ ok: true });
}
