"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, MessageCircle, CalendarDays, MapPin, Home } from "lucide-react";
import { formatDateTime, formatTime, formatCurrency } from "@/lib/utils/formatters";
import { RESULTADO_VISITA_LABELS } from "@/lib/utils/constants";

interface Visita {
  id: string;
  fecha: string;
  resultado: string;
  lead: { nombre: string; apellidos: string | null; telefono: string | null };
  inmueble: { titulo: string; direccion: string; precio: number; referencia: string };
}

const resultadoColor: Record<string, string> = {
  PENDIENTE: "bg-blue-100 text-blue-700",
  REALIZADA_INTERESADO: "bg-emerald-100 text-emerald-700",
  REALIZADA_NO_INTERESADO: "bg-slate-100 text-slate-600",
  CANCELADA: "bg-red-100 text-red-700",
  NO_SHOW: "bg-red-100 text-red-700",
};

function isToday(fecha: string) {
  const d = new Date(fecha);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isTomorrow(fecha: string) {
  const d = new Date(fecha);
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return d.toDateString() === now.toDateString();
}

function groupByDay(visitas: Visita[]) {
  const groups: Record<string, Visita[]> = {};
  visitas.forEach((v) => {
    const key = new Date(v.fecha).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(v);
  });
  return groups;
}

function dayLabel(dateStr: string) {
  const fecha = new Date(dateStr);
  if (isToday(dateStr)) return "Hoy";
  if (isTomorrow(dateStr)) return "Mañana";
  return fecha.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" });
}

export default function AgendaPage() {
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    fetch("/api/visitas?limit=50&sortBy=fecha&sortOrder=asc")
      .then((r) => r.json())
      .then((res) => setVisitas(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40 rounded-xl" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
      </div>
    );
  }

  const groups = groupByDay(visitas);
  const dayKeys = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-secondary" />
          {t("comercial.myAgenda")}
        </h2>
        {visitas.length > 0 && <Badge variant="info" size="sm">{visitas.length}</Badge>}
      </div>

      {/* Grupos por día */}
      {dayKeys.map((dayKey) => (
        <div key={dayKey} className="space-y-2">
          {/* Etiqueta día */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isToday(groups[dayKey][0].fecha)
                ? "bg-primary text-white"
                : "bg-slate-200 text-slate-600"
            }`}>
              {dayLabel(groups[dayKey][0].fecha)}
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Visitas del día */}
          {groups[dayKey].map((visita) => (
            <div key={visita.id} className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm overflow-hidden">
              <div className="px-4 pt-3.5 pb-3">
                {/* Hora + resultado */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl font-bold text-primary">{formatTime(visita.fecha)}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${resultadoColor[visita.resultado] ?? "bg-slate-100 text-slate-600"}`}>
                    {RESULTADO_VISITA_LABELS[visita.resultado] ?? visita.resultado}
                  </span>
                </div>

                {/* Lead */}
                <p className="font-semibold text-foreground">
                  {visita.lead.nombre} {visita.lead.apellidos ?? ""}
                </p>

                {/* Inmueble */}
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

              {/* Acciones */}
              {visita.lead.telefono && (
                <div className="flex border-t border-border/40">
                  <a href={`tel:${visita.lead.telefono}`} className="flex-1">
                    <button className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-secondary hover:text-foreground hover:bg-muted transition-colors">
                      <Phone className="h-3.5 w-3.5" />
                      {t("comercial.call")}
                    </button>
                  </a>
                  <div className="w-px bg-border/40" />
                  <a
                    href={`https://wa.me/34${visita.lead.telefono.replace(/\D/g, "")}`}
                    target="_blank" rel="noopener noreferrer" className="flex-1"
                  >
                    <button className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors">
                      <MessageCircle className="h-3.5 w-3.5" />
                      WhatsApp
                    </button>
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}

      {visitas.length === 0 && (
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm py-12 text-center">
          <CalendarDays className="h-8 w-8 text-secondary/30 mx-auto mb-2" />
          <p className="text-sm text-secondary">{t("comercial.noVisits")}</p>
        </div>
      )}
    </div>
  );
}
