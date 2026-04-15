"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  Phone, MessageCircle, CalendarDays, MapPin, Home,
  ChevronLeft, ChevronRight, Plus, X, Clock, Loader2,
  CheckSquare, CheckCircle2, Circle,
} from "lucide-react";
import { formatTime, formatCurrency } from "@/lib/utils/formatters";
import { RESULTADO_VISITA_LABELS } from "@/lib/utils/constants";

interface Visita {
  id: string;
  fecha: string;
  resultado: string;
  lead: { nombre: string; apellidos: string | null; telefono: string | null };
  inmueble: { titulo: string; direccion: string; precio: number; referencia: string };
}

interface Tarea {
  id: string;
  tipo: string;
  descripcion: string;
  prioridad: number;
  completada: boolean;
  fechaLimite: string | null;
  completadaAt: string | null;
}

interface LeadOption { id: string; nombre: string; apellidos: string | null }
interface InmuebleOption { id: string; titulo: string; referencia: string }

const resultadoColor: Record<string, string> = {
  PENDIENTE: "bg-blue-100 text-blue-700",
  REALIZADA_INTERESADO: "bg-emerald-100 text-emerald-700",
  REALIZADA_NO_INTERESADO: "bg-slate-100 text-slate-600",
  CANCELADA: "bg-red-100 text-red-700",
  NO_SHOW: "bg-red-100 text-red-700",
};

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = (first.getDay() + 6) % 7; // Lunes = 0
  const days: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= last.getDate(); d++) days.push(d);
  return days;
}

export default function AgendaPage() {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const { t } = useTranslation();
  const { toast } = useToast();

  // Modal nueva visita
  const [showModal, setShowModal] = useState(false);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [inmuebles, setInmuebles] = useState<InmuebleOption[]>([]);
  const [formLeadId, setFormLeadId] = useState("");
  const [formInmuebleId, setFormInmuebleId] = useState("");
  const [formFecha, setFormFecha] = useState("");
  const [formHora, setFormHora] = useState("10:00");
  const [formNotas, setFormNotas] = useState("");
  const [creating, setCreating] = useState(false);

  async function toggleTarea(id: string) {
    const res = await fetch(`/api/tareas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completada: true }),
    });
    if (res.ok) {
      toast("Tarea completada", "success");
      fetchVisitas();
    }
  }

  async function reabrirTarea(id: string) {
    const res = await fetch(`/api/tareas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completada: false }),
    });
    if (res.ok) {
      toast("Tarea reabierta", "success");
      fetchVisitas();
    }
  }

  const fetchVisitas = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/visitas?limit=200&sortBy=fecha&sortOrder=asc").then((r) => r.json()),
      fetch("/api/tareas?limit=500").then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([visRes, tarRes]) => {
      setVisitas(visRes.data ?? []);
      setTareas(tarRes.data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchVisitas(); }, [fetchVisitas]);

  // Días con eventos (visitas o tareas)
  const eventosDates = new Set<string>();
  for (const v of visitas) {
    const d = new Date(v.fecha);
    eventosDates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  for (const t of tareas) {
    const dateStr = t.completadaAt ?? t.fechaLimite;
    if (dateStr) {
      const d = new Date(dateStr);
      eventosDates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  }

  const hasVisita = (day: number) =>
    eventosDates.has(`${calYear}-${calMonth}-${day}`);

  // Visitas del día seleccionado
  const visitasDia = visitas
    .filter((v) => sameDay(new Date(v.fecha), selectedDate))
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  // Tareas del día seleccionado: completadas ese día O pendientes con fechaLimite ese día
  const tareasDia = tareas.filter((t) => {
    if (t.completadaAt && sameDay(new Date(t.completadaAt), selectedDate)) return true;
    if (!t.completada && t.fechaLimite && sameDay(new Date(t.fechaLimite), selectedDate)) return true;
    return false;
  });
  const tareasCompDia = tareasDia.filter((t) => t.completada);
  const tareasPendDia = tareasDia.filter((t) => !t.completada);

  const calDays = getCalendarDays(calYear, calMonth);
  const today = new Date();

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); }
    else setCalMonth(calMonth - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); }
    else setCalMonth(calMonth + 1);
  }
  function selectDay(day: number) {
    setSelectedDate(new Date(calYear, calMonth, day));
  }

  // Abrir modal nueva visita
  async function openNewVisita() {
    setShowModal(true);
    setFormLeadId("");
    setFormInmuebleId("");
    setFormFecha(selectedDate.toISOString().slice(0, 10));
    setFormHora("10:00");
    setFormNotas("");
    // Cargar leads e inmuebles del comercial
    const [leadsRes, inmsRes] = await Promise.all([
      fetch("/api/leads?limit=200").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/inmuebles?limit=200").then((r) => r.json()).catch(() => ({ data: [] })),
    ]);
    setLeads((leadsRes.data ?? []).map((l: Record<string, unknown>) => ({
      id: l.id, nombre: l.nombre, apellidos: l.apellidos,
    })));
    setInmuebles((inmsRes.data ?? []).map((i: Record<string, unknown>) => ({
      id: i.id, titulo: i.titulo, referencia: i.referencia,
    })));
  }

  async function handleCreate() {
    if (!formLeadId || !formInmuebleId || !formFecha || !formHora) {
      toast("Rellena todos los campos", "warning");
      return;
    }
    setCreating(true);
    try {
      const fecha = `${formFecha}T${formHora}:00`;
      // Necesitamos el comercialId - lo obtenemos del perfil
      const perfilRes = await fetch("/api/perfil");
      const perfil = await perfilRes.json();
      const comercialId = perfil.data?.comercialId;
      if (!comercialId) { toast("Error: no se pudo obtener tu perfil", "error"); return; }

      const res = await fetch("/api/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: formLeadId,
          inmuebleId: formInmuebleId,
          comercialId,
          fecha,
          notasAntes: formNotas || undefined,
        }),
      });
      if (res.ok) {
        toast("Visita programada", "success");
        setShowModal(false);
        fetchVisitas();
      } else {
        const err = await res.json();
        toast(err.error ?? "Error al crear visita", "error");
      }
    } catch {
      toast("Error de conexión", "error");
    } finally {
      setCreating(false);
    }
  }

  // Formato label para el día seleccionado
  const selectedLabel = sameDay(selectedDate, today)
    ? "Hoy"
    : selectedDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
        {[1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-secondary" />
          {t("comercial.myAgenda")}
        </h2>
        <Button size="sm" onClick={openNewVisita} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nueva visita
        </Button>
      </div>

      {/* Mini calendario */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm p-4">
        {/* Navegación mes */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer transition-colors">
            <ChevronLeft className="h-5 w-5 text-secondary" />
          </button>
          <p className="text-sm font-bold text-foreground">{MESES[calMonth]} {calYear}</p>
          <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-muted cursor-pointer transition-colors">
            <ChevronRight className="h-5 w-5 text-secondary" />
          </button>
        </div>

        {/* Cabecera días semana */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DIAS_SEMANA.map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-secondary py-1">{d}</div>
          ))}
        </div>

        {/* Días */}
        <div className="grid grid-cols-7 gap-1">
          {calDays.map((day, i) => {
            if (day === null) return <div key={`e${i}`} />;
            const isSelected = selectedDate.getFullYear() === calYear && selectedDate.getMonth() === calMonth && selectedDate.getDate() === day;
            const isToday = today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
            const hasV = hasVisita(day);

            return (
              <button
                key={day}
                onClick={() => selectDay(day)}
                className={`relative h-10 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary text-white shadow-sm"
                    : isToday
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {day}
                {hasV && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
                {hasV && isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Visitas del día seleccionado */}
      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
          sameDay(selectedDate, today) ? "bg-primary text-white" : "bg-slate-200 text-slate-600"
        }`}>
          {selectedLabel}
        </span>
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-xs text-secondary">{visitasDia.length} visita{visitasDia.length !== 1 ? "s" : ""}{tareasDia.length > 0 && ` · ${tareasDia.length} tarea${tareasDia.length !== 1 ? "s" : ""}`}</span>
      </div>

      {visitasDia.length > 0 ? (
        <div className="space-y-2">
          {visitasDia.map((visita) => (
            <div key={visita.id} className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm overflow-hidden">
              <div className="px-4 pt-3.5 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-bold text-primary">{formatTime(visita.fecha)}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${resultadoColor[visita.resultado] ?? "bg-slate-100 text-slate-600"}`}>
                    {RESULTADO_VISITA_LABELS[visita.resultado] ?? visita.resultado}
                  </span>
                </div>
                <p className="font-semibold text-foreground">
                  {visita.lead.nombre} {visita.lead.apellidos ?? ""}
                </p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-sm text-secondary flex items-center gap-1">
                    <Home className="h-3 w-3 shrink-0" />
                    {visita.inmueble.titulo}
                    <span className="text-[10px] font-mono ml-1 opacity-60">{visita.inmueble.referencia}</span>
                  </p>
                  <p className="text-xs text-secondary flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {visita.inmueble.direccion}
                  </p>
                  <p className="text-sm font-bold text-foreground">{formatCurrency(Number(visita.inmueble.precio))}</p>
                </div>
              </div>
              {visita.lead.telefono && (
                <div className="flex border-t border-border/40">
                  <a href={`tel:${visita.lead.telefono}`} className="flex-1">
                    <button className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-secondary hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
                      <Phone className="h-3.5 w-3.5" /> {t("comercial.call")}
                    </button>
                  </a>
                  <div className="w-px bg-border/40" />
                  <a href={`https://wa.me/34${visita.lead.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <button className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer">
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </button>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : tareasDia.length === 0 ? (
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm py-8 text-center">
          <CalendarDays className="h-8 w-8 text-secondary/30 mx-auto mb-2" />
          <p className="text-sm text-secondary">Sin visitas este día</p>
          <button onClick={openNewVisita} className="text-sm text-primary font-semibold mt-2 cursor-pointer hover:underline">
            + Programar una visita
          </button>
        </div>
      ) : null}

      {/* Tareas del día */}
      {tareasPendDia.length > 0 && (
        <div>
          <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Circle className="h-3 w-3" /> Tareas pendientes ({tareasPendDia.length})
          </p>
          <div className="space-y-2">
            {tareasPendDia.map((t) => {
              const prioColor = t.prioridad === 2 ? "border-l-red-500" : t.prioridad === 1 ? "border-l-amber-500" : "border-l-slate-300";
              return (
                <div key={t.id} className={`bg-white/80 backdrop-blur-sm rounded-xl border border-white/60 border-l-4 ${prioColor} shadow-sm p-3.5 flex items-start gap-3`}>
                  <button
                    onClick={() => toggleTarea(t.id)}
                    className="w-8 h-8 rounded-lg border-2 border-border flex items-center justify-center shrink-0 cursor-pointer hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
                    aria-label="Marcar completada"
                  >
                    <Circle className="h-4 w-4 text-transparent" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{t.descripcion}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold text-secondary uppercase">{t.tipo.replace(/_/g, " ")}</span>
                      {t.prioridad === 2 && <span className="text-[10px] font-bold text-red-500">URGENTE</span>}
                      {t.prioridad === 1 && <span className="text-[10px] font-bold text-amber-500">ALTA</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleTarea(t.id)}
                    className="flex items-center gap-1 px-3 h-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Hecha
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tareasCompDia.length > 0 && (
        <div>
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3" /> Completadas ({tareasCompDia.length})
          </p>
          <div className="space-y-2">
            {tareasCompDia.map((t) => (
              <div key={t.id} className="bg-emerald-50/60 rounded-xl border border-emerald-200/60 p-3.5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground line-through decoration-emerald-400/50">{t.descripcion}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold text-secondary uppercase">{t.tipo.replace(/_/g, " ")}</span>
                      {t.completadaAt && (
                        <span className="text-[10px] text-secondary">
                          {new Date(t.completadaAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => reabrirTarea(t.id)}
                    className="text-[10px] text-secondary hover:text-foreground cursor-pointer underline shrink-0"
                  >
                    Reabrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal nueva visita */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div className="bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                Nueva visita
              </h3>
              <button onClick={() => setShowModal(false)} className="text-secondary hover:text-foreground cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {/* Contacto */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Contacto</label>
                <select
                  value={formLeadId}
                  onChange={(e) => setFormLeadId(e.target.value)}
                  className="w-full h-12 border border-border rounded-xl px-3 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="">Seleccionar contacto...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>{l.nombre} {l.apellidos ?? ""}</option>
                  ))}
                </select>
              </div>

              {/* Inmueble */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Inmueble</label>
                <select
                  value={formInmuebleId}
                  onChange={(e) => setFormInmuebleId(e.target.value)}
                  className="w-full h-12 border border-border rounded-xl px-3 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                >
                  <option value="">Seleccionar inmueble...</option>
                  {inmuebles.map((i) => (
                    <option key={i.id} value={i.id}>{i.referencia} — {i.titulo}</option>
                  ))}
                </select>
              </div>

              {/* Fecha y hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Fecha</label>
                  <input
                    type="date"
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full h-12 border border-border rounded-xl px-3 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">Hora</label>
                  <input
                    type="time"
                    value={formHora}
                    onChange={(e) => setFormHora(e.target.value)}
                    className="w-full h-12 border border-border rounded-xl px-3 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">Notas (opcional)</label>
                <textarea
                  value={formNotas}
                  onChange={(e) => setFormNotas(e.target.value)}
                  rows={2}
                  placeholder="Ej: Lleva documentación, interesado en planta baja..."
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border shrink-0">
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="w-full h-12 text-base font-semibold gap-2"
              >
                {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                {creating ? "Creando..." : "Programar visita"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
