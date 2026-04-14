"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  Wrench, Search, Plus, Star, Phone, Mail,
  FileText, Clock, CheckCircle, Send, AlertTriangle,
  ChevronRight, X, Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import {
  CATEGORIA_PROVEEDOR_LABELS, CATEGORIA_PROVEEDOR_COLORS,
  ESTADO_TRABAJO_LABELS, ESTADO_TRABAJO_COLORS,
} from "@/lib/utils/constants";

// ─── Types ──────────────────────────────────────────────
interface Proveedor {
  id: string;
  nombre: string;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  categorias: string[];
  valoracionMedia: number | null;
  totalTrabajos: number;
  activo: boolean;
  _count: { solicitudes: number };
}

interface Trabajo {
  id: string;
  referencia: string;
  titulo: string;
  categoria: string;
  estado: string;
  fechaLimite: string | null;
  inmueble: { titulo: string; referencia: string } | null;
  respondidos: number;
  totalSolicitudes: number;
  createdAt: string;
}

interface Solicitud {
  id: string;
  proveedorId: string;
  enviadaAt: string | null;
  respondida: boolean;
  respondidaAt: string | null;
  importe: number | null;
  detallePresupuesto: string | null;
  seleccionada: boolean;
  recordatoriosEnviados: number;
  proveedor: { id: string; nombre: string; telefono: string | null; valoracionMedia: number | null };
}

interface TrabajoDetail {
  id: string;
  referencia: string;
  titulo: string;
  descripcion: string | null;
  categoria: string;
  estado: string;
  fechaLimite: string | null;
  adjudicadoId: string | null;
  importeAdjudicado: number | null;
  notas: string | null;
  inmueble: { id: string; titulo: string; referencia: string; direccion: string } | null;
  solicitudes: Solicitud[];
}

const categorias = Object.keys(CATEGORIA_PROVEEDOR_LABELS);

// ─── Stars Component ────────────────────────────────────
function Stars({ rating, size = "sm" }: { rating: number | null; size?: "sm" | "md" }) {
  const r = rating ?? 0;
  const cls = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${cls} ${i <= r ? "text-amber-500 fill-amber-500" : "text-slate-200"}`} />
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────
export default function ProveedoresPage() {
  const [tab, setTab] = useState<"proveedores" | "trabajos">("proveedores");
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Wrench className="h-5 w-5 text-secondary" />
          {t("proveedores.title")}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(["proveedores", "trabajos"] as const).map((t2) => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === t2 ? "bg-background shadow-sm text-foreground" : "text-secondary hover:text-foreground"
            }`}
          >
            {t2 === "proveedores" ? t("proveedores.tab_proveedores") : t("proveedores.tab_trabajos")}
          </button>
        ))}
      </div>

      {tab === "proveedores" && <ProveedoresTab />}
      {tab === "trabajos" && <TrabajosTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB PROVEEDORES
// ═══════════════════════════════════════════════════════
function ProveedoresTab() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterCat) params.set("categoria", filterCat);
    fetch(`/api/proveedores?${params}`)
      .then((r) => r.json())
      .then((d) => setProveedores(d.data ?? []))
      .finally(() => setLoading(false));
  }, [search, filterCat]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <>
      {/* Search + filter + button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proveedor..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="h-10 border border-border rounded-xl px-3 text-sm bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{CATEGORIA_PROVEEDOR_LABELS[c]}</option>
          ))}
        </select>
        <Button onClick={() => setShowModal(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> {t("proveedores.nuevo_proveedor")}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : proveedores.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="h-10 w-10 text-secondary/20 mx-auto mb-3" />
          <p className="text-sm text-secondary">{t("proveedores.sin_proveedores")}</p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_150px_120px_80px_80px] gap-3 px-5 py-3 border-b border-border">
            {["NOMBRE", "CATEGORÍAS", "TELÉFONO", "RATING", "TRABAJOS"].map((h) => (
              <span key={h} className="text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {proveedores.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={`grid grid-cols-[1fr_150px_120px_80px_80px] gap-3 px-5 py-3.5 border-b border-border/30 items-center hover:bg-primary/[0.02] cursor-pointer transition-colors ${!p.activo ? "opacity-50" : ""}`}
            >
              <div>
                <p className="text-sm font-medium text-foreground">{p.nombre}</p>
                {p.contacto && <p className="text-xs text-secondary">{p.contacto}</p>}
              </div>
              <div className="flex flex-wrap gap-1">
                {p.categorias.slice(0, 2).map((c) => (
                  <span key={c} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORIA_PROVEEDOR_COLORS[c] ?? "bg-gray-100 text-gray-600"}`}>
                    {CATEGORIA_PROVEEDOR_LABELS[c] ?? c}
                  </span>
                ))}
                {p.categorias.length > 2 && (
                  <span className="text-[10px] text-secondary">+{p.categorias.length - 2}</span>
                )}
              </div>
              <span className="text-sm text-secondary">{p.telefono ?? "—"}</span>
              <Stars rating={p.valoracionMedia} />
              <span className="text-sm font-bold text-foreground">{p.totalTrabajos}</span>
            </div>
          ))}
        </div>
      )}

      {/* Modal nuevo proveedor */}
      {showModal && <NuevoProveedorModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); fetchData(); }} />}

      {/* Slideover detalle */}
      {selectedId && <ProveedorSlideover proveedorId={selectedId} onClose={() => setSelectedId(null)} onUpdated={fetchData} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// TAB TRABAJOS
// ═══════════════════════════════════════════════════════
function TrabajosTab() {
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchData = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterEstado) params.set("estado", filterEstado);
    fetch(`/api/trabajos?${params}`)
      .then((r) => r.json())
      .then((d) => setTrabajos(d.data ?? []))
      .finally(() => setLoading(false));
  }, [search, filterEstado]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar trabajo..."
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="h-10 border border-border rounded-xl px-3 text-sm bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_TRABAJO_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <Button onClick={() => setShowModal(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> {t("proveedores.nuevo_trabajo")}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : trabajos.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-10 w-10 text-secondary/20 mx-auto mb-3" />
          <p className="text-sm text-secondary">{t("proveedores.sin_trabajos")}</p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[80px_1fr_110px_100px_100px_90px] gap-3 px-5 py-3 border-b border-border">
            {["REF", "TÍTULO", "CATEGORÍA", "ESTADO", "PRESUPUESTOS", "FECHA"].map((h) => (
              <span key={h} className="text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {trabajos.map((t2) => (
            <div
              key={t2.id}
              onClick={() => setSelectedId(t2.id)}
              className="grid grid-cols-[80px_1fr_110px_100px_100px_90px] gap-3 px-5 py-3.5 border-b border-border/30 items-center hover:bg-primary/[0.02] cursor-pointer transition-colors"
            >
              <span className="text-xs font-mono text-secondary">{t2.referencia}</span>
              <div>
                <p className="text-sm font-medium text-foreground truncate">{t2.titulo}</p>
                {t2.inmueble && <p className="text-[10px] text-secondary truncate">{t2.inmueble.referencia} — {t2.inmueble.titulo}</p>}
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full text-center ${CATEGORIA_PROVEEDOR_COLORS[t2.categoria] ?? ""}`}>
                {CATEGORIA_PROVEEDOR_LABELS[t2.categoria]}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full text-center ${ESTADO_TRABAJO_COLORS[t2.estado] ?? ""}`}>
                {ESTADO_TRABAJO_LABELS[t2.estado]}
              </span>
              <span className="text-sm text-foreground">
                <span className="font-bold">{t2.respondidos}</span>
                <span className="text-secondary">/{t2.totalSolicitudes}</span>
              </span>
              <span className="text-xs text-secondary">{formatDate(t2.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      {showModal && <NuevoTrabajoModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); fetchData(); }} />}
      {selectedId && <TrabajoSlideover trabajoId={selectedId} onClose={() => setSelectedId(null)} onUpdated={fetchData} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// MODAL: NUEVO PROVEEDOR
// ═══════════════════════════════════════════════════════
function NuevoProveedorModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedCats.length === 0) { toast("Selecciona al menos una categoría", "warning"); return; }
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      nombre: fd.get("nombre"),
      contacto: fd.get("contacto") || undefined,
      telefono: fd.get("telefono") || undefined,
      email: fd.get("email") || undefined,
      categorias: selectedCats,
      notas: fd.get("notas") || undefined,
    };
    const res = await fetch("/api/proveedores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { toast("Proveedor creado", "success"); onCreated(); }
    else { const err = await res.json(); toast(err.error ?? "Error", "error"); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-bold">Nuevo proveedor</h3>
          <button onClick={onClose} className="text-secondary hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1">Nombre empresa *</label>
            <input name="nombre" required className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Persona de contacto</label>
            <input name="contacto" className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Teléfono</label>
              <input name="telefono" className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Email</label>
              <input name="email" type="email" className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-2">Categorías *</label>
            <div className="grid grid-cols-3 gap-1.5">
              {categorias.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
                  className={`text-[11px] px-2 py-1.5 rounded-lg border text-center transition-colors cursor-pointer ${
                    selectedCats.includes(c) ? "border-primary bg-primary/10 font-semibold text-foreground" : "border-border text-secondary hover:border-primary/40"
                  }`}
                >
                  {CATEGORIA_PROVEEDOR_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Notas</label>
            <textarea name="notas" rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <Button type="submit" disabled={saving} className="w-full gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? "Guardando..." : "Crear proveedor"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MODAL: NUEVO TRABAJO
// ═══════════════════════════════════════════════════════
function NuevoTrabajoModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [inmuebles, setInmuebles] = useState<{ id: string; titulo: string; referencia: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/inmuebles?limit=200").then((r) => r.json()).then((d) => setInmuebles(d.data ?? [])).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      titulo: fd.get("titulo"),
      descripcion: fd.get("descripcion") || undefined,
      categoria: fd.get("categoria"),
      inmuebleId: fd.get("inmuebleId") || undefined,
      fechaLimite: fd.get("fechaLimite") || undefined,
      notas: fd.get("notas") || undefined,
    };
    const res = await fetch("/api/trabajos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { toast("Trabajo creado", "success"); onCreated(); }
    else { const err = await res.json(); toast(err.error ?? "Error", "error"); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-bold">Nuevo trabajo</h3>
          <button onClick={onClose} className="text-secondary hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1">Título *</label>
            <input name="titulo" required className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Ej: Cambiar tuberías baño principal" />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Descripción</label>
            <textarea name="descripcion" rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" placeholder="Detalla el trabajo a realizar..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Categoría *</label>
              <select name="categoria" required className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">Seleccionar...</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{CATEGORIA_PROVEEDOR_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Fecha límite</label>
              <input name="fechaLimite" type="date" className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Inmueble (opcional)</label>
            <select name="inmuebleId" className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option value="">Sin vincular</option>
              {inmuebles.map((i) => (
                <option key={i.id} value={i.id}>{i.referencia} — {i.titulo}</option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={saving} className="w-full gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? "Creando..." : "Crear trabajo"}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SLIDEOVER: PROVEEDOR DETALLE
// ═══════════════════════════════════════════════════════
function ProveedorSlideover({ proveedorId, onClose, onUpdated }: { proveedorId: string; onClose: () => void; onUpdated: () => void }) {
  const [data, setData] = useState<Proveedor & { solicitudes: { id: string; importe: number | null; respondida: boolean; seleccionada: boolean; trabajo: { referencia: string; titulo: string; estado: string } }[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/proveedores/${proveedorId}`).then((r) => r.json()).then((d) => { setData(d.data); setLoading(false); });
  }, [proveedorId]);

  if (loading || !data) return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="w-[500px] bg-background h-full p-5" onClick={(e) => e.stopPropagation()}>
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="w-[500px] bg-background h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
          <div>
            <p className="text-base font-bold text-foreground">{data.nombre}</p>
            {data.contacto && <p className="text-xs text-secondary">{data.contacto}</p>}
          </div>
          <button onClick={onClose} className="text-secondary hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Stars rating={data.valoracionMedia} size="md" />
              <span className="text-sm text-secondary">({data.totalTrabajos} trabajos)</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.categorias.map((c) => (
                <span key={c} className={`text-xs font-semibold px-2 py-1 rounded-full ${CATEGORIA_PROVEEDOR_COLORS[c] ?? ""}`}>
                  {CATEGORIA_PROVEEDOR_LABELS[c]}
                </span>
              ))}
            </div>
            {data.telefono && (
              <div className="flex items-center gap-2 text-sm text-secondary">
                <Phone className="h-4 w-4" /> {data.telefono}
              </div>
            )}
            {data.email && (
              <div className="flex items-center gap-2 text-sm text-secondary">
                <Mail className="h-4 w-4" /> {data.email}
              </div>
            )}
          </div>

          {/* Historial */}
          <div>
            <p className="text-xs font-semibold text-foreground mb-3">Historial de solicitudes</p>
            {data.solicitudes.length === 0 ? (
              <p className="text-xs text-secondary text-center py-4">Sin solicitudes</p>
            ) : (
              <div className="space-y-2">
                {data.solicitudes.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-white/60">
                    <div>
                      <p className="text-sm font-medium">{s.trabajo.referencia} — {s.trabajo.titulo}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ESTADO_TRABAJO_COLORS[s.trabajo.estado] ?? ""}`}>
                        {ESTADO_TRABAJO_LABELS[s.trabajo.estado]}
                      </span>
                    </div>
                    <div className="text-right">
                      {s.respondida ? (
                        <>
                          <p className="text-sm font-bold text-foreground">{s.importe ? formatCurrency(Number(s.importe)) : "—"}</p>
                          {s.seleccionada && <Badge size="sm" variant="success">Seleccionado</Badge>}
                        </>
                      ) : (
                        <Badge size="sm" variant="warning">Pendiente</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SLIDEOVER: TRABAJO DETALLE
// ═══════════════════════════════════════════════════════
function TrabajoSlideover({ trabajoId, onClose, onUpdated }: { trabajoId: string; onClose: () => void; onUpdated: () => void }) {
  const [data, setData] = useState<TrabajoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"detalle" | "presupuestos">("detalle");
  const [showEnviar, setShowEnviar] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(() => {
    fetch(`/api/trabajos/${trabajoId}`).then((r) => r.json()).then((d) => { setData(d.data); setLoading(false); });
  }, [trabajoId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function seleccionarGanador(solicitudId: string) {
    const res = await fetch(`/api/trabajos/${trabajoId}/solicitudes/${solicitudId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seleccionar: true }),
    });
    if (res.ok) { toast("Proveedor seleccionado", "success"); fetchData(); onUpdated(); }
  }

  async function registrarPresupuesto(solicitudId: string) {
    const importeStr = prompt("Importe del presupuesto (€):");
    if (!importeStr) return;
    const importe = parseFloat(importeStr);
    if (isNaN(importe) || importe <= 0) { toast("Importe inválido", "error"); return; }
    const detalle = prompt("Detalle (opcional):") ?? "";

    const res = await fetch(`/api/trabajos/${trabajoId}/solicitudes/${solicitudId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ importe, detallePresupuesto: detalle || undefined }),
    });
    if (res.ok) { toast("Presupuesto registrado", "success"); fetchData(); onUpdated(); }
  }

  if (loading || !data) return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="w-[560px] bg-background h-full p-5" onClick={(e) => e.stopPropagation()}>
        <Skeleton className="h-6 w-48 mb-4" /><Skeleton className="h-32" />
      </div>
    </div>
  );

  const respondidos = data.solicitudes.filter((s) => s.respondida);
  const pendientes = data.solicitudes.filter((s) => !s.respondida && s.enviadaAt);
  const sinEnviar = data.solicitudes.filter((s) => !s.enviadaAt);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="w-[560px] bg-background h-full overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-mono text-secondary">{data.referencia}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ESTADO_TRABAJO_COLORS[data.estado] ?? ""}`}>
                {ESTADO_TRABAJO_LABELS[data.estado]}
              </span>
            </div>
            <p className="text-base font-bold text-foreground">{data.titulo}</p>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-foreground cursor-pointer"><X className="h-5 w-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 mx-5 mt-3 bg-muted rounded-lg w-fit">
          {(["detalle", "presupuestos"] as const).map((t2) => (
            <button
              key={t2}
              onClick={() => setActiveTab(t2)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeTab === t2 ? "bg-background shadow-sm" : "text-secondary hover:text-foreground"
              }`}
            >
              {t2 === "detalle" ? "Detalle" : `Presupuestos (${respondidos.length}/${data.solicitudes.length})`}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "detalle" && (
            <div className="space-y-4">
              <div className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block ${CATEGORIA_PROVEEDOR_COLORS[data.categoria] ?? ""}`}>
                {CATEGORIA_PROVEEDOR_LABELS[data.categoria]}
              </div>
              {data.descripcion && <p className="text-sm text-foreground">{data.descripcion}</p>}
              {data.inmueble && (
                <div className="p-3 rounded-xl bg-muted">
                  <p className="text-xs text-secondary">Inmueble vinculado</p>
                  <p className="text-sm font-medium">{data.inmueble.referencia} — {data.inmueble.titulo}</p>
                  <p className="text-xs text-secondary">{data.inmueble.direccion}</p>
                </div>
              )}
              {data.fechaLimite && (
                <p className="text-sm text-secondary flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> Fecha límite: {formatDate(data.fechaLimite)}
                </p>
              )}
              {data.importeAdjudicado && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <p className="text-xs text-emerald-600">Importe adjudicado</p>
                  <p className="text-xl font-bold text-emerald-700">{formatCurrency(Number(data.importeAdjudicado))}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-border">
                {data.estado === "BORRADOR" && (
                  <Button size="sm" onClick={() => setShowEnviar(true)} className="gap-1.5">
                    <Send className="h-3.5 w-3.5" /> Enviar solicitudes
                  </Button>
                )}
                {["ENVIADO", "EN_CURSO"].includes(data.estado) && (
                  <Button size="sm" variant="outline" onClick={() => setShowEnviar(true)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Añadir proveedores
                  </Button>
                )}
              </div>
            </div>
          )}

          {activeTab === "presupuestos" && (
            <div className="space-y-3">
              {/* Respondidos */}
              {respondidos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Presupuestos recibidos ({respondidos.length})
                  </p>
                  <div className="space-y-2">
                    {respondidos.sort((a, b) => Number(a.importe ?? 0) - Number(b.importe ?? 0)).map((s) => (
                      <div key={s.id} className={`p-3.5 rounded-xl border ${s.seleccionada ? "border-emerald-300 bg-emerald-50" : "border-border bg-white/60"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">{s.proveedor.nombre}</p>
                            {s.seleccionada && <Badge size="sm" variant="success">Seleccionado</Badge>}
                          </div>
                          <p className="text-lg font-bold text-foreground">{formatCurrency(Number(s.importe ?? 0))}</p>
                        </div>
                        {s.detallePresupuesto && <p className="text-xs text-secondary mt-1">{s.detallePresupuesto}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Stars rating={s.proveedor.valoracionMedia} />
                          {!s.seleccionada && data.estado !== "ADJUDICADO" && (
                            <button
                              onClick={() => seleccionarGanador(s.id)}
                              className="ml-auto text-xs font-semibold text-primary hover:text-primary/80 cursor-pointer"
                            >
                              Seleccionar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pendientes */}
              {pendientes.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-500" /> Esperando respuesta ({pendientes.length})
                  </p>
                  <div className="space-y-2">
                    {pendientes.map((s) => {
                      const dias = Math.floor((Date.now() - new Date(s.enviadaAt!).getTime()) / 86400000);
                      return (
                        <div key={s.id} className="p-3.5 rounded-xl border border-border/50 bg-slate-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-foreground">{s.proveedor.nombre}</p>
                              <p className="text-xs text-secondary">{dias} día{dias !== 1 ? "s" : ""} esperando · {s.recordatoriosEnviados} recordatorio{s.recordatoriosEnviados !== 1 ? "s" : ""}</p>
                            </div>
                            <button
                              onClick={() => registrarPresupuesto(s.id)}
                              className="text-xs font-semibold text-primary hover:text-primary/80 cursor-pointer"
                            >
                              Registrar presupuesto
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {data.solicitudes.length === 0 && (
                <div className="text-center py-8">
                  <Send className="h-8 w-8 text-secondary/20 mx-auto mb-2" />
                  <p className="text-sm text-secondary">No hay solicitudes enviadas</p>
                  <button onClick={() => setShowEnviar(true)} className="text-sm text-primary font-semibold mt-2 cursor-pointer">
                    Enviar solicitudes
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {showEnviar && <EnviarSolicitudesModal trabajoId={data.id} categoria={data.categoria} onClose={() => setShowEnviar(false)} onSent={() => { setShowEnviar(false); fetchData(); onUpdated(); }} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MODAL: ENVIAR SOLICITUDES
// ═══════════════════════════════════════════════════════
function EnviarSolicitudesModal({ trabajoId, categoria, onClose, onSent }: { trabajoId: string; categoria: string; onClose: () => void; onSent: () => void }) {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [via, setVia] = useState<"whatsapp" | "manual">("whatsapp");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetch(`/api/proveedores?categoria=${categoria}&limit=100`)
      .then((r) => r.json())
      .then((d) => {
        const activos = (d.data ?? []).filter((p: Proveedor) => p.activo);
        setProveedores(activos);
        setSelected(new Set(activos.map((p: Proveedor) => p.id)));
        setLoading(false);
      });
  }, [categoria]);

  function toggleAll() {
    if (selected.size === proveedores.length) setSelected(new Set());
    else setSelected(new Set(proveedores.map((p) => p.id)));
  }

  async function handleSend() {
    if (selected.size === 0) { toast("Selecciona al menos un proveedor", "warning"); return; }
    setSending(true);
    const res = await fetch(`/api/trabajos/${trabajoId}/solicitudes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proveedorIds: Array.from(selected), enviar: via !== "manual", via }),
    });
    if (res.ok) {
      const data = await res.json();
      toast(`Solicitudes enviadas a ${data.data.enviados} proveedores`, "success");
      onSent();
    } else {
      toast("Error al enviar", "error");
    }
    setSending(false);
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <h3 className="text-sm font-bold">Enviar solicitudes de presupuesto</h3>
          <button onClick={onClose} className="text-secondary hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-secondary">
              Proveedores de <span className="font-semibold text-foreground">{CATEGORIA_PROVEEDOR_LABELS[categoria]}</span>
            </p>
            <button onClick={toggleAll} className="text-xs text-primary font-semibold cursor-pointer">
              {selected.size === proveedores.length ? "Deseleccionar" : "Seleccionar"} todos
            </button>
          </div>

          {loading ? (
            <Skeleton className="h-32" />
          ) : proveedores.length === 0 ? (
            <p className="text-sm text-secondary text-center py-4">No hay proveedores de esta categoría</p>
          ) : (
            <div className="space-y-1.5">
              {proveedores.map((p) => (
                <label key={p.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border hover:border-primary/30 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => {
                      const next = new Set(selected);
                      next.has(p.id) ? next.delete(p.id) : next.add(p.id);
                      setSelected(next);
                    }}
                    className="rounded"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Stars rating={p.valoracionMedia} />
                      <span className="text-[10px] text-secondary">{p.totalTrabajos} trabajos</span>
                    </div>
                  </div>
                  {p.telefono && <Phone className="h-3.5 w-3.5 text-secondary" />}
                </label>
              ))}
            </div>
          )}

          {/* Vía de envío */}
          <div>
            <p className="text-xs font-semibold mb-2">Enviar vía</p>
            <div className="flex gap-2">
              {(["whatsapp", "manual"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVia(v)}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    via === v ? "border-primary bg-primary/10 text-foreground" : "border-border text-secondary"
                  }`}
                >
                  {v === "whatsapp" ? "WhatsApp" : "Solo registrar"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-border shrink-0">
          <Button onClick={handleSend} disabled={sending || selected.size === 0} className="w-full gap-1.5">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "Enviando..." : `Enviar a ${selected.size} proveedor${selected.size !== 1 ? "es" : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
