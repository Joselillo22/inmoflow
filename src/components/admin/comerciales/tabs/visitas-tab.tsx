"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Eye, MapPin } from "lucide-react";
import { formatDateTime } from "@/lib/utils/formatters";
import { RESULTADO_VISITA_LABELS } from "@/lib/utils/constants";
import type { ComercialVisita } from "@/lib/types/comercial";

const resultadoColors: Record<string, string> = {
  PENDIENTE: "info",
  REALIZADA_INTERESADO: "success",
  REALIZADA_NO_INTERESADO: "warning",
  CANCELADA: "danger",
  NO_SHOW: "danger",
};

interface VisitasTabProps {
  visitas: ComercialVisita[];
}

export function VisitasTab({ visitas }: VisitasTabProps) {
  if (visitas.length === 0) {
    return <EmptyState icon={<Eye className="h-8 w-8" />} title="Sin visitas" description="Este comercial no tiene visitas registradas" />;
  }

  return (
    <div className="p-5 space-y-1">
      {visitas.map((visita, i) => (
        <div key={visita.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-primary shrink-0 mt-1.5" />
            {i < visitas.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
          </div>

          {/* Content */}
          <div className="pb-5 flex-1">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-sm font-medium text-secondary">{formatDateTime(visita.fecha)}</span>
              <Badge
                variant={resultadoColors[visita.resultado] as "info" | "success" | "warning" | "danger"}
                size="sm"
              >
                {RESULTADO_VISITA_LABELS[visita.resultado] ?? visita.resultado.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-base font-semibold text-foreground">
              {visita.lead.nombre} {visita.lead.apellidos ?? ""}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin className="h-4 w-4 text-secondary shrink-0" />
              <p className="text-sm text-secondary">{visita.inmueble.titulo}</p>
            </div>
            {visita.notasDespues && (
              <p className="text-sm text-secondary/70 mt-1 italic line-clamp-2">{visita.notasDespues}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
