"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ComercialDetailSlideOver } from "@/components/admin/comerciales/comercial-detail-slideover";
import { Search, Plus, UserCircle, MapPin, Phone } from "lucide-react";
import { formatPhone, formatDate } from "@/lib/utils/formatters";
import type { ComercialListItem } from "@/lib/types/comercial";

export default function ComercialesPage() {
  const [comerciales, setComerciales] = useState<ComercialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActivo, setFilterActivo] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchComerciales = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/comerciales");
    if (res.ok) {
      const data = await res.json();
      setComerciales(data.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchComerciales(); }, [fetchComerciales]);

  const filtered = comerciales.filter((c) => {
    const matchSearch = !search ||
      `${c.usuario.nombre} ${c.usuario.apellidos} ${c.usuario.email} ${c.zona}`.toLowerCase().includes(search.toLowerCase());
    const matchActivo = !filterActivo ||
      (filterActivo === "activo" ? c.activo : !c.activo);
    return matchSearch && matchActivo;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Comerciales</h1>
          <Badge variant="info" size="md">{comerciales.length}</Badge>
        </div>
        <Button size="lg" className="gap-2">
          <Plus className="h-5 w-5" /> Nuevo comercial
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, zona..."
            className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-base text-foreground placeholder:text-secondary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilterActivo("")}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer transition-all ${
              !filterActivo ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-secondary hover:border-primary/30"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterActivo(filterActivo === "activo" ? "" : "activo")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer transition-all ${
              filterActivo === "activo" ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-secondary hover:border-primary/30"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filterActivo === "activo" ? "bg-white" : "bg-emerald-500"}`} />
            Activos
          </button>
          <button
            onClick={() => setFilterActivo(filterActivo === "inactivo" ? "" : "inactivo")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap cursor-pointer transition-all ${
              filterActivo === "inactivo" ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-secondary hover:border-primary/30"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${filterActivo === "inactivo" ? "bg-white" : "bg-red-500"}`} />
            Inactivos
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Comercial</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Estado</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Zona</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Telefono</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Leads</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Inmuebles</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Visitas</th>
                <th className="text-center px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Operaciones</th>
                <th className="text-left px-4 py-4 text-xs font-semibold text-secondary/70 uppercase tracking-wider">Alta</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-4 py-4"><div className="flex items-center gap-3"><Skeleton className="w-10 h-10 rounded-full" /><Skeleton className="w-36 h-5" /></div></td>
                    <td className="px-4 py-4"><Skeleton className="w-16 h-7 rounded-lg" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-24 h-4" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-28 h-4" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-8 h-5 mx-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-8 h-5 mx-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-8 h-5 mx-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-8 h-5 mx-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="w-20 h-4" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={<UserCircle className="h-8 w-8" />}
                      title="No hay comerciales"
                      description={search ? "No se encontraron resultados" : "Anade tu primer comercial"}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`border-b border-border/30 cursor-pointer transition-colors ${
                      selectedId === c.id ? "bg-primary/[0.04]" : "hover:bg-primary/[0.02]"
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={`${c.usuario.nombre} ${c.usuario.apellidos}`} size="sm" />
                        <div>
                          <p className="text-base font-semibold text-foreground">{c.usuario.nombre} {c.usuario.apellidos}</p>
                          <p className="text-sm text-secondary">{c.usuario.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <Badge variant={c.activo ? "success" : "danger"} size="sm">
                        {c.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-secondary shrink-0" />
                        <span className="text-base text-foreground">{c.zona}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-4 w-4 text-secondary shrink-0" />
                        <span className="text-base text-secondary">{formatPhone(c.telefono)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-base font-bold text-foreground">{c._count.leads}</td>
                    <td className="px-4 py-4 text-center text-base font-bold text-foreground">{c._count.inmuebles}</td>
                    <td className="px-4 py-4 text-center text-base font-bold text-foreground">{c._count.visitas}</td>
                    <td className="px-4 py-4 text-center text-base font-bold text-foreground">{c._count.operaciones}</td>
                    <td className="px-4 py-4 text-sm text-secondary">{formatDate(c.fechaAlta)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SlideOver */}
      <ComercialDetailSlideOver
        comercialId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={fetchComerciales}
      />
    </div>
  );
}
