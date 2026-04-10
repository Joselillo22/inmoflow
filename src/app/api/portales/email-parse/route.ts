import { NextRequest, NextResponse } from "next/server";
import { procesarEmailsPortales } from "@/lib/services/email-parser.service";
import { withRateLimit } from "@/lib/rate-limit";

async function _POST(req: NextRequest) {
  // Proteger con API key
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.PORTALES_API_KEY) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await procesarEmailsPortales();
  return NextResponse.json({ data: result });
}

export const POST = withRateLimit(_POST);
