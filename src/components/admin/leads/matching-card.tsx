"use client";

import { cn } from "@/lib/utils/cn";
import { ScoreBar } from "./score-bar";
import { Badge } from "@/components/ui/badge";
import { Eye, X, Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { TIPO_INMUEBLE_LABELS, TIPO_OPERACION_LABELS } from "@/lib/utils/constants";
import type { MatchingWithInmueble } from "@/lib/types/lead";

interface MatchingCardProps {
  matching: MatchingWithInmueble;
  onMarkVisto: () => void;
  onDescartar: () => void;
}

export function MatchingCard({ matching, onMarkVisto, onDescartar }: MatchingCardProps) {
  const inm = matching.inmueble;

  return (
    <div className={cn(
      "rounded-xl border border-border/50 bg-white/60 p-3.5 transition-all duration-200",
      matching.descartado && "opacity-40",
      !matching.descartado && "hover:shadow-[var(--shadow-sm)]"
    )}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Building2 className="h-5 w-5 text-secondary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-secondary">{inm.referencia}</span>
            <ScoreBar score={matching.score} />
          </div>
          <p className="text-sm font-medium text-foreground truncate">{inm.titulo}</p>
          <p className="text-sm text-secondary">
            {TIPO_INMUEBLE_LABELS[inm.tipo]} · {inm.localidad}
            {inm.habitaciones ? ` · ${inm.habitaciones} hab` : ""}
            {inm.metrosConstruidos ? ` · ${inm.metrosConstruidos}m2` : ""}
          </p>
          <p className="text-sm font-bold text-primary mt-1">{formatCurrency(Number(inm.precio))}</p>
        </div>
      </div>

      <div className="flex gap-1.5 mt-3">
        <button
          onClick={onMarkVisto}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium cursor-pointer transition-all",
            matching.visto ? "bg-primary/10 text-primary" : "bg-muted text-secondary hover:bg-primary/5"
          )}
        >
          <Eye className="h-3 w-3" />
          {matching.visto ? "Visto" : "Marcar visto"}
        </button>
        <button
          onClick={onDescartar}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium text-secondary hover:bg-red-50 hover:text-red-600 cursor-pointer transition-all"
        >
          <X className="h-3 w-3" />
          Descartar
        </button>
      </div>
    </div>
  );
}
