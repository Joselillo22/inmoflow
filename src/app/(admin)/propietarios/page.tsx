"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { PropietarioDetailSlideOver } from "@/components/admin/kyc/propietario-detail-slideover";
import {
  UserSquare2, Search, Plus, ShieldCheck, ShieldAlert,
  Building2, Globe, X, Loader2, AlertTriangle,
} from "lucide-react";

interface Propietario {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  dniNie: string | null;
  nacionalidad: string | null;
  kycVerificado: boolean;
  kycFecha: string | null;
  createdAt: string;
  _count: { inmuebles: number; accesos: number };
}

export default function PropietariosPage() {
  const [tab, setTab] = useState<"propietarios" | "kyc">("propietarios");
  const { t } = useTranslation();

  // Read tab from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "kyc") setTab("kyc");
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <UserSquare2 className="h-5 w-5 text-secondary" />
          {t("owners.title")}
        </h1>
      </div>

      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(["propietarios", "kyc"] as const).map((t2) => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              tab === t2 ? "bg-background shadow-sm text-foreground" : "text-secondary hover:text-foreground"
            }`}
          >
            {t2 === "propietarios" ? t("owners.tabOwners") : t("owners.tabKyc")}
          </button>
        ))}
      </div>

      {tab === "propietarios" && <PropietariosListTab />}
      {tab === "kyc" && <KYCTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: LISTA PROPIETARIOS
// ═══════════════════════════════════════════════════════
function PropietariosListTab() {
  const [data, setData] = useState<Propietario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKyc, setFilterKyc] = useState<"" | "true" | "false">("");
  const [filterInm, setFilterInm] = useState<"" | "con" | "sin">("");
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { t } = useTranslation();

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch("/api/propietarios?limit=200")
      .then((r) => r.json())
      .then((d) => setData(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Client-side filtering
  const filtered = data.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      const match = `${p.nombre} ${p.apellidos ?? ""} ${p.telefono ?? ""} ${p.email ?? ""} ${p.dniNie ?? ""}`.toLowerCase();
      if (!match.includes(q)) return false;
    }
    if (filterKyc === "true" && !p.kycVerificado) return false;
    if (filterKyc === "false" && p.kycVerificado) return false;
    if (filterInm === "con" && p._count.inmuebles === 0) return false;
    if (filterInm === "sin" && p._count.inmuebles > 0) return false;
    return true;
  });

  // KPIs
  const totalProp = data.length;
  const conInmuebles = data.filter((p) => p._count.inmuebles > 0).length;
  const kycOk = data.filter((p) => p.kycVerificado).length;
  const conPortal = data.filter((p) => p._count.accesos > 0).length;

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: t("owners.total"), value: totalProp, icon: UserSquare2, color: "text-slate-500", bg: "bg-slate-100" },
          { label: t("owners.withProperties"), value: conInmuebles, icon: Building2, color: "text-blue-500", bg: "bg-blue-50" },
          { label: t("owners.kycVerified"), value: kycOk, icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: t("owners.withPortal"), value: conPortal, icon: Globe, color: "text-violet-500", bg: "bg-violet-50" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <span className="text-xs font-medium text-secondary">{kpi.label}</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Search + filters + button */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("owners.search")}
            className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <select value={filterKyc} onChange={(e) => setFilterKyc(e.target.value as "")} className="h-10 border border-border rounded-xl px-3 text-sm bg-background cursor-pointer">
          <option value="">KYC: Todos</option>
          <option value="true">Verificados</option>
          <option value="false">Pendientes</option>
        </select>
        <select value={filterInm} onChange={(e) => setFilterInm(e.target.value as "")} className="h-10 border border-border rounded-xl px-3 text-sm bg-background cursor-pointer">
          <option value="">Inmuebles: Todos</option>
          <option value="con">Con inmuebles</option>
          <option value="sin">Sin inmuebles</option>
        </select>
        <Button onClick={() => setShowModal(true)} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> {t("owners.new")}
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <UserSquare2 className="h-10 w-10 text-secondary/20 mx-auto mb-3" />
          <p className="text-sm text-secondary">{search ? "Sin resultados" : t("owners.noOwners")}</p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1fr_120px_160px_110px_80px_70px_70px] gap-3 px-5 py-3 border-b border-border">
            {["NOMBRE", "TELÉFONO", "EMAIL", "DNI/NIE", "INMUEBLES", "KYC", "PORTAL"].map((h) => (
              <span key={h} className="text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">{h}</span>
            ))}
          </div>
          {filtered.map((p) => (
            <div
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className="grid grid-cols-[1fr_120px_160px_110px_80px_70px_70px] gap-3 px-5 py-3.5 border-b border-border/30 items-center hover:bg-primary/[0.02] cursor-pointer transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{p.nombre} {p.apellidos ?? ""}</p>
                {p.nacionalidad && <p className="text-[10px] text-secondary">{p.nacionalidad}</p>}
              </div>
              <span className="text-sm text-secondary">{p.telefono ?? "—"}</span>
              <span className="text-xs text-secondary truncate">{p.email ?? "—"}</span>
              <span className="text-xs text-secondary font-mono">{p.dniNie ?? "—"}</span>
              <span className="text-sm font-bold text-foreground">{p._count.inmuebles}</span>
              <div>
                {p.kycVerificado ? (
                  <Badge size="sm" variant="success">OK</Badge>
                ) : (
                  <Badge size="sm" variant="danger">No</Badge>
                )}
              </div>
              <div>
                {p._count.accesos > 0 ? (
                  <Badge size="sm" variant="info">Sí</Badge>
                ) : (
                  <span className="text-xs text-secondary">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <NuevoPropietarioModal onClose={() => setShowModal(false)} onCreated={() => { setShowModal(false); fetchData(); }} />}
      {selectedId && <PropietarioDetailSlideOver propietarioId={selectedId} onClose={() => setSelectedId(null)} onUpdated={fetchData} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// TAB: KYC / PBC
// ═══════════════════════════════════════════════════════
function KYCTab() {
  const [data, setData] = useState<Propietario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { t } = useTranslation();

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch("/api/propietarios?limit=200")
      .then((r) => r.json())
      .then((d) => setData(d.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const verificados = data.filter((p) => p.kycVerificado).length;
  const sinVerificar = data.filter((p) => !p.kycVerificado);
  const urgentes = sinVerificar.filter((p) => p._count.inmuebles > 0);

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>;

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-2xl border border-emerald-200/60 p-5 text-center">
          <ShieldCheck className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-emerald-700">{verificados}</p>
          <p className="text-xs text-emerald-600">Verificados</p>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-200/60 p-5 text-center">
          <ShieldAlert className="h-6 w-6 text-red-600 mx-auto mb-2" />
          <p className="text-3xl font-bold text-red-700">{sinVerificar.length}</p>
          <p className="text-xs text-red-600">Sin verificar</p>
        </div>
        <div className="bg-white/70 rounded-2xl border border-white/60 shadow-sm p-5 text-center">
          <UserSquare2 className="h-6 w-6 text-secondary mx-auto mb-2" />
          <p className="text-3xl font-bold text-foreground">{data.length}</p>
          <p className="text-xs text-secondary">Total</p>
        </div>
      </div>

      {/* Urgentes: sin KYC con inmuebles */}
      {urgentes.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-600 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Verificación urgente — Propietarios con inmuebles sin KYC ({urgentes.length})
          </p>
          <div className="space-y-2">
            {urgentes.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="flex items-center justify-between p-4 rounded-xl border-2 border-red-200 bg-red-50/50 cursor-pointer hover:bg-red-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{p.nombre} {p.apellidos ?? ""}</p>
                  <p className="text-xs text-secondary">{p.dniNie ?? "Sin DNI/NIE"} · {p._count.inmuebles} inmueble{p._count.inmuebles !== 1 ? "s" : ""}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1 shrink-0">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verificar
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resto sin verificar (sin inmuebles) */}
      {sinVerificar.filter((p) => p._count.inmuebles === 0).length > 0 && (
        <div>
          <p className="text-xs font-semibold text-secondary mb-2">Sin verificar — sin inmuebles ({sinVerificar.filter((p) => p._count.inmuebles === 0).length})</p>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden">
            {sinVerificar.filter((p) => p._count.inmuebles === 0).map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="flex items-center justify-between px-5 py-3 border-b border-border/30 cursor-pointer hover:bg-primary/[0.02] transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{p.nombre} {p.apellidos ?? ""}</p>
                  <p className="text-xs text-secondary">{p.dniNie ?? "Sin DNI/NIE"}</p>
                </div>
                <Badge size="sm" variant="danger">Sin KYC</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ya verificados */}
      {verificados > 0 && (
        <div>
          <p className="text-xs font-semibold text-emerald-600 mb-2">Verificados ({verificados})</p>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden">
            {data.filter((p) => p.kycVerificado).map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className="flex items-center justify-between px-5 py-3 border-b border-border/30 cursor-pointer hover:bg-primary/[0.02] transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{p.nombre} {p.apellidos ?? ""}</p>
                  <p className="text-xs text-secondary">{p.dniNie ?? ""} · {p._count.inmuebles} inmueble{p._count.inmuebles !== 1 ? "s" : ""}</p>
                </div>
                <Badge size="sm" variant="success">KYC OK</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedId && <PropietarioDetailSlideOver propietarioId={selectedId} onClose={() => setSelectedId(null)} onUpdated={fetchData} />}
    </>
  );
}

// ═══════════════════════════════════════════════════════
// MODAL: NUEVO PROPIETARIO
// ═══════════════════════════════════════════════════════
function NuevoPropietarioModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    for (const [key, value] of fd.entries()) {
      if (value) body[key] = value;
    }
    const res = await fetch("/api/propietarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { toast("Propietario creado", "success"); onCreated(); }
    else { const err = await res.json(); toast(err.error ?? "Error", "error"); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="text-sm font-bold">Nuevo propietario</h3>
          <button onClick={onClose} className="text-secondary hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Nombre *</label>
              <input name="nombre" required className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Apellidos</label>
              <input name="apellidos" className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">DNI / NIE</label>
              <input name="dniNie" className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Tipo documento</label>
              <select name="tipoDocumento" className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">—</option>
                <option value="DNI">DNI</option>
                <option value="NIE">NIE</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Nacionalidad</label>
            <input name="nacionalidad" className="w-full h-10 border border-border rounded-lg px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="Española, Británica..." />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Notas</label>
            <textarea name="notas" rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <Button type="submit" disabled={saving} className="w-full gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {saving ? "Guardando..." : "Crear propietario"}
          </Button>
        </form>
      </div>
    </div>
  );
}
