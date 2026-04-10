"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { OperacionDetailSlideOver } from "@/components/admin/operaciones/operacion-detail-slideover";
import { NuevaOperacionModal } from "@/components/admin/operaciones/nueva-operacion-modal";
import { Search, Handshake, X, Euro, Plus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { ESTADO_OPERACION_LABELS } from "@/lib/utils/constants";
import type { OperacionListItem } from "@/lib/types/operacion";

const estadoVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  EN_NEGOCIACION: "info",
  OFERTA_ACEPTADA: "warning",
  ARRAS_FIRMADAS: "warning",
  PENDIENTE_NOTARIA: "warning",
  CERRADA: "success",
  CAIDA: "danger",
};

export default function OperacionesPage() {
  const [operaciones, setOperaciones] = useState<OperacionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNueva, setShowNueva] = useState(false);

  const fetchOperaciones = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/operaciones");
    if (res.ok) {
      const data = await res.json();
      setOperaciones(data.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOperaciones(); }, [fetchOperaciones]);

  const filtered = operaciones.filter((op) => {
    const matchSearch = !search ||
      `${op.inmueble.titulo} ${op.inmueble.referencia} ${op.lead.nombre} ${op.lead.apellidos ?? ""} ${op.comercial.usuario.nombre}`.toLowerCase().includes(search.toLowerCase());
    const matchEstado = !filterEstado || op.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  // KPIs
  const totalOperaciones = operaciones.length;
  const enCurso = operaciones.filter((o) => !["CERRADA", "CAIDA"].includes(o.estado)).length;
  const cerradas = operaciones.filter((o) => o.estado === "CERRADA").length;
  const facturacionTotal = operaciones
    .filter((o) => o.comision && o.estado === "CERRADA")
    .reduce((sum, o) => sum + Number(o.comision!.total), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Operaciones</h1>
          <Badge variant="info" size="md">{totalOperaciones}</Badge>
        </div>
        <Button size="lg" className="gap-2" onClick={() => setShowNueva(true)}>
          <Plus className="h-5 w-5" /> Nueva operacion
        </Button>
      </div>

      {/* KPI summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "En curso", value: enCurso, color: "text-blue-600" },
          { label: "Cerradas", value: cerradas, color: "text-emerald-600" },
          { label: "Caidas", value: operaciones.filter((o) => o.estado === "CAIDA").length, color: "text-red-600" },
          { label: "Facturacion total", value: formatCurrency(facturacionTotal), color: "text-foreground" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-5">
            <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-sm text-secondary mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por inmueble, comprador, comercial..."
            className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-base text-foreground placeholder:text-secondary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterEstado("")}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer transition-all ${
              !filterEstado ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-secondary hover:border-primary/30"
            }`}
          >
            Todas
          </button>
          {Object.entries(ESTADO_OPERACION_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilterEstado(key === filterEstado ? "" : key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap cursor-pointer transition-all ${
                filterEstado === key ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-secondary hover:border-primary/30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {(search || filterEstado) && (
          <button onClick={() => { setSearch(""); setFilterEstado(""); }} className="flex items-center gap-1.5 text-sm text-secondary hover:text-foreground cursor-pointer">
            <X className="h-4 w-4" /> Limpiar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Inmueble</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Comprador</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Comercial</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Precio</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Comision</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-4 py-4"><Skeleton className="w-40 h-5" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-28 h-7 rounded-lg" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-16 h-4" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-32 h-4" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-28 h-4" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-24 h-5" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-20 h-4" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-20 h-4" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={<Handshake className="h-8 w-8" />}
                      title="No hay operaciones"
                      description={search || filterEstado ? "No se encontraron resultados" : "Aun no se han creado operaciones"}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((op) => (
                  <tr
                    key={op.id}
                    onClick={() => setSelectedId(op.id)}
                    className={`border-b border-border/30 cursor-pointer transition-colors ${
                      selectedId === op.id ? "bg-primary/[0.04]" : "hover:bg-primary/[0.02]"
                    }`}
                  >
                    <td className="px-4 py-4">
                      <p className="text-xs font-mono text-secondary">{op.inmueble.referencia}</p>
                      <p className="text-base font-semibold text-foreground truncate max-w-[220px]">{op.inmueble.titulo}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={estadoVariant[op.estado] ?? "default"} size="sm">
                        {ESTADO_OPERACION_LABELS[op.estado] ?? op.estado}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-base text-secondary">{op.tipo}</td>
                    <td className="px-4 py-4">
                      <p className="text-base font-medium text-foreground">{op.lead.nombre} {op.lead.apellidos ?? ""}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar name={`${op.comercial.usuario.nombre} ${op.comercial.usuario.apellidos}`} size="sm" />
                        <span className="text-sm text-foreground">{op.comercial.usuario.nombre}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-base font-bold text-foreground">{formatCurrency(Number(op.precioFinal))}</td>
                    <td className="px-4 py-4">
                      {op.comision ? (
                        <div>
                          <p className="text-base font-bold text-emerald-600">{formatCurrency(Number(op.comision.total))}</p>
                          <Badge variant={op.comision.estadoPago === "PAGADO" ? "success" : "warning"} size="sm">
                            {op.comision.estadoPago === "PAGADO" ? "Pagado" : "Pendiente"}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-sm text-secondary/50 italic">Sin comision</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-secondary">{formatDate(op.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SlideOver */}
      <OperacionDetailSlideOver
        operacionId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={fetchOperaciones}
      />

      {/* Modal Nueva Operacion */}
      <NuevaOperacionModal
        open={showNueva}
        onClose={() => setShowNueva(false)}
        onCreated={fetchOperaciones}
      />
    </div>
  );
}
