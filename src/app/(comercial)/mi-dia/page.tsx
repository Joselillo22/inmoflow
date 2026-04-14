"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskList } from "@/components/comercial/task-list";
import {
  CalendarCheck, Phone, ClipboardList, Building2,
  MessageCircle, Clock, TrendingUp, TrendingDown, Target, ChevronRight,
} from "lucide-react";
import { formatTime, formatCurrency } from "@/lib/utils/formatters";

interface MiDiaData {
  resumen: {
    citasHoy: number;
    llamadasPendientes: number;
    tareasPendientes: number;
  };
  proximaCita: {
    fecha: string;
    lead: { nombre: string; apellidos: string | null; telefono: string | null };
    inmueble: { titulo: string; direccion: string; precio: number };
  } | null;
  citasHoy: Array<{
    id: string;
    fecha: string;
    lead: { nombre: string; apellidos: string | null; telefono: string | null };
    inmueble: { titulo: string; direccion: string; precio: number };
  }>;
  tareasPendientes: Array<{
    id: string;
    descripcion: string;
    prioridad: number;
    completada: boolean;
    tipo: string;
    fechaLimite: string | null;
  }>;
  cartera: {
    activos: number;
    reservados: number;
    enCaptacion: number;
    visitasMes: number;
    cierresMes: number;
  };
}

export default function MiDiaPage() {
  const [data, setData] = useState<MiDiaData | null>(null);
  const [miRend, setMiRend] = useState<{
    mesActual: { leads: number; visitas: number; cierres: number };
    mesAnterior: { leads: number; visitas: number; cierres: number };
    variacion: { leads: number; visitas: number; cierres: number };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();
  const { t } = useTranslation();

  const fetchData = useCallback(() => {
    Promise.all([
      fetch("/api/comercial").then((r) => r.json()),
      fetch("/api/comercial/rendimiento").then((r) => r.json()).catch(() => ({ data: null })),
    ]).then(([miDiaRes, rendRes]) => {
      setData(miDiaRes.data);
      if (rendRes.data) setMiRend(rendRes.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const nombre = session?.user?.name?.split(" ")[0] ?? "";
  const hora = new Date().getHours();
  const saludo = hora < 13 ? "Buenos días" : hora < 20 ? "Buenas tardes" : "Buenas noches";

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Saludo */}
      <div className="rounded-2xl bg-gradient-to-r from-[#1a56db] to-[#3b82f6] p-4 text-white shadow-lg">
        <p className="font-semibold">{saludo}{nombre ? `, ${nombre}` : ""} 👋</p>
        <p className="text-xs opacity-70 mt-0.5">
          {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Link href="/agenda" className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm p-3 text-center cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold">{data.resumen.citasHoy}</p>
          <p className="text-[10px] text-secondary leading-tight mt-0.5">{t("comercial.appointmentsToday")}</p>
        </Link>
        <Link href="/contactos" className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm p-3 text-center cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95">
          <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center mx-auto mb-2">
            <Phone className="h-5 w-5 text-warning" />
          </div>
          <p className="text-2xl font-bold">{data.resumen.llamadasPendientes}</p>
          <p className="text-[10px] text-secondary leading-tight mt-0.5">{t("comercial.calls")}</p>
        </Link>
        <a href="#tareas" className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm p-3 text-center cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95">
          <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-2">
            <ClipboardList className="h-5 w-5 text-success" />
          </div>
          <p className="text-2xl font-bold">{data.resumen.tareasPendientes}</p>
          <p className="text-[10px] text-secondary leading-tight mt-0.5">{t("comercial.tasks")}</p>
        </a>
      </div>

      {/* Próxima cita */}
      {data.proximaCita && (
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 border-b border-border/40">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-sm font-semibold">{t("comercial.nextAppointment")}</p>
          </div>
          <div className="p-4">
            <p className="text-2xl font-bold text-primary">{formatTime(data.proximaCita.fecha)}</p>
            <p className="font-semibold text-foreground mt-1">
              {data.proximaCita.lead.nombre} {data.proximaCita.lead.apellidos ?? ""}
            </p>
            <p className="text-sm text-secondary">{data.proximaCita.inmueble.titulo}</p>
            <p className="text-xs text-secondary">{data.proximaCita.inmueble.direccion}</p>
            <p className="text-sm font-bold text-foreground mt-1">
              {formatCurrency(Number(data.proximaCita.inmueble.precio))}
            </p>
            {data.proximaCita.lead.telefono && (
              <div className="flex gap-2 mt-3">
                <a href={`tel:${data.proximaCita.lead.telefono}`} className="flex-1">
                  <Button size="md" className="w-full"><Phone className="h-4 w-4" />{t("comercial.call")}</Button>
                </a>
                <a
                  href={`https://wa.me/34${data.proximaCita.lead.telefono.replace(/\D/g, "")}`}
                  target="_blank" rel="noopener noreferrer" className="flex-1"
                >
                  <Button size="md" variant="success" className="w-full">
                    <MessageCircle className="h-4 w-4" />WhatsApp
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resto de citas */}
      {data.citasHoy.length > 1 && (
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 border-b border-border/40">
            <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
              <CalendarCheck className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <p className="text-sm font-semibold">{t("comercial.appointmentsToday")}</p>
            <Badge variant="warning" size="sm" className="ml-auto">{data.citasHoy.length}</Badge>
          </div>
          <div className="divide-y divide-border/40">
            {data.citasHoy.map((cita) => (
              <div key={cita.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-semibold">
                    {formatTime(cita.fecha)} — {cita.lead.nombre} {cita.lead.apellidos ?? ""}
                  </p>
                  <p className="text-xs text-secondary">{cita.inmueble.titulo}</p>
                </div>
                {cita.lead.telefono && (
                  <a href={`tel:${cita.lead.telefono}`}>
                    <Button size="icon" variant="ghost"><Phone className="h-4 w-4" /></Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tareas */}
      {data.tareasPendientes.length > 0 && <div id="tareas"><TaskList tareas={data.tareasPendientes} /></div>}

      {/* Mi rendimiento */}
      {miRend && (
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 border-b border-border/40">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-sm font-semibold">Mi rendimiento</p>
          </div>
          <div className="p-4">
            {/* Mini funnel */}
            <div className="flex items-center justify-between text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">{miRend.mesActual.leads}</p>
                <p className="text-[10px] text-secondary">Leads</p>
              </div>
              <ChevronRight className="h-4 w-4 text-secondary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{miRend.mesActual.visitas}</p>
                <p className="text-[10px] text-secondary">Visitas</p>
              </div>
              <ChevronRight className="h-4 w-4 text-secondary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{miRend.mesActual.cierres}</p>
                <p className="text-[10px] text-secondary">Cierres</p>
              </div>
            </div>
            {/* Comparativa con mes anterior */}
            <div className="mt-3 pt-3 border-t border-border/40 space-y-1">
              {miRend.variacion.visitas > 0 && (
                <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> +{miRend.variacion.visitas} visitas vs mes anterior
                </p>
              )}
              {miRend.variacion.visitas < 0 && (
                <p className="text-sm text-secondary flex items-center gap-1.5">
                  <TrendingDown className="h-4 w-4" /> {miRend.variacion.visitas} visitas vs mes anterior
                </p>
              )}
              {miRend.variacion.cierres > 0 && (
                <p className="text-sm text-emerald-600 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" /> +{miRend.variacion.cierres} cierres vs mes anterior
                </p>
              )}
              {miRend.variacion.leads !== 0 && miRend.variacion.visitas === 0 && miRend.variacion.cierres === 0 && (
                <p className="text-sm text-secondary flex items-center gap-1.5">
                  Mismo ritmo que el mes pasado
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mi cartera */}
      <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 pt-3 pb-2.5 border-b border-border/40">
          <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
            <Building2 className="h-3.5 w-3.5 text-slate-600" />
          </div>
          <p className="text-sm font-semibold">{t("comercial.myPortfolio")}</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-xl font-bold text-emerald-700">{data.cartera.activos}</p>
              <p className="text-[10px] text-emerald-600">{t("comercial.activeProperties")}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-xl font-bold text-amber-700">{data.cartera.reservados}</p>
              <p className="text-[10px] text-amber-600">{t("comercial.reserved")}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-xl font-bold text-blue-700">{data.cartera.enCaptacion}</p>
              <p className="text-[10px] text-blue-600">{t("comercial.inCapture")}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-border/40 grid grid-cols-2 gap-2">
            <div className="text-center">
              <p className="text-lg font-bold">{data.cartera.visitasMes}</p>
              <p className="text-[10px] text-secondary">{t("comercial.monthlyVisits")}</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold">{data.cartera.cierresMes}</p>
              <p className="text-[10px] text-secondary">{t("comercial.monthlyClosings")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
