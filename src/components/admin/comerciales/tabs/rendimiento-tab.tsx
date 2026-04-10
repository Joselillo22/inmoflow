"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Eye, Handshake, Trophy, Clock, Euro,
  CheckSquare, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Phone as PhoneIcon, MessageCircle, Mail, UserCheck,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface MetricaConVariacion {
  valor: number;
  variacion: number | null;
}

interface RendimientoData {
  funnel: {
    leadsAsignados: MetricaConVariacion;
    leadsContactados: MetricaConVariacion;
    tasaContacto: MetricaConVariacion;
    tiempoMedio1erContacto: MetricaConVariacion;
    visitasRealizadas: MetricaConVariacion;
    tasaVisita: MetricaConVariacion;
    ofertas: MetricaConVariacion;
    tasaOferta: MetricaConVariacion;
    cierres: MetricaConVariacion;
    tasaCierre: MetricaConVariacion;
  };
  revenue: {
    comisionesTotal: MetricaConVariacion;
    comisionesEmpresa: MetricaConVariacion;
    comisionesComercial: MetricaConVariacion;
  };
  actividad: {
    tareasCompletadas: MetricaConVariacion;
    tareasVencidas: MetricaConVariacion;
    noShows: MetricaConVariacion;
    interacciones: {
      total: number;
      porCanal: Record<string, number>;
    };
  };
  cartera: { inmueblesActivos: number; inmueblesReservados: number };
  historico: { labels: string[]; cierres: number[]; visitas: number[]; leads: number[] };
}

interface RendimientoTabProps {
  comercialId: string;
}

const PERIODOS = [
  { id: "este_mes", label: "Este mes" },
  { id: "mes_anterior", label: "Mes anterior" },
  { id: "trimestre", label: "Trimestre" },
];

function Variacion({ valor }: { valor: number | null }) {
  if (valor === null || valor === 0) return <Minus className="h-3 w-3 text-secondary" />;
  if (valor > 0) return <span className="flex items-center gap-0.5 text-emerald-600 text-[10px] font-bold"><TrendingUp className="h-3 w-3" />+{valor}</span>;
  return <span className="flex items-center gap-0.5 text-red-500 text-[10px] font-bold"><TrendingDown className="h-3 w-3" />{valor}</span>;
}

const CANAL_ICONS: Record<string, typeof PhoneIcon> = {
  TELEFONO: PhoneIcon,
  WHATSAPP: MessageCircle,
  EMAIL: Mail,
  PRESENCIAL: UserCheck,
};

const CANAL_LABELS: Record<string, string> = {
  TELEFONO: "Teléfono",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  PRESENCIAL: "Presencial",
  PORTAL: "Portal",
  SISTEMA: "Sistema",
};

export function RendimientoTab({ comercialId }: RendimientoTabProps) {
  const [data, setData] = useState<RendimientoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("este_mes");

  useEffect(() => {
    setLoading(true);
    const now = new Date();
    let desde: string;
    let hasta: string = now.toISOString().slice(0, 10);

    if (periodo === "este_mes") {
      desde = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    } else if (periodo === "mes_anterior") {
      desde = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      hasta = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
    } else {
      desde = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10);
    }

    fetch(`/api/comerciales/${comercialId}/rendimiento?desde=${desde}&hasta=${hasta}`)
      .then((r) => r.json())
      .then((d) => { setData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [comercialId, periodo]);

  if (loading) {
    return (
      <div className="p-5 space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20" />
        <Skeleton className="h-40" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!data) return <p className="text-secondary text-sm text-center py-8">Error cargando datos</p>;

  const f = data.funnel;
  const funnelSteps = [
    { label: "Leads", value: f.leadsAsignados.valor, variacion: f.leadsAsignados.variacion, color: "bg-blue-100 text-blue-700", barColor: "bg-blue-400" },
    { label: "Contactados", value: f.leadsContactados.valor, variacion: f.leadsContactados.variacion, tasa: `${f.tasaContacto.valor}%`, color: "bg-sky-100 text-sky-700", barColor: "bg-sky-400" },
    { label: "Visitas", value: f.visitasRealizadas.valor, variacion: f.visitasRealizadas.variacion, tasa: `${f.tasaVisita.valor}%`, color: "bg-cyan-100 text-cyan-700", barColor: "bg-cyan-400" },
    { label: "Ofertas", value: f.ofertas.valor, variacion: f.ofertas.variacion, tasa: `${f.tasaOferta.valor}%`, color: "bg-teal-100 text-teal-700", barColor: "bg-teal-400" },
    { label: "Cierres", value: f.cierres.valor, variacion: f.cierres.variacion, tasa: `${f.tasaCierre.valor}%`, color: "bg-emerald-100 text-emerald-700", barColor: "bg-emerald-500" },
  ];

  const maxFunnel = Math.max(...funnelSteps.map((s) => s.value), 1);

  // Tiempo respuesta color
  const tiempoColor = f.tiempoMedio1erContacto.valor <= 5 ? "text-emerald-600" : f.tiempoMedio1erContacto.valor <= 15 ? "text-amber-600" : "text-red-600";

  // Gráfico data
  const chartData = data.historico.labels.map((label, i) => ({
    name: label,
    Cierres: data.historico.cierres[i],
    Visitas: data.historico.visitas[i],
    Leads: data.historico.leads[i],
  }));

  return (
    <div className="p-5 space-y-5">
      {/* Selector de periodo */}
      <div className="flex gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              periodo === p.id ? "bg-primary text-white" : "bg-muted text-secondary hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Funnel visual */}
      <div>
        <p className="text-xs font-semibold text-foreground mb-3">Funnel de conversión</p>
        <div className="space-y-2">
          {funnelSteps.map((step, i) => (
            <div key={step.label} className="flex items-center gap-3">
              <div className="w-20 text-right">
                <p className="text-xs font-medium text-foreground">{step.label}</p>
                {step.tasa && <p className="text-[10px] text-secondary">{step.tasa}</p>}
              </div>
              <div className="flex-1 h-7 bg-muted rounded-lg overflow-hidden relative">
                <div
                  className={`h-full ${step.barColor} rounded-lg transition-all duration-700 flex items-center justify-end pr-2`}
                  style={{ width: `${Math.max((step.value / maxFunnel) * 100, 8)}%` }}
                >
                  <span className="text-xs font-bold text-white">{step.value}</span>
                </div>
              </div>
              <div className="w-10"><Variacion valor={step.variacion} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI cards 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Clock className={`h-4 w-4 ${tiempoColor}`} />
            <span className="text-xs text-secondary">Tiempo 1er contacto</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl font-bold ${tiempoColor}`}>{f.tiempoMedio1erContacto.valor}</span>
            <span className="text-xs text-secondary">min</span>
            <span className="ml-auto"><Variacion valor={f.tiempoMedio1erContacto.variacion ? -f.tiempoMedio1erContacto.variacion : null} /></span>
          </div>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Euro className="h-4 w-4 text-emerald-600" />
            <span className="text-xs text-secondary">Revenue empresa</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground">{formatCurrency(data.revenue.comisionesEmpresa.valor)}</span>
            <span className="ml-auto"><Variacion valor={data.revenue.comisionesEmpresa.variacion} /></span>
          </div>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-secondary">Tareas completadas</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-foreground">{data.actividad.tareasCompletadas.valor}</span>
            {data.actividad.tareasVencidas.valor > 0 && (
              <span className="text-xs text-red-500 flex items-center gap-0.5">
                <AlertTriangle className="h-3 w-3" />{data.actividad.tareasVencidas.valor} vencidas
              </span>
            )}
          </div>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="h-4 w-4 text-violet-600" />
            <span className="text-xs text-secondary">Cartera activa</span>
          </div>
          <p className="text-xl font-bold text-foreground">{data.cartera.inmueblesActivos}
            {data.cartera.inmueblesReservados > 0 && (
              <span className="text-sm font-normal text-secondary"> + {data.cartera.inmueblesReservados} reserv.</span>
            )}
          </p>
        </div>
      </div>

      {/* Gráfico evolución */}
      <div>
        <p className="text-xs font-semibold text-foreground mb-3">Evolución últimos 6 meses</p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--color-secondary)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--color-secondary)" allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Visitas" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Cierres" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Leads" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Desglose por canal */}
      {data.actividad.interacciones.total > 0 && (
        <div>
          <p className="text-xs font-semibold text-foreground mb-3">Interacciones por canal</p>
          <div className="space-y-2">
            {Object.entries(data.actividad.interacciones.porCanal)
              .sort(([, a], [, b]) => b - a)
              .map(([canal, count]) => {
                const Icon = CANAL_ICONS[canal] ?? PhoneIcon;
                const pct = Math.round((count / data.actividad.interacciones.total) * 100);
                return (
                  <div key={canal} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-secondary shrink-0" />
                    <span className="text-xs text-foreground w-20">{CANAL_LABELS[canal] ?? canal}</span>
                    <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary/60 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-bold text-foreground w-8 text-right">{count}</span>
                    <span className="text-[10px] text-secondary w-8">{pct}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
