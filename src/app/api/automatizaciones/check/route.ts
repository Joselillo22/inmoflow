import { NextRequest, NextResponse } from "next/server";
import { detectarLeadsSinContactar } from "@/lib/services/automation-engine.service";
import { withRateLimit } from "@/lib/rate-limit";

// Endpoint llamado por cron cada 5 min para detectar leads sin contactar
async function _POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PORTALES_API_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await detectarLeadsSinContactar(5);
  return NextResponse.json({ data: result });
}

export const POST = withRateLimit(_POST);
