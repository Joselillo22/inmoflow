import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withRateLimit } from "@/lib/rate-limit";
import { getRun } from "@/lib/services/apify-fsbo.service";
import logger from "@/lib/logger";

async function _GET(_req: NextRequest, { params }: { params: Promise<{ runId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const rol = (session.user as unknown as { rol: string }).rol;
    if (!["ADMIN", "COORDINADORA"].includes(rol)) {
      return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
    }

    const { runId } = await params;
    const run = await getRun(runId);
    return NextResponse.json({
      id: run.id,
      status: run.status,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      defaultDatasetId: run.defaultDatasetId,
      durationMillis: run.stats?.durationMillis ?? null,
    });
  } catch (error) {
    logger.error({ err: error }, "GET /api/captacion/scraper/status/[runId] error");
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
