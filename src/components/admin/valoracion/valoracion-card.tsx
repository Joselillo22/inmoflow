"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  TrendingUp, TrendingDown, Minus, Sparkles, RefreshCw, Calculator,
  ExternalLink, BarChart3, Check, X, Info,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

interface ComparableResumen {
  id: string;
  fuente: string;
  urlAnuncio: string | null;
  precio: number;
  precioM2: number;
  metros: number | null;
  habitaciones: number | null;
  localidad: string;
  distanciaKm?: number;
  esVentaReal: boolean;
  fechaPublicacion: string | null;
}

interface ValoracionResult {
  precioEstimado: number;
  precioM2Estimado: number;
  rangoMin: number;
  rangoMax: number;
  confianza: "alta" | "media" | "baja";
  numComparables: number;
  numVentasReales: number;
  comparables: ComparableResumen[];
  datosZona: {
    precioM2Medio: number;
    precioM2Mediana: number;
    numAnunciosActivos: number;
    tendencia3m: number;
  };
  fuente: string;
  fecha: string;
  ajusteAplicado: number;
}

export interface ValoracionInput {
  tipoInmueble: string;
  operacion: "venta" | "alquiler";
  localidad: string;
  codigoPostal?: string;
  metrosConstruidos: number;
  habitaciones?: number;
  banos?: number;
  planta?: number;
  anoConstruccion?: number;
  latitud?: number;
  longitud?: number;
  garaje?: boolean;
  piscina?: boolean;
  terraza?: boolean;
  ascensor?: boolean;
}

interface Props {
  input: ValoracionInput;
  precioReferencia?: number;
  onClose?: () => void;
}

const CONFIANZA_STYLES: Record<string, { cls: string; label: string }> = {
  alta: { cls: "bg-emerald-100 text-emerald-700 border-emerald-300", label: "Confianza alta" },
  media: { cls: "bg-amber-100 text-amber-700 border-amber-300", label: "Confianza media" },
  baja: { cls: "bg-red-100 text-red-700 border-red-300", label: "Confianza baja" },
};

export function ValoracionResultCard({ input, precioReferencia, onClose }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValoracionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  async function valorar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/valoracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al valorar");
        return;
      }
      setResult(data.data);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  if (!result && !loading && !error) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <p className="text-sm font-semibold">Valoración automática (AVM)</p>
        </div>
        <p className="text-xs text-secondary">
          Calcula el precio de mercado estimado usando los comparables que el CRM ha acumulado ({input.metrosConstruidos}m² · {input.localidad}).
        </p>
        <Button onClick={valorar} size="sm" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Valorar ahora
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-muted/30 p-5 flex flex-col items-center justify-center gap-2 min-h-[120px]">
        <RefreshCw className="h-5 w-5 text-primary animate-spin" />
        <p className="text-xs text-secondary">Calculando valoración...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-2">
        <p className="text-sm font-semibold text-red-700 flex items-center gap-1">
          <X className="h-4 w-4" /> No se pudo valorar
        </p>
        <p className="text-xs text-red-700">{error}</p>
        <Button onClick={valorar} size="sm" variant="outline">Reintentar</Button>
      </div>
    );
  }

  if (!result) return null;

  const confStyle = CONFIANZA_STYLES[result.confianza];
  const diffReferencia = precioReferencia ? ((precioReferencia - result.precioEstimado) / result.precioEstimado) * 100 : null;
  const tendIcon = result.datosZona.tendencia3m > 0 ? TrendingUp : result.datosZona.tendencia3m < 0 ? TrendingDown : Minus;
  const TendIcon = tendIcon;
  const visibles = showAll ? result.comparables : result.comparables.slice(0, 5);

  return (
    <div className="rounded-2xl border border-border bg-white/80 backdrop-blur-sm shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-5 space-y-3 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold">Valoración AVM</p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${confStyle.cls}`}>{confStyle.label}</span>
        </div>

        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-bold text-foreground">{formatCurrency(result.precioEstimado)}</p>
          {input.operacion === "alquiler" && <span className="text-sm text-secondary">/mes</span>}
        </div>
        <p className="text-xs text-secondary">
          Rango {formatCurrency(result.rangoMin)} – {formatCurrency(result.rangoMax)} · <strong>{result.precioM2Estimado} €/m²</strong>
        </p>

        {precioReferencia && diffReferencia !== null && (
          <div className={`rounded-lg p-2.5 text-xs ${
            Math.abs(diffReferencia) < 5 ? "bg-emerald-50 text-emerald-700" :
            diffReferencia > 0 ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
          }`}>
            <span className="font-semibold">
              El anuncio pide {formatCurrency(precioReferencia)}
              {" "}({diffReferencia > 0 ? "+" : ""}{diffReferencia.toFixed(1)}% {diffReferencia > 0 ? "sobre mercado" : "bajo mercado"})
            </span>
            {Math.abs(diffReferencia) >= 10 && <p className="mt-0.5">Hay margen para negociar.</p>}
          </div>
        )}
      </div>

      {/* Datos zona */}
      <div className="p-4 bg-muted/20 grid grid-cols-3 gap-3 text-center border-b border-border">
        <div>
          <p className="text-[10px] text-secondary uppercase tracking-wider">Media zona</p>
          <p className="text-sm font-semibold">{result.datosZona.precioM2Medio} €/m²</p>
        </div>
        <div>
          <p className="text-[10px] text-secondary uppercase tracking-wider">Mediana zona</p>
          <p className="text-sm font-semibold">{result.datosZona.precioM2Mediana} €/m²</p>
        </div>
        <div>
          <p className="text-[10px] text-secondary uppercase tracking-wider">Tendencia 3m</p>
          <p className="text-sm font-semibold flex items-center justify-center gap-1">
            <TendIcon className={`h-3 w-3 ${result.datosZona.tendencia3m > 0 ? "text-emerald-600" : result.datosZona.tendencia3m < 0 ? "text-red-600" : "text-secondary"}`} />
            {result.datosZona.tendencia3m > 0 ? "+" : ""}{result.datosZona.tendencia3m}%
          </p>
        </div>
      </div>

      {/* Comparables */}
      {result.comparables.length > 0 && (
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" /> Comparables usados ({result.numComparables})
            </p>
            {result.numVentasReales > 0 && (
              <Badge size="sm" variant="success">{result.numVentasReales} ventas reales</Badge>
            )}
          </div>
          <div className="space-y-1.5">
            {visibles.map((c) => (
              <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/40 text-xs hover:bg-muted/30 transition-colors">
                {c.esVentaReal && <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Venta real" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">
                    {c.metros}m² · {c.habitaciones ?? "?"}hab · {c.localidad}
                  </p>
                  <p className="text-[10px] text-secondary">
                    {c.fuente.replace("apify_", "")} {c.distanciaKm !== undefined ? `· ${c.distanciaKm}km` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold">{formatCurrency(c.precio)}</p>
                  <p className="text-[10px] text-secondary">{c.precioM2} €/m²</p>
                </div>
                {c.urlAnuncio && (
                  <a href={c.urlAnuncio} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 cursor-pointer shrink-0">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
          {result.comparables.length > 5 && (
            <button onClick={() => setShowAll(!showAll)} className="text-xs text-primary hover:text-primary/80 cursor-pointer">
              {showAll ? "Mostrar menos" : `Ver los ${result.comparables.length}`}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between">
        <p className="text-[10px] text-secondary flex items-center gap-1">
          <Info className="h-3 w-3" /> {result.fuente} · ajuste {result.ajusteAplicado > 0 ? "+" : ""}{result.ajusteAplicado}%
        </p>
        <button onClick={valorar} className="text-xs text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> Recalcular
        </button>
      </div>
    </div>
  );
}
