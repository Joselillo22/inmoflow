"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  Target, Search, Plus, RefreshCw, ExternalLink, Phone, MessageCircle,
  UserPlus, X, CheckCircle2, XCircle, MapPin, Home, Euro, Users,
  Filter, ChevronLeft, ChevronRight, Building2, Copy,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { CaptacionSlideOver } from "@/components/admin/captacion/captacion-slideover";
import { NuevaOportunidadModal } from "@/components/admin/captacion/nueva-oportunidad-modal";

const FASE_LABELS: Record<string, string> = {
  NUEVA: "Nueva",
  CONTACTADA: "Contactada",
  VISITA_PROGRAMADA: "Visita programada",
  VISITADA: "Visitada",
  VALORACION_PRESENTADA: "Valoración presentada",
  PROPUESTA_MANDATO: "Propuesta mandato",
  MANDATO_FIRMADO: "Mandato firmado",
  DESCARTADA: "Descartada",
};

const FASE_COLORS: Record<string, string> = {
  NUEVA: "bg-red-100 text-red-700",
  CONTACTADA: "bg-amber-100 text-amber-700",
  VISITA_PROGRAMADA: "bg-blue-100 text-blue-700",
  VISITADA: "bg-indigo-100 text-indigo-700",
  VALORACION_PRESENTADA: "bg-purple-100 text-purple-700",
  PROPUESTA_MANDATO: "bg-violet-100 text-violet-700",
  MANDATO_FIRMADO: "bg-emerald-100 text-emerald-700",
  DESCARTADA: "bg-slate-100 text-slate-500",
};

const PORTAL_COLORS: Record<string, { cls: string; label: string }> = {
  IDEALISTA: { cls: "bg-violet-100 text-violet-700", label: "Idealista" },
  FOTOCASA: { cls: "bg-blue-100 text-blue-700", label: "Fotocasa" },
  MILANUNCIOS: { cls: "bg-emerald-100 text-emerald-700", label: "Milanuncios" },
  WALLAPOP: { cls: "bg-teal-100 text-teal-700", label: "Wallapop" },
  CARTEL_CALLE: { cls: "bg-amber-100 text-amber-700", label: "Cartel calle" },
  REFERIDO: { cls: "bg-pink-100 text-pink-700", label: "Referido" },
  WEB_PROPIA: { cls: "bg-cyan-100 text-cyan-700", label: "Web propia" },
  PUERTA_FRIA: { cls: "bg-slate-100 text-slate-700", label: "Puerta fría" },
  OTRO: { cls: "bg-slate-100 text-slate-600", label: "Otro" },
};

interface OportunidadItem {
  id: string;
  portal: string;
  operacion: string;
  estado: string;
  titulo: string | null;
  tipoInmueble: string | null;
  precio: string | null;
  localidad: string | null;
  habitaciones: number | null;
  metrosConstruidos: number | null;
  nombrePropietario: string | null;
  telefonoPropietario: string | null;
  urlAnuncio: string | null;
  fechaDeteccion: string;
  comercial: { id: string; usuario: { nombre: string; apellidos: string } } | null;
}

interface Stats {
  resumen: {
    nuevas: number;
    contactadas: number;
    visitaProgramada: number;
    visitadas: number;
    valoracionPresentada: number;
    propuestaMandato: number;
    mandatoFirmado: number;
    descartadas: number;
  };
  tasaConversion: {
    globalNuevaAMandato: number;
  };
  estaSemana: {
    nuevasDetectadas: number;
    contactadas: number;
  };
}

export default function CaptacionPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<OportunidadItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  // Filtros
  const [estado, setEstado] = useState<string>("");
  const [portal, setPortal] = useState<string>("");
  const [operacion, setOperacion] = useState<string>("");
  const [sinAsignar, setSinAsignar] = useState(false);
  const [buscar, setBuscar] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNueva, setShowNueva] = useState(false);
  const [scraping, setScraping] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("limit", String(limit));
    if (estado) qs.set("estado", estado);
    if (portal) qs.set("portal", portal);
    if (operacion) qs.set("operacion", operacion);
    if (sinAsignar) qs.set("sinAsignar", "true");
    if (buscar) qs.set("buscar", buscar);
    const res = await fetch(`/api/captacion?${qs.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.data);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, limit, estado, portal, operacion, sinAsignar, buscar]);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/captacion/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  async function handleScraperRun() {
    toast("El scraper se ejecutará cuando activemos Apify en la próxima fase", "info");
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const enProceso = stats ? stats.resumen.contactadas + stats.resumen.visitaProgramada + stats.resumen.visitadas + stats.resumen.valoracionPresentada + stats.resumen.propuestaMandato : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="h-6 w-6 text-primary" />
          <h1 className="text-lg font-semibold text-foreground">Captación</h1>
          <Badge variant="info" size="md">{total}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleScraperRun} disabled={scraping}>
            <RefreshCw className={`h-3.5 w-3.5 ${scraping ? "animate-spin" : ""}`} /> Ejecutar scraper
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setShowNueva(true)}>
            <Plus className="h-3.5 w-3.5" /> Nueva oportunidad
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Target className="h-4 w-4 text-red-600" />
            </div>
            <span className="text-xs text-secondary">Nuevas sin contactar</span>
          </div>
          <p className="text-4xl font-bold text-red-600">{stats?.resumen.nuevas ?? 0}</p>
          <p className="text-sm text-secondary">Pendientes</p>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-xs text-secondary">En proceso</span>
          </div>
          <p className="text-4xl font-bold text-blue-600">{enProceso}</p>
          <p className="text-sm text-secondary">Contactadas + visitas</p>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-xs text-secondary">Mandatos firmados</span>
          </div>
          <p className="text-4xl font-bold text-emerald-600">{stats?.resumen.mandatoFirmado ?? 0}</p>
          <p className="text-sm text-secondary">Total histórico</p>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Filter className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-xs text-secondary">Conversión global</span>
          </div>
          <p className="text-4xl font-bold text-purple-600">{stats?.tasaConversion.globalNuevaAMandato ?? 0}%</p>
          <p className="text-sm text-secondary">Nueva → Mandato</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary" />
            <input
              type="text"
              value={buscar}
              onChange={(e) => { setBuscar(e.target.value); setPage(1); }}
              placeholder="Buscar por título, dirección, propietario, localidad..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-white border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <select value={estado} onChange={(e) => { setEstado(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-border bg-white px-2 text-xs cursor-pointer">
            <option value="">Todos los estados</option>
            {Object.entries(FASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select value={portal} onChange={(e) => { setPortal(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-border bg-white px-2 text-xs cursor-pointer">
            <option value="">Todos los portales</option>
            {Object.entries(PORTAL_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>

          <select value={operacion} onChange={(e) => { setOperacion(e.target.value); setPage(1); }} className="h-9 rounded-lg border border-border bg-white px-2 text-xs cursor-pointer">
            <option value="">Todas las operaciones</option>
            <option value="VENTA">Venta</option>
            <option value="ALQUILER">Alquiler</option>
          </select>

          <button
            onClick={() => { setSinAsignar(!sinAsignar); setPage(1); }}
            className={`h-9 px-3 rounded-lg border text-xs transition-colors cursor-pointer ${sinAsignar ? "border-orange-400 bg-orange-50 text-orange-700" : "border-border bg-white text-secondary"}`}
          >
            Sin asignar
          </button>

          {(estado || portal || operacion || sinAsignar || buscar) && (
            <button
              onClick={() => { setEstado(""); setPortal(""); setOperacion(""); setSinAsignar(false); setBuscar(""); setPage(1); }}
              className="h-9 px-3 rounded-lg text-xs text-secondary hover:text-foreground cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Target className="h-10 w-10" />} title="Sin oportunidades" description="Crea una nueva o espera a que el scraper detecte anuncios." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/50">
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">Portal</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">Op.</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">Localidad</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">Título</th>
                <th className="text-right px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">Precio</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">Hab/m²</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">Propietario</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">Estado</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">Comercial</th>
              </tr>
            </thead>
            <tbody>
              {items.map((o) => {
                const portalInfo = PORTAL_COLORS[o.portal] ?? PORTAL_COLORS.OTRO;
                return (
                  <tr key={o.id} onClick={() => setSelectedId(o.id)} className="border-b border-border/40 hover:bg-primary/5 cursor-pointer transition-colors">
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${portalInfo.cls}`}>{portalInfo.label}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{o.operacion === "VENTA" ? "Venta" : "Alquiler"}</td>
                    <td className="px-3 py-2.5 text-xs flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-secondary" /> {o.localidad ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-sm font-medium text-foreground max-w-xs truncate">{o.titulo ?? o.tipoInmueble ?? "Sin título"}</td>
                    <td className="px-3 py-2.5 text-sm font-semibold text-right">{o.precio ? formatCurrency(Number(o.precio)) : "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-secondary">
                      {o.habitaciones ? `${o.habitaciones} hab` : ""}
                      {o.habitaciones && o.metrosConstruidos ? " · " : ""}
                      {o.metrosConstruidos ? `${o.metrosConstruidos}m²` : ""}
                      {!o.habitaciones && !o.metrosConstruidos ? "—" : ""}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{o.nombrePropietario ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${FASE_COLORS[o.estado]}`}>{FASE_LABELS[o.estado]}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-secondary">
                      {o.comercial ? `${o.comercial.usuario.nombre} ${o.comercial.usuario.apellidos.slice(0, 1)}.` : "Sin asignar"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/40">
            <span className="text-xs text-secondary">Página {page} de {totalPages}</span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-7 w-7">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 w-7">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <CaptacionSlideOver
        oportunidadId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={() => { fetchItems(); fetchStats(); }}
      />

      <NuevaOportunidadModal
        open={showNueva}
        onClose={() => setShowNueva(false)}
        onCreated={() => { setShowNueva(false); fetchItems(); fetchStats(); }}
      />
    </div>
  );
}
