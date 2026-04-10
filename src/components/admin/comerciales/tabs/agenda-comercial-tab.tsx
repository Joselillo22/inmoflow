"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { Calendar, ChevronLeft, ChevronRight, Plus, Eye, CheckSquare, X } from "lucide-react";
import { formatTime } from "@/lib/utils/formatters";
import { RESULTADO_VISITA_LABELS } from "@/lib/utils/constants";
import type { ComercialVisita, ComercialTarea } from "@/lib/types/comercial";

interface AgendaComercialTabProps {
  visitas: ComercialVisita[];
  tareas: ComercialTarea[];
  comercialId: string;
  onUpdated: () => void;
}

const DAYS = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function AgendaComercialTab({ visitas, tareas, comercialId, onUpdated }: AgendaComercialTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCrear, setShowCrear] = useState(false);
  const [crearDate, setCrearDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Tarea creation form
  const [tareaTipo, setTareaTipo] = useState("LLAMAR");
  const [tareaDesc, setTareaDesc] = useState("");
  const [tareaPrio, setTareaPrio] = useState(1);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  function getEventsForDay(day: Date) {
    const events: { id: string; tipo: "visita" | "tarea"; label: string; color: string; hora?: string }[] = [];
    for (const v of visitas) {
      const vd = new Date(v.fecha);
      if (vd.getDate() === day.getDate() && vd.getMonth() === day.getMonth() && vd.getFullYear() === day.getFullYear()) {
        const colors: Record<string, string> = { PENDIENTE: "bg-blue-500", REALIZADA_INTERESADO: "bg-emerald-500", REALIZADA_NO_INTERESADO: "bg-amber-500", CANCELADA: "bg-red-500", NO_SHOW: "bg-red-400" };
        events.push({ id: v.id, tipo: "visita", label: `${v.lead.nombre} ${v.lead.apellidos ?? ""}`.trim(), color: colors[v.resultado] ?? "bg-blue-500", hora: formatTime(v.fecha) });
      }
    }
    for (const t of tareas) {
      if (!t.fechaLimite || t.completada) continue;
      const td = new Date(t.fechaLimite);
      if (td.getDate() === day.getDate() && td.getMonth() === day.getMonth() && td.getFullYear() === day.getFullYear()) {
        const colors: Record<number, string> = { 2: "bg-red-500", 1: "bg-amber-500", 0: "bg-slate-400" };
        events.push({ id: t.id, tipo: "tarea", label: t.descripcion, color: colors[t.prioridad] ?? "bg-slate-400" });
      }
    }
    return events;
  }

  // Calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const days: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  const today = new Date();

  // Selected day detail
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const selectedEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  async function crearTarea() {
    if (!tareaDesc) { toast("La descripcion es obligatoria", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/tareas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comercialId, tipo: tareaTipo, descripcion: tareaDesc, prioridad: tareaPrio, fechaLimite: crearDate.toISOString() }),
      });
      if (res.ok) { toast("Tarea creada", "success"); setShowCrear(false); setTareaDesc(""); onUpdated(); }
    } finally { setSaving(false); }
  }

  const inputClass = "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:outline-none";

  return (
    <div className="p-5 space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-base font-bold text-foreground">{MONTHS[month]} {year}</span>
        <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-muted cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {/* Mini calendar */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-7 bg-muted/50">
          {DAYS.map((d) => <div key={d} className="text-center text-xs font-semibold text-secondary py-2">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (!day) return <div key={i} className="h-14 border-t border-r border-border/20" />;
            const dayEvents = getEventsForDay(day);
            const isToday = day.toDateString() === today.toDateString();
            const isSelected = selectedDay?.toDateString() === day.toDateString();
            return (
              <div
                key={i}
                onClick={() => setSelectedDay(day)}
                className={`h-14 border-t border-r border-border/20 p-1 cursor-pointer transition-colors relative ${isSelected ? "bg-primary/10" : "hover:bg-muted/50"}`}
              >
                <span className={`text-xs font-medium inline-flex items-center justify-center w-5 h-5 rounded-full ${isToday ? "bg-primary text-white" : "text-foreground"}`}>
                  {day.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev, j) => (
                      <div key={j} className={`w-1.5 h-1.5 rounded-full ${ev.color}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">
              {selectedDay.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <Button size="sm" variant="outline" onClick={() => { setCrearDate(selectedDay); setShowCrear(true); }} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Crear tarea
            </Button>
          </div>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-secondary text-center py-4">Sin eventos este dia</p>
          ) : (
            <div className="space-y-1.5">
              {selectedEvents.map((ev) => (
                <div key={ev.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/50">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${ev.color}`} />
                  <Badge variant={ev.tipo === "visita" ? "info" : "default"} size="sm">{ev.tipo === "visita" ? "Visita" : "Tarea"}</Badge>
                  {ev.hora && <span className="text-sm font-bold text-foreground">{ev.hora}</span>}
                  <span className="text-sm text-foreground truncate">{ev.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick create tarea modal */}
      {showCrear && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-foreground">Nueva tarea — {crearDate.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</p>
            <button onClick={() => setShowCrear(false)} className="h-6 w-6 rounded flex items-center justify-center text-secondary hover:bg-muted cursor-pointer"><X className="h-4 w-4" /></button>
          </div>
          <input value={tareaDesc} onChange={(e) => setTareaDesc(e.target.value)} placeholder="Descripcion..." className={inputClass} />
          <div className="grid grid-cols-2 gap-2">
            <select value={tareaTipo} onChange={(e) => setTareaTipo(e.target.value)} className={inputClass + " appearance-none"}>
              <option value="LLAMAR">Llamar</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option>
              <option value="SEGUIMIENTO">Seguimiento</option><option value="DOCUMENTACION">Documentacion</option><option value="OTRO">Otro</option>
            </select>
            <select value={String(tareaPrio)} onChange={(e) => setTareaPrio(Number(e.target.value))} className={inputClass + " appearance-none"}>
              <option value="0">Normal</option><option value="1">Alta</option><option value="2">Urgente</option>
            </select>
          </div>
          <Button size="sm" onClick={crearTarea} loading={saving} className="w-full">Crear tarea</Button>
        </div>
      )}
    </div>
  );
}
