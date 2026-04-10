"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Euro } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import type { ComercialComision } from "@/lib/types/comercial";

const estadoPagoConfig: Record<string, { variant: "success" | "warning" | "info"; label: string }> = {
  PAGADO: { variant: "success", label: "Pagado" },
  PENDIENTE: { variant: "warning", label: "Pendiente" },
  PARCIAL: { variant: "info", label: "Parcial" },
};

interface ComisionesTabProps {
  comisiones: ComercialComision[];
}

export function ComisionesTab({ comisiones }: ComisionesTabProps) {
  if (comisiones.length === 0) {
    return <EmptyState icon={<Euro className="h-8 w-8" />} title="Sin comisiones" description="Este comercial no tiene comisiones registradas" />;
  }

  const totalComision = comisiones.reduce((s, c) => s + Number(c.total), 0);
  const totalEmpresa = comisiones.reduce((s, c) => s + Number(c.importeEmpresa), 0);
  const totalComercial = comisiones.reduce((s, c) => s + Number(c.importeComercial), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Operacion</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Precio final</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Comision</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Empresa (70%)</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Comercial (30%)</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Estado</th>
          </tr>
        </thead>
        <tbody>
          {comisiones.map((com) => {
            const ep = estadoPagoConfig[com.estadoPago] ?? estadoPagoConfig.PENDIENTE;
            return (
              <tr key={com.id} className="border-b border-border/30 hover:bg-primary/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <p className="text-base font-semibold text-foreground">{com.operacion.inmueble.referencia}</p>
                  <p className="text-sm text-secondary">{com.operacion.tipo} - {com.operacion.lead.nombre} {com.operacion.lead.apellidos ?? ""}</p>
                </td>
                <td className="px-4 py-3 text-base text-foreground">{formatCurrency(Number(com.operacion.precioFinal))}</td>
                <td className="px-4 py-3 text-base font-bold text-foreground">{formatCurrency(Number(com.total))}</td>
                <td className="px-4 py-3 text-base text-secondary">{formatCurrency(Number(com.importeEmpresa))}</td>
                <td className="px-4 py-3 text-base font-bold text-emerald-600">{formatCurrency(Number(com.importeComercial))}</td>
                <td className="px-4 py-3">
                  <Badge variant={ep.variant} size="sm">{ep.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
        {/* Totals row */}
        <tfoot>
          <tr className="border-t-2 border-border bg-muted/50">
            <td className="px-4 py-3 text-base font-bold text-foreground">TOTAL</td>
            <td className="px-4 py-3" />
            <td className="px-4 py-3 text-base font-bold text-foreground">{formatCurrency(totalComision)}</td>
            <td className="px-4 py-3 text-base font-bold text-secondary">{formatCurrency(totalEmpresa)}</td>
            <td className="px-4 py-3 text-base font-bold text-emerald-600">{formatCurrency(totalComercial)}</td>
            <td className="px-4 py-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
