"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Handshake, AlertTriangle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { ESTADO_OPERACION_LABELS } from "@/lib/utils/constants";
import type { PropietarioInmueble } from "@/lib/types/propietario";

const PBC_THRESHOLD = 10000;

const estadoVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  EN_NEGOCIACION: "info",
  OFERTA_ACEPTADA: "warning",
  ARRAS_FIRMADAS: "warning",
  PENDIENTE_NOTARIA: "warning",
  CERRADA: "success",
  CAIDA: "danger",
};

interface OperacionesPropietarioTabProps {
  inmuebles: PropietarioInmueble[];
  kycVerificado: boolean;
}

export function OperacionesPropietarioTab({ inmuebles, kycVerificado }: OperacionesPropietarioTabProps) {
  const operaciones = inmuebles.flatMap((inm) =>
    inm.operaciones.map((op) => ({ ...op, inmuebleRef: inm.referencia, inmuebleTitulo: inm.titulo }))
  );

  if (operaciones.length === 0) {
    return <EmptyState icon={<Handshake className="h-8 w-8" />} title="Sin operaciones" description="No hay operaciones relacionadas con los inmuebles de este propietario" />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Inmueble</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Tipo</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Precio</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Estado</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Comprador</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">KYC</th>
          </tr>
        </thead>
        <tbody>
          {operaciones.map((op) => {
            const needsKYC = Number(op.precioFinal) >= PBC_THRESHOLD && !kycVerificado;
            return (
              <tr key={op.id} className={`border-b border-border/30 transition-colors ${needsKYC ? "bg-red-50/50" : "hover:bg-primary/[0.02]"}`}>
                <td className="px-4 py-3">
                  <p className="text-xs font-mono text-secondary">{op.inmuebleRef}</p>
                  <p className="text-base font-semibold text-foreground">{op.inmuebleTitulo}</p>
                </td>
                <td className="px-4 py-3 text-base text-secondary">{op.tipo}</td>
                <td className="px-4 py-3 text-base font-bold text-foreground">{formatCurrency(Number(op.precioFinal))}</td>
                <td className="px-4 py-3">
                  <Badge variant={estadoVariant[op.estado] ?? "default"} size="sm">
                    {ESTADO_OPERACION_LABELS[op.estado] ?? op.estado}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-base text-foreground">
                  {op.lead.nombre} {op.lead.apellidos ?? ""}
                </td>
                <td className="px-4 py-3">
                  {needsKYC ? (
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <Badge variant="danger" size="sm">KYC Requerido</Badge>
                    </div>
                  ) : Number(op.precioFinal) >= PBC_THRESHOLD ? (
                    <Badge variant="success" size="sm">KYC OK</Badge>
                  ) : (
                    <span className="text-sm text-secondary/50">No requerido</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
