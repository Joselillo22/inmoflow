"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { ESTADO_INMUEBLE_LABELS, TIPO_INMUEBLE_LABELS } from "@/lib/utils/constants";
import type { PropietarioInmueble } from "@/lib/types/propietario";

const estadoColors: Record<string, { bg: string; text: string }> = {
  EN_CAPTACION: { bg: "bg-blue-50", text: "text-blue-700" },
  ACTIVO: { bg: "bg-emerald-50", text: "text-emerald-700" },
  RESERVADO: { bg: "bg-amber-50", text: "text-amber-700" },
  VENDIDO: { bg: "bg-slate-100", text: "text-slate-600" },
  ALQUILADO: { bg: "bg-slate-100", text: "text-slate-600" },
  RETIRADO: { bg: "bg-red-50", text: "text-red-700" },
};

interface InmueblesPropietarioTabProps {
  inmuebles: PropietarioInmueble[];
}

export function InmueblesPropietarioTab({ inmuebles }: InmueblesPropietarioTabProps) {
  if (inmuebles.length === 0) {
    return <EmptyState icon={<Building2 className="h-8 w-8" />} title="Sin inmuebles" description="Este propietario no tiene inmuebles asociados" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Ref / Titulo</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Estado</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Precio</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Localidad</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Tipo</th>
            <th className="text-center px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Operaciones</th>
          </tr>
        </thead>
        <tbody>
          {inmuebles.map((inm) => {
            const ec = estadoColors[inm.estado] ?? estadoColors.ACTIVO;
            return (
              <tr key={inm.id} className="border-b border-border/30 hover:bg-primary/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-xs font-mono text-secondary">{inm.referencia}</p>
                  <p className="text-base font-semibold text-foreground">{inm.titulo}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-semibold ${ec.bg} ${ec.text}`}>
                    {ESTADO_INMUEBLE_LABELS[inm.estado] ?? inm.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-base font-bold text-foreground">{formatCurrency(Number(inm.precio))}</td>
                <td className="px-4 py-3 text-base text-secondary">{inm.localidad}</td>
                <td className="px-4 py-3 text-sm text-secondary">{TIPO_INMUEBLE_LABELS[inm.tipo] ?? inm.tipo}</td>
                <td className="px-4 py-3 text-center text-base font-bold text-foreground">{inm.operaciones.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
