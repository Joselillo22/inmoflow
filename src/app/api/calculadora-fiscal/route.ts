import { NextRequest, NextResponse } from "next/server";
import { withRateLimit } from "@/lib/rate-limit";
import logger from "@/lib/logger";
import { calcularFiscal, getTipoCambio } from "@/lib/services/calculadora-fiscal.service";

async function _GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const precioStr = searchParams.get("precio");
    const tipoOperacion = searchParams.get("tipoOperacion") as "segunda_mano" | "obra_nueva" | null;
    const paisComprador = searchParams.get("paisComprador") ?? "XX";
    const moneda = (searchParams.get("moneda") ?? "EUR").toUpperCase();
    const valorCatastralStr = searchParams.get("valorCatastral");
    const viviendaHabitual = searchParams.get("viviendaHabitual") === "true";

    if (!precioStr || isNaN(Number(precioStr)) || Number(precioStr) <= 0) {
      return NextResponse.json({ error: "precio requerido y debe ser positivo" }, { status: 400 });
    }

    if (!tipoOperacion || !["segunda_mano", "obra_nueva"].includes(tipoOperacion)) {
      return NextResponse.json({ error: "tipoOperacion debe ser 'segunda_mano' u 'obra_nueva'" }, { status: 400 });
    }

    const precio = Number(precioStr);
    const valorCatastral = valorCatastralStr ? Number(valorCatastralStr) : undefined;

    const resultado = calcularFiscal({
      precio,
      tipoOperacion,
      paisComprador,
      moneda,
      valorCatastral,
      viviendaHabitual,
    });

    // Conversión de moneda si se pide
    if (moneda !== "EUR") {
      const fx = await getTipoCambio(moneda);
      if (fx) {
        resultado.conversion = {
          monedaDestino: moneda,
          tipoCambio: fx.tasa,
          precioConvertido: Math.round(precio * fx.tasa),
          costesCompraConvertido: Math.round(resultado.costesCompra.totalCostesCompra * fx.tasa),
          costesAnualesConvertido: Math.round(resultado.costesAnuales.totalAnual * fx.tasa),
          fuenteTipoCambio: "BCE via frankfurter.app",
          fechaTipoCambio: fx.fecha,
        };
      } else {
        resultado.avisos.unshift("Tipo de cambio no disponible. Importes mostrados en EUR.");
      }
    }

    return NextResponse.json({ data: resultado });
  } catch (error) {
    logger.error({ err: error }, "GET /api/calculadora-fiscal error");
    return NextResponse.json({ error: "Error al calcular" }, { status: 500 });
  }
}

export const GET = withRateLimit(_GET);
