"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  ChevronLeft, ChevronRight, Plus, X, Eye, CheckSquare, Search, UserCircle,
} from "lucide-react";
import { formatTime } from "@/lib/utils/formatters";
import { RESULTADO_VISITA_LABELS } from "@/lib/utils/constants";

interface CalendarEvent {
  id: string;
  tipo: "visita" | "tarea";
  titulo: string;
  subtitulo: string;
  fecha: string;
  hora?: string;
  color: string;
  resultado?: string;
}

interface LeadOption { id: string; nombre: string; apellidos: string | null; telefono: string | null; comercialId: string | null }
interface InmuebleOption { id: string; titulo: string; referencia: string; comercialId: string | null }
interface ComercialOption { id: string; usuario: { nombre: string; apellidos: string } }

const DAYS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

type ViewMode = "mes" | "semana" | "dia";

export default function CalendarioPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("mes");
  const [showCrear, setShowCrear] = useState(false);
  const [crearDate, setCrearDate] = useState<Date>(new Date());
  const { toast } = useToast();
  const [filterComercialId, setFilterComercialId] = useState("");
  const [comercialesFilter, setComercialesFilter] = useState<ComercialOption[]>([]);

  // Create event form state
  const [crearTipo, setCrearTipo] = useState<"visita" | "tarea">("visita");
  const [saving, setSaving] = useState(false);

  // Visita fields
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [inmuebles, setInmuebles] = useState<InmuebleOption[]>([]);
  const [comerciales, setComerciales] = useState<ComercialOption[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedInmuebleId, setSelectedInmuebleId] = useState("");
  const [selectedComercialId, setSelectedComercialId] = useState("");
  const [visitaHora, setVisitaHora] = useState("10:00");

  // Autocomplete search
  const [leadSearch, setLeadSearch] = useState("");
  const [leadFocused, setLeadFocused] = useState(false);
  const [inmSearch, setInmSearch] = useState("");
  const [inmFocused, setInmFocused] = useState(false);
  const [comSearch, setComSearch] = useState("");
  const [comFocused, setComFocused] = useState(false);

  // Tarea fields
  const [tareaTipo, setTareaTipo] = useState("LLAMAR");
  const [tareaDesc, setTareaDesc] = useState("");
  const [tareaPrioridad, setTareaPrioridad] = useState(1);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0);

    const [visitasRes, tareasRes] = await Promise.all([
      fetch(`/api/visitas?desde=${start.toISOString()}&hasta=${end.toISOString()}${filterComercialId ? `&comercialId=${filterComercialId}` : ""}`),
      fetch(`/api/tareas${filterComercialId ? `?comercialId=${filterComercialId}` : ""}`),
    ]);

    const calEvents: CalendarEvent[] = [];

    if (visitasRes.ok) {
      const { data: visitas } = await visitasRes.json();
      for (const v of visitas ?? []) {
        const resultadoColors: Record<string, string> = {
          PENDIENTE: "bg-blue-500", REALIZADA_INTERESADO: "bg-emerald-500",
          REALIZADA_NO_INTERESADO: "bg-amber-500", CANCELADA: "bg-red-500", NO_SHOW: "bg-red-400",
        };
        calEvents.push({
          id: v.id, tipo: "visita",
          titulo: `${v.lead?.nombre ?? "Lead"} ${v.lead?.apellidos ?? ""}`.trim(),
          subtitulo: v.inmueble?.titulo ?? "", fecha: v.fecha, hora: formatTime(v.fecha),
          color: resultadoColors[v.resultado] ?? "bg-blue-500", resultado: v.resultado,
        });
      }
    }

    if (tareasRes.ok) {
      const { data: tareas } = await tareasRes.json();
      for (const t of tareas ?? []) {
        const dateStr = t.completada ? (t.completadaAt ?? t.fechaLimite) : t.fechaLimite;
        if (!dateStr) continue;
        const prioColors: Record<number, string> = { 2: "bg-red-500", 1: "bg-amber-500", 0: "bg-slate-400" };
        calEvents.push({
          id: t.id,
          tipo: "tarea",
          titulo: t.descripcion,
          subtitulo: t.completada ? `✓ ${t.tipo}` : t.tipo,
          fecha: dateStr,
          color: t.completada ? "bg-emerald-500" : (prioColors[t.prioridad] ?? "bg-slate-400"),
          resultado: t.completada ? "COMPLETADA" : undefined,
        });
      }
    }

    setEvents(calEvents);
    setLoading(false);
  }, [currentDate, filterComercialId]);

  useEffect(() => {
    fetch("/api/comerciales?limit=50").then((r) => r.json()).then((d) => setComercialesFilter(d.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  function navigate(dir: number) {
    const d = new Date(currentDate);
    if (viewMode === "mes") d.setMonth(d.getMonth() + dir);
    else if (viewMode === "semana") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  }

  function getEventsForDay(date: Date) {
    return events.filter((e) => {
      const ed = new Date(e.fecha);
      return ed.getDate() === date.getDate() && ed.getMonth() === date.getMonth() && ed.getFullYear() === date.getFullYear();
    });
  }

  function openCrearModal(day: Date) {
    setCrearDate(day);
    setCrearTipo("visita");
    setSelectedLeadId("");
    setSelectedInmuebleId("");
    setSelectedComercialId("");
    setLeadSearch("");
    setInmSearch("");
    setComSearch("");
    setVisitaHora("10:00");
    setTareaDesc("");
    setTareaPrioridad(1);
    setShowCrear(true);

    // Fetch options
    Promise.all([
      fetch("/api/leads?limit=200").then(r => r.json()),
      fetch("/api/inmuebles?limit=200").then(r => r.json()),
      fetch("/api/comerciales").then(r => r.json()),
    ]).then(([l, i, c]) => {
      setLeads(l.data ?? []);
      setInmuebles(i.data ?? []);
      setComerciales(c.data ?? []);
    });
  }

  async function crearEvento() {
    setSaving(true);
    try {
      if (crearTipo === "visita") {
        if (!selectedLeadId || !selectedInmuebleId || !selectedComercialId) {
          toast("Selecciona lead, inmueble y comercial", "error");
          setSaving(false);
          return;
        }
        const [h, m] = visitaHora.split(":").map(Number);
        const fecha = new Date(crearDate);
        fecha.setHours(h, m, 0, 0);

        const res = await fetch("/api/visitas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: selectedLeadId,
            inmuebleId: selectedInmuebleId,
            comercialId: selectedComercialId,
            fecha: fecha.toISOString(),
          }),
        });
        if (res.ok) {
          toast("Visita creada", "success");
          setShowCrear(false);
          fetchEvents();
        } else {
          const err = await res.json();
          toast(err.error ?? "Error", "error");
        }
      } else {
        if (!tareaDesc || !selectedComercialId) {
          toast("Descripcion y comercial son obligatorios", "error");
          setSaving(false);
          return;
        }
        const res = await fetch("/api/tareas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            comercialId: selectedComercialId,
            tipo: tareaTipo,
            descripcion: tareaDesc,
            prioridad: tareaPrioridad,
            fechaLimite: crearDate.toISOString(),
          }),
        });
        if (res.ok) {
          toast("Tarea creada", "success");
          setShowCrear(false);
          fetchEvents();
        } else {
          const err = await res.json();
          toast(err.error ?? "Error", "error");
        }
      }
    } finally { setSaving(false); }
  }

  // === RENDER FUNCTIONS ===

  function renderMonth() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDow; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    const today = new Date();

    return (
      <div>
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS.map((d) => <div key={d} className="text-center text-sm font-semibold text-secondary py-3">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (!day) return <div key={i} className="min-h-[100px] border-b border-r border-border/30 bg-muted/20" />;
            const dayEvents = getEventsForDay(day);
            const isToday = day.toDateString() === today.toDateString();
            return (
              <div key={i} className="min-h-[100px] border-b border-r border-border/30 p-1.5 cursor-pointer hover:bg-primary/[0.02] transition-colors group relative"
                onClick={() => { setCurrentDate(day); setViewMode("dia"); }}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full ${isToday ? "bg-primary text-white" : "text-foreground"}`}>
                    {day.getDate()}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); openCrearModal(day); }}
                    className="h-6 w-6 rounded-full bg-primary text-white items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hidden group-hover:flex cursor-pointer"
                    title="Crear evento"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div key={ev.id} className={`text-xs text-white px-1.5 py-0.5 rounded truncate ${ev.color}`}>
                      {ev.hora ? `${ev.hora} ` : ""}{ev.titulo}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <span className="text-xs text-secondary">+{dayEvents.length - 3} mas</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderDay() {
    const dayEvents = getEventsForDay(currentDate).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    const dateStr = currentDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    return (
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-lg font-bold text-foreground capitalize">{dateStr}</p>
          <Button size="md" onClick={() => openCrearModal(currentDate)} className="gap-2">
            <Plus className="h-4 w-4" /> Crear evento
          </Button>
        </div>
        {dayEvents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-base text-secondary mb-3">No hay eventos para este dia</p>
            <Button variant="outline" onClick={() => openCrearModal(currentDate)} className="gap-2">
              <Plus className="h-4 w-4" /> Crear visita o tarea
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map((ev) => (
              <div key={ev.id} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card">
                <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${ev.color}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    {ev.hora && <span className="text-base font-bold text-foreground">{ev.hora}</span>}
                    <Badge variant={ev.tipo === "visita" ? "info" : "default"} size="sm">
                      {ev.tipo === "visita" ? "Visita" : "Tarea"}
                    </Badge>
                    {ev.resultado && (
                      <Badge variant={ev.resultado.includes("INTERESADO") ? "success" : ev.resultado === "PENDIENTE" ? "info" : "danger"} size="sm">
                        {RESULTADO_VISITA_LABELS[ev.resultado] ?? ev.resultado}
                      </Badge>
                    )}
                  </div>
                  <p className="text-base font-semibold text-foreground">{ev.titulo}</p>
                  <p className="text-sm text-secondary">{ev.subtitulo}</p>
                </div>
              </div>
            ))}
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={() => openCrearModal(currentDate)} className="gap-2">
                <Plus className="h-4 w-4" /> Anadir otro evento
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderWeek() {
    const startOfWeek = new Date(currentDate);
    const dow = startOfWeek.getDay() || 7;
    startOfWeek.setDate(startOfWeek.getDate() - dow + 1);
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) { const d = new Date(startOfWeek); d.setDate(d.getDate() + i); weekDays.push(d); }
    const today = new Date();

    return (
      <div className="grid grid-cols-7">
        {weekDays.map((day) => {
          const dayEvents = getEventsForDay(day);
          const isToday = day.toDateString() === today.toDateString();
          return (
            <div key={day.toISOString()} className="min-h-[300px] border-r border-border/30 p-2 cursor-pointer hover:bg-primary/[0.02] group"
              onClick={() => { setCurrentDate(day); setViewMode("dia"); }}>
              <div className="text-center mb-2">
                <p className="text-xs text-secondary uppercase">{DAYS[day.getDay() === 0 ? 6 : day.getDay() - 1]}</p>
                <span className={`text-lg font-bold inline-flex items-center justify-center w-9 h-9 rounded-full ${isToday ? "bg-primary text-white" : "text-foreground"}`}>{day.getDate()}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); openCrearModal(day); }}
                className="w-full h-8 rounded-lg border border-dashed border-border text-secondary hover:border-primary hover:text-primary transition-colors cursor-pointer flex items-center justify-center gap-1 text-xs opacity-0 group-hover:opacity-100 mb-2"
              >
                <Plus className="h-3 w-3" /> Crear
              </button>
              <div className="space-y-1">
                {dayEvents.map((ev) => (
                  <div key={ev.id} className={`text-xs text-white px-2 py-1 rounded ${ev.color}`}>
                    {ev.hora ? `${ev.hora} ` : ""}{ev.titulo}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const headerLabel = viewMode === "mes"
    ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
    : viewMode === "semana"
    ? `Semana del ${currentDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}`
    : currentDate.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });

  const inputClass = "h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/15";
  const selectClass = inputClass + " appearance-none";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
        <div className="flex items-center gap-3">
          <Button size="lg" className="gap-2" onClick={() => openCrearModal(currentDate)}>
            <Plus className="h-5 w-5" /> Nuevo evento
          </Button>
          <div className="flex items-center gap-1.5 border border-border rounded-xl px-2.5 py-1.5 bg-white">
            <UserCircle className="h-4 w-4 text-secondary" />
            <select
              value={filterComercialId}
              onChange={(e) => setFilterComercialId(e.target.value)}
              className="text-sm bg-transparent border-none outline-none cursor-pointer text-foreground pr-1"
            >
              <option value="">Todos los comerciales</option>
              {comercialesFilter.map((c) => (
                <option key={c.id} value={c.id}>{c.usuario.nombre} {c.usuario.apellidos}</option>
              ))}
            </select>
          </div>
          <div className="flex border border-border rounded-xl overflow-hidden">
            {(["mes", "semana", "dia"] as ViewMode[]).map((mode) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-4 py-2 text-sm font-semibold cursor-pointer transition-colors capitalize ${viewMode === mode ? "bg-primary text-white" : "text-secondary hover:bg-muted"}`}>
                {mode}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate(-1)} className="h-10 w-10 p-0"><ChevronLeft className="h-5 w-5" /></Button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/5 rounded-lg cursor-pointer transition-colors">Hoy</button>
            <Button size="sm" variant="ghost" onClick={() => navigate(1)} className="h-10 w-10 p-0"><ChevronRight className="h-5 w-5" /></Button>
          </div>
        </div>
      </div>

      <p className="text-lg font-semibold text-foreground capitalize">{headerLabel}</p>

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : (
          <>{viewMode === "mes" && renderMonth()}{viewMode === "semana" && renderWeek()}{viewMode === "dia" && renderDay()}</>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-sm text-secondary">Visita pendiente</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-sm text-secondary">Visita interesado</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-sm text-secondary">Tarea alta</span></div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-sm text-secondary">Urgente/Cancelado</span></div>
      </div>

      {/* Modal crear evento */}
      {showCrear && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowCrear(false)} />
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <div className="bg-card rounded-2xl shadow-[var(--shadow-xl)] w-full max-w-[520px]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h2 className="text-xl font-bold text-foreground">
                  Nuevo evento — {crearDate.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                </h2>
                <button onClick={() => setShowCrear(false)} className="h-9 w-9 rounded-lg flex items-center justify-center text-secondary hover:bg-muted cursor-pointer">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Tipo selector */}
                <div className="flex gap-2">
                  <button onClick={() => setCrearTipo("visita")}
                    className={`flex-1 h-12 rounded-xl text-base font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 ${
                      crearTipo === "visita" ? "bg-blue-50 text-blue-700 border-2 border-blue-300" : "bg-muted text-secondary border-2 border-transparent"
                    }`}>
                    <Eye className="h-5 w-5" /> Visita
                  </button>
                  <button onClick={() => setCrearTipo("tarea")}
                    className={`flex-1 h-12 rounded-xl text-base font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 ${
                      crearTipo === "tarea" ? "bg-amber-50 text-amber-700 border-2 border-amber-300" : "bg-muted text-secondary border-2 border-transparent"
                    }`}>
                    <CheckSquare className="h-5 w-5" /> Tarea
                  </button>
                </div>

                {crearTipo === "visita" ? (
                  <>
                    <div>
                      <label className="text-sm font-medium text-secondary block mb-1">Hora</label>
                      <input type="time" value={visitaHora} onChange={(e) => setVisitaHora(e.target.value)} className={inputClass} />
                    </div>
                    <div className="relative">
                      <label className="text-sm font-medium text-secondary block mb-1">Lead / Comprador *</label>
                      <input
                        type="text"
                        value={leadSearch}
                        onChange={(e) => { setLeadSearch(e.target.value); setSelectedLeadId(""); }}
                        onFocus={() => setLeadFocused(true)}
                        onBlur={() => setTimeout(() => setLeadFocused(false), 200)}
                        placeholder="Buscar por nombre o telefono..."
                        className={inputClass}
                      />
                      {leadFocused && leadSearch.length >= 1 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {leads.filter((l) => {
                            const q = leadSearch.toLowerCase();
                            return `${l.nombre} ${l.apellidos ?? ""} ${l.telefono ?? ""}`.toLowerCase().includes(q);
                          }).slice(0, 8).map((l) => (
                            <div
                              key={l.id}
                              onMouseDown={() => { setSelectedLeadId(l.id); setLeadSearch(`${l.nombre} ${l.apellidos ?? ""}`); setLeadFocused(false); }}
                              className="px-3 py-2 hover:bg-primary/5 cursor-pointer text-sm"
                            >
                              <span className="font-medium">{l.nombre} {l.apellidos ?? ""}</span>
                              {l.telefono && <span className="text-xs text-secondary ml-2">{l.telefono}</span>}
                            </div>
                          ))}
                          {leads.filter((l) => `${l.nombre} ${l.apellidos ?? ""} ${l.telefono ?? ""}`.toLowerCase().includes(leadSearch.toLowerCase())).length === 0 && (
                            <p className="px-3 py-2 text-xs text-secondary">Sin resultados</p>
                          )}
                        </div>
                      )}
                      {selectedLeadId && <span className="absolute right-3 top-[38px] text-emerald-500 text-xs">✓</span>}
                    </div>
                    <div className="relative">
                      <label className="text-sm font-medium text-secondary block mb-1">Inmueble *</label>
                      <input
                        type="text"
                        value={inmSearch}
                        onChange={(e) => { setInmSearch(e.target.value); setSelectedInmuebleId(""); }}
                        onFocus={() => setInmFocused(true)}
                        onBlur={() => setTimeout(() => setInmFocused(false), 200)}
                        placeholder="Buscar por referencia o titulo..."
                        className={inputClass}
                      />
                      {inmFocused && inmSearch.length >= 1 && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {inmuebles.filter((i) => {
                            const q = inmSearch.toLowerCase();
                            return `${i.referencia} ${i.titulo}`.toLowerCase().includes(q);
                          }).slice(0, 8).map((i) => (
                            <div
                              key={i.id}
                              onMouseDown={() => { setSelectedInmuebleId(i.id); setInmSearch(`${i.referencia} - ${i.titulo}`); setInmFocused(false); }}
                              className="px-3 py-2 hover:bg-primary/5 cursor-pointer text-sm"
                            >
                              <span className="text-xs font-mono text-secondary mr-1">{i.referencia}</span>
                              <span className="font-medium">{i.titulo}</span>
                            </div>
                          ))}
                          {inmuebles.filter((i) => `${i.referencia} ${i.titulo}`.toLowerCase().includes(inmSearch.toLowerCase())).length === 0 && (
                            <p className="px-3 py-2 text-xs text-secondary">Sin resultados</p>
                          )}
                        </div>
                      )}
                      {selectedInmuebleId && <span className="absolute right-3 top-[38px] text-emerald-500 text-xs">✓</span>}
                    </div>
                    <div className="relative">
                      <label className="text-sm font-medium text-secondary block mb-1">Comercial *</label>
                      <input
                        type="text"
                        value={comSearch}
                        onChange={(e) => { setComSearch(e.target.value); setSelectedComercialId(""); }}
                        onFocus={() => setComFocused(true)}
                        onBlur={() => setTimeout(() => setComFocused(false), 200)}
                        placeholder="Buscar comercial..."
                        className={inputClass}
                      />
                      {comFocused && (
                        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                          {comerciales.filter((c) => {
                            const q = comSearch.toLowerCase();
                            return `${c.usuario.nombre} ${c.usuario.apellidos}`.toLowerCase().includes(q);
                          }).slice(0, 8).map((c) => (
                            <div
                              key={c.id}
                              onMouseDown={() => { setSelectedComercialId(c.id); setComSearch(`${c.usuario.nombre} ${c.usuario.apellidos}`); setComFocused(false); }}
                              className="px-3 py-2 hover:bg-primary/5 cursor-pointer text-sm font-medium"
                            >
                              {c.usuario.nombre} {c.usuario.apellidos}
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedComercialId && <span className="absolute right-3 top-[38px] text-emerald-500 text-xs">✓</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium text-secondary block mb-1">Descripcion *</label>
                      <input value={tareaDesc} onChange={(e) => setTareaDesc(e.target.value)} className={inputClass} placeholder="Que hay que hacer..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-secondary block mb-1">Tipo</label>
                        <select value={tareaTipo} onChange={(e) => setTareaTipo(e.target.value)} className={selectClass}>
                          <option value="LLAMAR">Llamar</option>
                          <option value="WHATSAPP">WhatsApp</option>
                          <option value="EMAIL">Email</option>
                          <option value="SEGUIMIENTO">Seguimiento</option>
                          <option value="DOCUMENTACION">Documentacion</option>
                          <option value="SUBIR_FOTOS">Subir fotos</option>
                          <option value="VISITA_CAPTACION">Visita captacion</option>
                          <option value="OTRO">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-secondary block mb-1">Prioridad</label>
                        <select value={String(tareaPrioridad)} onChange={(e) => setTareaPrioridad(Number(e.target.value))} className={selectClass}>
                          <option value="0">Normal</option>
                          <option value="1">Alta</option>
                          <option value="2">Urgente</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-secondary block mb-1">Comercial *</label>
                      <select value={selectedComercialId} onChange={(e) => setSelectedComercialId(e.target.value)} className={selectClass}>
                        <option value="">Seleccionar comercial...</option>
                        {comerciales.map((c) => <option key={c.id} value={c.id}>{c.usuario.nombre} {c.usuario.apellidos}</option>)}
                      </select>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
                <Button variant="secondary" onClick={() => setShowCrear(false)}>Cancelar</Button>
                <Button onClick={crearEvento} loading={saving} size="lg">
                  Crear {crearTipo === "visita" ? "visita" : "tarea"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
