import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_API_ROUTES = ["/api/auth", "/api/whatsapp", "/api/portal/proveedor"];

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route));
}

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName: "__Secure-authjs.session-token" });

  const isLoginPage = nextUrl.pathname === "/login";
  const isApiRoute = nextUrl.pathname.startsWith("/api");

  const isAdminRoute =
    nextUrl.pathname.startsWith("/dashboard") ||
    nextUrl.pathname.startsWith("/comerciales") ||
    nextUrl.pathname.startsWith("/inmuebles") ||
    nextUrl.pathname.startsWith("/leads") ||
    nextUrl.pathname.startsWith("/operaciones") ||
    nextUrl.pathname.startsWith("/kyc") ||
    nextUrl.pathname.startsWith("/calendario") ||
    nextUrl.pathname.startsWith("/automatizaciones") ||
    nextUrl.pathname.startsWith("/inbox") ||
    nextUrl.pathname.startsWith("/ajustes") ||
    nextUrl.pathname.startsWith("/proveedores");

  const isComercialRoute =
    nextUrl.pathname.startsWith("/mi-dia") ||
    nextUrl.pathname.startsWith("/contactos") ||
    nextUrl.pathname.startsWith("/pisos") ||
    nextUrl.pathname.startsWith("/agenda");

  // --- API Routes ---
  if (isApiRoute) {
    if (isPublicApiRoute(nextUrl.pathname)) return NextResponse.next();

    // Cron endpoints with API key bypass
    const cronPaths = ["/api/portales", "/api/automatizaciones/check", "/api/automatizaciones/seed", "/api/whatsapp/reminders", "/api/notificaciones/check", "/api/informes/generate", "/api/proveedores/recordatorios", "/api/captacion/scraper", "/api/valoracion/importar"];
    if (cronPaths.some((p) => nextUrl.pathname.startsWith(p))) {
      const apiKey = req.headers.get("x-api-key") || nextUrl.searchParams.get("key");
      if (apiKey && apiKey === process.env.PORTALES_API_KEY) return NextResponse.next();
    }

    if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const rol = token.rol as string;
    if (nextUrl.pathname.startsWith("/api/comerciales") && nextUrl.pathname !== "/api/comercial" && rol !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }
    if (nextUrl.pathname.startsWith("/api/comisiones") && req.method === "PATCH" && rol !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    return NextResponse.next();
  }

  // --- Pages ---
  // Portal público (proveedores) - no requiere auth
  if (nextUrl.pathname.startsWith("/portal/")) return NextResponse.next();

  if (!token) {
    if (isLoginPage) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  const rol = token.rol as string;

  if (isLoginPage) {
    return NextResponse.redirect(new URL(rol === "COMERCIAL" ? "/mi-dia" : "/dashboard", nextUrl));
  }

  if (isAdminRoute && rol !== "ADMIN" && rol !== "COORDINADORA") {
    return NextResponse.redirect(new URL("/mi-dia", nextUrl));
  }

  if (isComercialRoute && rol !== "COMERCIAL") {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest|sw|uploads|audio|documentos|informes).*)",
  ],
};
