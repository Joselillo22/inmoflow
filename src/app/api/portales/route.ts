import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generarFeedIdealista, generarFeedJSON } from "@/lib/services/portal.service";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";

async function _GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") ?? "json";
    const portal = searchParams.get("portal");

    // Autenticación: API key válida O sesión activa
    const apiKey = searchParams.get("key");
    const validKey = process.env.PORTALES_API_KEY;

    if (apiKey) {
      if (!validKey || apiKey !== validKey) {
        return NextResponse.json({ error: "API key inválida" }, { status: 403 });
      }
    } else {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }
    }

    if (format === "xml" || portal === "idealista") {
      const xml = await generarFeedIdealista();
      return new NextResponse(xml, {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const json = await generarFeedJSON();
    return NextResponse.json({ data: json, total: json.length });
  } catch (error) {
    logger.error({ err: error }, "GET /api/portales error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
