"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import {
  Zap, Plus, Trash2, Power, PowerOff, X, ChevronDown, ChevronUp,
  Phone, MessageCircle, ArrowRight, UserPlus, AlertTriangle,
} from "lucide-react";

interface Automatizacion {
  id: string;
  nombre: string;
  activa: boolean;
  evento: string;
  condicion: Record<string, unknown> | null;
  accion: string;
  parametros: Record<string, unknown> | null;
  createdAt: string;
  _count: { logs: number };
}

const EVENTOS: Record<string, { label: string; desc: string }> = {
  LEAD_NUEVO: { label: "Lead nuevo", desc: "Cuando se crea un lead" },
  LEAD_SIN_CONTACTAR: { label: "Lead sin contactar", desc: "Cuando un lead NUEVO lleva >5 min sin interaccion" },
  VISITA_REALIZADA: { label: "Visita realizada", desc: "Cuando una visita se marca como realizada" },
  OPERACION_CREADA: { label: "Operacion creada", desc: "Cuando se crea una nueva operacion" },
  LEAD_FASE_CAMBIO: { label: "Cambio de fase", desc: "Cuando un lead cambia de fase en el funnel" },
};

const ACCIONES: Record<string, { label: string; icon: typeof Zap }> = {
  CREAR_TAREA: { label: "Crear tarea", icon: Plus },
  ESCALAR_ADMIN: { label: "Escalar a admin", icon: AlertTriangle },
  CAMBIAR_FASE: { label: "Cambiar fase", icon: ArrowRight },
  ASIGNAR_COMERCIAL: { label: "Asignar comercial", icon: UserPlus },
  ENVIAR_WHATSAPP: { label: "Enviar WhatsApp", icon: MessageCircle },
};

export default function AutomatizacionesPage() {
  const [autos, setAutos] = useState<Automatizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCrear, setShowCrear] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    nombre: "",
    evento: "LEAD_NUEVO",
    accion: "CREAR_TAREA",
    parametros: { tipo: "LLAMAR", descripcion: "", prioridad: 1, delay_minutos: 0 },
  });

  const fetchAutos = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/automatizaciones");
    if (res.ok) {
      const data = await res.json();
      setAutos(data.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAutos(); }, [fetchAutos]);

  async function toggleActiva(id: string, activa: boolean) {
    await fetch("/api/automatizaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, activa: !activa }),
    });
    fetchAutos();
  }

  async function eliminar(id: string) {
    if (!confirm("Eliminar esta automatizacion?")) return;
    await fetch("/api/automatizaciones", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchAutos();
    toast("Automatizacion eliminada", "success");
  }

  async function crear() {
    if (!form.nombre) { toast("El nombre es obligatorio", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/automatizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast("Automatizacion creada", "success");
        setShowCrear(false);
        setForm({ nombre: "", evento: "LEAD_NUEVO", accion: "CREAR_TAREA", parametros: { tipo: "LLAMAR", descripcion: "", prioridad: 1, delay_minutos: 0 } });
        fetchAutos();
      }
    } finally { setSaving(false); }
  }

  const inputClass = "h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/15";
  const selectClass = inputClass + " appearance-none";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Automatizaciones</h1>
          <Badge variant="info" size="md">{autos.length}</Badge>
        </div>
        <Button size="lg" className="gap-2" onClick={() => setShowCrear(true)}>
          <Plus className="h-5 w-5" /> Nueva regla
        </Button>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <strong>Las automatizaciones se ejecutan cuando ocurren eventos en el CRM.</strong> Por ejemplo: cuando llega un lead nuevo, se crea una tarea automatica para que el comercial le llame. Si no le contacta en 5 minutos, se escala al administrador.
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : autos.length === 0 ? (
        <EmptyState icon={<Zap className="h-8 w-8" />} title="Sin automatizaciones" description="Crea tu primera regla de automatizacion" />
      ) : (
        <div className="space-y-3">
          {autos.map((auto) => {
            const evento = EVENTOS[auto.evento];
            const accion = ACCIONES[auto.accion];
            const AccionIcon = accion?.icon ?? Zap;
            const params = auto.parametros as Record<string, unknown> | null;

            return (
              <div
                key={auto.id}
                className={`rounded-2xl border p-5 transition-all ${
                  auto.activa
                    ? "bg-white/70 border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)]"
                    : "bg-muted/30 border-border/50 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className={`h-5 w-5 ${auto.activa ? "text-amber-500" : "text-secondary/40"}`} />
                      <h3 className="text-base font-bold text-foreground">{auto.nombre}</h3>
                      <Badge variant={auto.activa ? "success" : "default"} size="sm">
                        {auto.activa ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>

                    {/* Flow visual */}
                    <div className="flex items-center gap-3 mt-3">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-blue-500 font-medium">CUANDO</p>
                        <p className="text-sm font-semibold text-blue-800">{evento?.label ?? auto.evento}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-secondary shrink-0" />
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                        <p className="text-xs text-emerald-500 font-medium">ENTONCES</p>
                        <div className="flex items-center gap-1.5">
                          <AccionIcon className="h-4 w-4 text-emerald-700" />
                          <p className="text-sm font-semibold text-emerald-800">{accion?.label ?? auto.accion}</p>
                        </div>
                      </div>
                      {typeof params?.descripcion === "string" && params.descripcion && (
                        <>
                          <ArrowRight className="h-4 w-4 text-secondary/40 shrink-0" />
                          <span className="text-sm text-secondary italic truncate max-w-[200px]">{String(params.descripcion as string)}</span>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-secondary mt-2">Ejecutada {auto._count.logs} veces</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleActiva(auto.id, auto.activa)}
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-secondary hover:bg-muted cursor-pointer transition-colors"
                      title={auto.activa ? "Desactivar" : "Activar"}
                    >
                      {auto.activa ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => eliminar(auto.id)}
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-secondary hover:bg-red-50 hover:text-red-600 cursor-pointer transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal crear */}
      {showCrear && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowCrear(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="bg-card rounded-2xl shadow-[var(--shadow-xl)] w-full max-w-[560px]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">Nueva automatizacion</h2>
                <button onClick={() => setShowCrear(false)} className="h-9 w-9 rounded-lg flex items-center justify-center text-secondary hover:bg-muted cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-secondary block mb-1">Nombre *</label>
                  <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputClass} placeholder="Ej: Lead nuevo - tarea llamar urgente" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-secondary block mb-1">Cuando (evento)</label>
                    <select value={form.evento} onChange={(e) => setForm({ ...form, evento: e.target.value })} className={selectClass}>
                      {Object.entries(EVENTOS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-secondary mt-1">{EVENTOS[form.evento]?.desc}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-secondary block mb-1">Entonces (accion)</label>
                    <select value={form.accion} onChange={(e) => setForm({ ...form, accion: e.target.value })} className={selectClass}>
                      {Object.entries(ACCIONES).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {form.accion === "CREAR_TAREA" && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-secondary block mb-1">Descripcion de la tarea</label>
                      <input value={form.parametros.descripcion} onChange={(e) => setForm({ ...form, parametros: { ...form.parametros, descripcion: e.target.value } })} className={inputClass} placeholder="Contactar nuevo lead..." />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-secondary block mb-1">Tipo tarea</label>
                        <select value={String(form.parametros.tipo)} onChange={(e) => setForm({ ...form, parametros: { ...form.parametros, tipo: e.target.value } })} className={selectClass}>
                          <option value="LLAMAR">Llamar</option>
                          <option value="WHATSAPP">WhatsApp</option>
                          <option value="EMAIL">Email</option>
                          <option value="SEGUIMIENTO">Seguimiento</option>
                          <option value="DOCUMENTACION">Documentacion</option>
                          <option value="OTRO">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-secondary block mb-1">Prioridad</label>
                        <select value={String(form.parametros.prioridad)} onChange={(e) => setForm({ ...form, parametros: { ...form.parametros, prioridad: Number(e.target.value) } })} className={selectClass}>
                          <option value="0">Normal</option>
                          <option value="1">Alta</option>
                          <option value="2">Urgente</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-secondary block mb-1">Retraso (min)</label>
                        <input type="number" value={form.parametros.delay_minutos} onChange={(e) => setForm({ ...form, parametros: { ...form.parametros, delay_minutos: Number(e.target.value) } })} className={inputClass} min="0" />
                      </div>
                    </div>
                  </>
                )}

                {form.accion === "ESCALAR_ADMIN" && (
                  <div>
                    <label className="text-sm font-medium text-secondary block mb-1">Mensaje de escalado</label>
                    <input value={form.parametros.descripcion} onChange={(e) => setForm({ ...form, parametros: { ...form.parametros, descripcion: e.target.value } })} className={inputClass} placeholder="URGENTE: requiere atencion inmediata" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                <Button variant="secondary" onClick={() => setShowCrear(false)}>Cancelar</Button>
                <Button onClick={crear} loading={saving} size="lg">Crear automatizacion</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
