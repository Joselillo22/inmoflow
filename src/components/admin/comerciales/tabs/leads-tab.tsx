"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreBar } from "@/components/admin/leads/score-bar";
import { Users } from "lucide-react";
import { formatDate, formatPhone } from "@/lib/utils/formatters";
import { FASE_FUNNEL_LABELS } from "@/lib/utils/constants";
import type { ComercialLead } from "@/lib/types/comercial";

const faseColors: Record<string, { bg: string; text: string }> = {
  NUEVO: { bg: "bg-blue-50", text: "text-blue-700" },
  CONTACTADO: { bg: "bg-slate-100", text: "text-slate-600" },
  CUALIFICADO: { bg: "bg-emerald-50", text: "text-emerald-700" },
  VISITA_PROGRAMADA: { bg: "bg-amber-50", text: "text-amber-700" },
  VISITA_REALIZADA: { bg: "bg-orange-50", text: "text-orange-700" },
  OFERTA: { bg: "bg-violet-50", text: "text-violet-700" },
  RESERVA: { bg: "bg-cyan-50", text: "text-cyan-700" },
  CIERRE: { bg: "bg-emerald-50", text: "text-emerald-800" },
  PERDIDO: { bg: "bg-red-50", text: "text-red-700" },
};

interface LeadsTabProps {
  leads: ComercialLead[];
}

export function LeadsTab({ leads }: LeadsTabProps) {
  if (leads.length === 0) {
    return <EmptyState icon={<Users className="h-8 w-8" />} title="Sin leads asignados" description="Este comercial no tiene leads asignados" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Nombre</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Fase</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Score</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Telefono</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Actualizado</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const fc = faseColors[lead.faseFunnel] ?? faseColors.NUEVO;
            return (
              <tr key={lead.id} className="border-b border-border/30 hover:bg-primary/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={`${lead.nombre} ${lead.apellidos ?? ""}`} size="sm" />
                    <div>
                      <p className="text-base font-semibold text-foreground">{lead.nombre} {lead.apellidos ?? ""}</p>
                      {lead.email && <p className="text-sm text-secondary">{lead.email}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-semibold ${fc.bg} ${fc.text}`}>
                    {FASE_FUNNEL_LABELS[lead.faseFunnel] ?? lead.faseFunnel}
                  </span>
                </td>
                <td className="px-4 py-3"><ScoreBar score={lead.score} /></td>
                <td className="px-4 py-3 text-base text-secondary">{lead.telefono ? formatPhone(lead.telefono) : "\u2014"}</td>
                <td className="px-4 py-3 text-sm text-secondary">{formatDate(lead.updatedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
