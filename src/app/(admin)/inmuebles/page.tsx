"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoSelector } from "@/components/admin/inmuebles/estado-selector";
import { InmuebleDetailSlideOver } from "@/components/admin/inmuebles/inmueble-detail-slideover";
import {
  Search, Plus, Building2, ChevronLeft, ChevronRight, X,
  LayoutGrid, List, Image as ImageIcon,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { ESTADO_INMUEBLE_LABELS, TIPO_INMUEBLE_LABELS, TIPO_OPERACION_LABELS } from "@/lib/utils/constants";
import { useTranslation } from "react-i18next";
import type { InmuebleListItem } from "@/lib/types/inmueble";

const estadoColors: Record<string, string> = {
  EN_CAPTACION: "bg-blue-500", ACTIVO: "bg-emerald-500", RESERVADO: "bg-amber-500",
  VENDIDO: "bg-slate-400", ALQUILADO: "bg-slate-400", RETIRADO: "bg-red-500",
};

export default function InmueblesPage() {
  const [inmuebles, setInmuebles] = useState<InmuebleListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Abrir slideover si viene ?id= en la URL (deep link)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    if (id) setSelectedId(id);
  }, []);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const { t } = useTranslation();

  const fetchInmuebles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    if (search) params.set("search", search);
    if (estado) params.set("estado", estado);

    const res = await fetch(`/api/inmuebles?${params}`);
    if (res.ok) {
      const data = await res.json();
      setInmuebles(data.data ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [page, limit, search, estado, sortBy, sortOrder]);

  useEffect(() => { fetchInmuebles(); }, [fetchInmuebles]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchInmuebles(); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  function toggleSort(col: string) {
    if (sortBy === col) setSortOrder((o) => o === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortOrder("desc"); }
  }

  async function handleEstadoChange(inmId: string, newEstado: string) {
    await fetch(`/api/inmuebles/${inmId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: newEstado }),
    });
    fetchInmuebles();
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit);

  const SortIcon = ({ col }: { col: string }) => (
    <span className={`ml-1 text-[8px] ${sortBy === col ? "text-primary" : "text-transparent"}`}>
      {sortOrder === "asc" ? "▲" : "▼"}
    </span>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">{t("inmuebles.title")}</h1>
          <Badge variant="info" size="md">{total}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("table")} className={`p-1.5 cursor-pointer transition-colors ${viewMode === "table" ? "bg-primary text-white" : "text-secondary hover:bg-muted"}`}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setViewMode("grid")} className={`p-1.5 cursor-pointer transition-colors ${viewMode === "grid" ? "bg-primary text-white" : "text-secondary hover:bg-muted"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          <Link href="/inmuebles/nuevo">
            <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> {t("inmuebles.new")}</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary/50" />
          <input
            type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.searchPlaceholder")}
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-secondary/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/15 transition-all"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => { setEstado(""); setPage(1); }} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap cursor-pointer transition-all ${!estado ? "bg-primary text-white" : "bg-card border border-border text-secondary hover:border-primary/30"}`}>
            {t("common.all")}
          </button>
          {Object.entries(ESTADO_INMUEBLE_LABELS).map(([key]) => (
            <button key={key} onClick={() => { setEstado(key === estado ? "" : key); setPage(1); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap cursor-pointer transition-all ${estado === key ? "bg-primary text-white" : "bg-card border border-border text-secondary hover:border-primary/30"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${estado === key ? "bg-white" : estadoColors[key]}`} />
              {t(`inmuebles.statuses.${key}`)}
            </button>
          ))}
        </div>
        {(search || estado) && (
          <button onClick={() => { setSearch(""); setEstado(""); setPage(1); }} className="flex items-center gap-1 text-xs text-secondary hover:text-foreground cursor-pointer">
            <X className="h-3 w-3" /> {t("common.clearFilters")}
          </button>
        )}
      </div>

      {/* Table View */}
      {viewMode === "table" && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider w-16">{t("inmuebles.tabs.photos")}</th>
                  <th onClick={() => toggleSort("referencia")} className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider cursor-pointer hover:text-foreground">{t("inmuebles.reference")} <SortIcon col="referencia" /></th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">{t("inmuebles.type")}</th>
                  <th onClick={() => toggleSort("localidad")} className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider cursor-pointer hover:text-foreground">{t("inmuebles.locality")} <SortIcon col="localidad" /></th>
                  <th onClick={() => toggleSort("precio")} className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider cursor-pointer hover:text-foreground">{t("inmuebles.price")} <SortIcon col="precio" /></th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">{t("common.hab")}/m²</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">{t("inmuebles.status")}</th>
                  <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">{t("leads.commercial")}</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider w-12">Fot</th>
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-3 py-2.5"><Skeleton className="w-14 h-10 rounded-lg" /></td>
                    <td className="px-3 py-2.5"><Skeleton className="w-32 h-3.5" /></td>
                    <td className="px-3 py-2.5"><Skeleton className="w-16 h-4 rounded" /></td>
                    <td className="px-3 py-2.5"><Skeleton className="w-20 h-3" /></td>
                    <td className="px-3 py-2.5"><Skeleton className="w-20 h-3.5" /></td>
                    <td className="px-3 py-2.5"><Skeleton className="w-12 h-3 mx-auto" /></td>
                    <td className="px-3 py-2.5"><Skeleton className="w-16 h-5 rounded-md" /></td>
                    <td className="px-3 py-2.5"><Skeleton className="w-24 h-3" /></td>
                    <td className="px-3 py-2.5"><Skeleton className="w-6 h-3 mx-auto" /></td>
                  </tr>
                )) : inmuebles.length === 0 ? (
                  <tr><td colSpan={9}>
                    <EmptyState icon={<Building2 className="h-6 w-6" />} title={t("common.noResults")} description={search || estado ? t("common.noResults") : t("inmuebles.new")} />
                  </td></tr>
                ) : inmuebles.map((inm) => (
                  <tr key={inm.id} onClick={() => setSelectedId(inm.id)} className={`border-b border-border/30 cursor-pointer transition-colors ${selectedId === inm.id ? "bg-primary/[0.04]" : "hover:bg-primary/[0.02]"}`}>
                    <td className="px-3 py-2">
                      <div className="w-14 h-10 rounded-lg bg-muted overflow-hidden">
                        {inm.fotos[0] ? (
                          <img src={inm.fotos[0].url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-4 w-4 text-secondary/30" /></div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="text-[10px] font-mono text-secondary">{inm.referencia}</p>
                      <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{inm.titulo}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] text-secondary">{t(`inmuebles.types.${inm.tipo}`)}</span>
                      <span className="text-[10px] text-secondary/50 block">{t(`inmuebles.operations.${inm.operacion}`)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-secondary">{inm.localidad}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-bold text-foreground">{formatCurrency(Number(inm.precio))}</span>
                      {inm.operacion === "ALQUILER" && <span className="text-[9px] text-secondary">/mes</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-secondary">
                      {inm.habitaciones ?? "-"} / {inm.metrosConstruidos ?? "-"}m²
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <EstadoSelector value={inm.estado} onChange={(e) => handleEstadoChange(inm.id, e)} />
                    </td>
                    <td className="px-3 py-2.5">
                      {inm.comercial ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={`${inm.comercial.usuario.nombre} ${inm.comercial.usuario.apellidos}`} size="sm" />
                          <span className="text-[11px] text-secondary truncate max-w-[80px]">{inm.comercial.usuario.nombre}</span>
                        </div>
                      ) : <span className="text-[10px] text-secondary/50">{t("leads.unassigned")}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-foreground">{inm._count.fotos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {total > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <span className="text-[11px] text-secondary">{t("common.showing")} {from}-{to} {t("common.of")} {total}</span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-7 w-7"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <span className="text-xs font-medium text-foreground px-2">{page} / {totalPages}</span>
                <Button size="icon" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 w-7"><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="grid grid-cols-3 gap-4">
          {loading ? Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/70 rounded-2xl overflow-hidden">
              <Skeleton className="w-full h-36" />
              <div className="p-4 space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
            </div>
          )) : inmuebles.map((inm) => (
            <div
              key={inm.id}
              onClick={() => setSelectedId(inm.id)}
              className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
            >
              <div className="relative h-36 bg-slate-100">
                {inm.fotos[0] ? (
                  <img src={inm.fotos[0].url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Building2 className="h-8 w-8 text-secondary/20" /></div>
                )}
                <div className="absolute top-2 left-2">
                  <EstadoSelector value={inm.estado} onChange={(e) => handleEstadoChange(inm.id, e)} />
                </div>
                <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-0.5 rounded-md text-sm font-bold">
                  {formatCurrency(Number(inm.precio))}
                </div>
              </div>
              <div className="p-3.5">
                <p className="text-[10px] font-mono text-secondary">{inm.referencia}</p>
                <p className="text-sm font-medium text-foreground truncate">{inm.titulo}</p>
                <p className="text-xs text-secondary mt-0.5">
                  {t(`inmuebles.types.${inm.tipo}`)} · {inm.localidad}
                  {inm.habitaciones ? ` · ${inm.habitaciones} ${t("common.hab")}` : ""}
                  {inm.metrosConstruidos ? ` · ${inm.metrosConstruidos}m²` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SlideOver */}
      <InmuebleDetailSlideOver inmuebleId={selectedId} onClose={() => setSelectedId(null)} onUpdated={fetchInmuebles} />
    </div>
  );
}
