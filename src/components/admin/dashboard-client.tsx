"use client";

import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/ui/avatar";
import {
  Building2, Users, UserCircle, Handshake, TrendingUp,
  Euro, Eye, UserX,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const { t } = useTranslation();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <p className="text-secondary text-xs text-center py-8">{t("common.noData")}</p>;
  let cumulativePercent = 0;
  const size = 140;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center justify-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {data.map((d, i) => {
          const percent = d.value / total;
          const dashArray = `${circumference * percent} ${circumference * (1 - percent)}`;
          const dashOffset = -circumference * cumulativePercent;
          cumulativePercent += percent;
          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className="transition-all duration-700"
            />
          );
        })}
      </svg>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-xs text-secondary">{d.label}</span>
            <span className="text-sm font-bold text-foreground ml-auto">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DashboardStats {
  totalInmuebles: number;
  totalLeads: number;
  totalComerciales: number;
  totalOperaciones: number;
  facturacionMes: number;
  operacionesCerradasMes: number;
  visitasMes: number;
  leadsSinAsignar: number;
  inmueblesPorEstado: { estado: string; _count: number }[];
  leadsPorFuente: { fuente: string; _count: number }[];
  rendimientoComerciales: {
    id: string;
    zona: string;
    usuario: { nombre: string; apellidos: string };
    _count: { leads: number; visitas: number; operaciones: number };
  }[];
}

export function DashboardClient({ stats }: { stats: DashboardStats }) {
  const { t } = useTranslation();

  const mainKpis = [
    { labelKey: "dashboard.totalProperties", value: stats.totalInmuebles, icon: Building2, iconBg: "bg-slate-100", iconColor: "text-slate-500", href: "/inmuebles" },
    { labelKey: "dashboard.activeLeads", value: stats.totalLeads, icon: Users, iconBg: "bg-slate-100", iconColor: "text-slate-500", href: "/leads" },
    { labelKey: "dashboard.commercialAgents", value: stats.totalComerciales, icon: UserCircle, iconBg: "bg-slate-100", iconColor: "text-slate-500", href: "/comerciales" },
    { labelKey: "dashboard.operations", value: stats.totalOperaciones, icon: Handshake, iconBg: "bg-slate-100", iconColor: "text-slate-500", href: "/operaciones" },
  ];

  const monthKpis = [
    { labelKey: "dashboard.monthlyRevenue", value: formatCurrency(stats.facturacionMes), icon: Euro, iconBg: "bg-slate-100", iconColor: "text-slate-500", highlight: false, href: "/operaciones" },
    { labelKey: "dashboard.monthlyClosings", value: stats.operacionesCerradasMes, icon: TrendingUp, iconBg: "bg-slate-100", iconColor: "text-slate-500", highlight: false, href: "/operaciones" },
    { labelKey: "dashboard.monthlyVisits", value: stats.visitasMes, icon: Eye, iconBg: "bg-slate-100", iconColor: "text-slate-500", highlight: false, href: "/calendario" },
    { labelKey: "dashboard.unassignedLeads", value: stats.leadsSinAsignar, icon: UserX, iconBg: "bg-orange-50", iconColor: "text-orange-500", highlight: true, href: "/leads?sinAsignar=true" },
  ];

  const donutColors: Record<string, string> = {
    EN_CAPTACION: "#6B9BD2",
    ACTIVO: "#E8A545",
    RESERVADO: "#9CA3AF",
    VENDIDO: "#059669",
    ALQUILADO: "#8B5CF6",
    RETIRADO: "#DC2626",
  };

  const donutData = stats.inmueblesPorEstado.map((item) => ({
    label: t(`inmuebles.statuses.${item.estado}`),
    value: item._count,
    color: donutColors[item.estado] ?? "#9CA3AF",
  }));

  const barColors = ["#6B9BD2", "#E8A545", "#059669", "#8B5CF6", "#DC2626"];

  return (
    <div className="space-y-5">
      {/* Main KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {mainKpis.map((kpi) => (
          <Link
            key={kpi.labelKey}
            href={kpi.href}
            className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-5 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 cursor-pointer block"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center`}>
                <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
              <span className="text-xs font-medium text-secondary">{t(kpi.labelKey)}</span>
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight">{kpi.value}</p>
          </Link>
        ))}
      </div>

      {/* Monthly KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {monthKpis.map((kpi) => (
          <Link
            key={kpi.labelKey}
            href={kpi.href}
            className={`rounded-2xl border shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-5 transition-all duration-300 hover:shadow-[0_4px_24px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 cursor-pointer block ${
              kpi.highlight
                ? "bg-orange-50/80 border-orange-200/60 backdrop-blur-sm"
                : "bg-white/70 border-white/60 backdrop-blur-sm"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.iconBg} flex items-center justify-center`}>
                <kpi.icon className={`h-5 w-5 ${kpi.iconColor}`} />
              </div>
              <span className="text-xs font-medium text-secondary">{t(kpi.labelKey)}</span>
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight">{kpi.value}</p>
          </Link>
        ))}
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-5 gap-4">
        {/* Agent performance */}
        <div className="col-span-3 bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">{t("dashboard.agentPerformance")}</h3>

          <div className="grid grid-cols-[1fr_140px_70px_70px_70px_80px] gap-3 pb-3 border-b border-border">
            {[t("dashboard.name"), t("dashboard.zone"), "LEADS", t("comerciales.visits"), t("comerciales.closings"), ""].map((h) => (
              <span key={h} className="text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {stats.rendimientoComerciales.map((c) => {
            const isActive = c._count.operaciones > 0;
            return (
              <div key={c.id} className="grid grid-cols-[1fr_140px_70px_70px_70px_80px] gap-3 py-3.5 border-b border-border/50 items-center hover:bg-primary-50/30 transition-colors -mx-6 px-6">
                <div className="flex items-center gap-3">
                  <Avatar name={`${c.usuario.nombre} ${c.usuario.apellidos}`} size="md" />
                  <span className="text-sm font-medium text-foreground">
                    {c.usuario.nombre} {c.usuario.apellidos}
                  </span>
                </div>
                <span className="text-xs text-secondary">{c.zona}</span>
                <span className="text-sm font-bold text-foreground">{c._count.leads}</span>
                <span className="text-sm font-bold text-foreground">{c._count.visitas}</span>
                <span className="text-sm font-bold text-foreground">{c._count.operaciones}</span>
                <span className={`text-[11px] font-semibold px-3 py-1 rounded-full text-center ${
                  isActive ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                }`}>
                  {isActive ? t("common.active") : t("common.pending")}
                </span>
              </div>
            );
          })}

          {stats.rendimientoComerciales.length === 0 && (
            <p className="text-secondary text-xs py-8 text-center">{t("dashboard.noActiveAgents")}</p>
          )}
        </div>

        {/* Right column */}
        <div className="col-span-2 space-y-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("dashboard.leadSources")}</h3>
            <div className="space-y-3.5">
              {stats.leadsPorFuente.map((item, i) => {
                const pct = stats.totalLeads > 0 ? Math.round((item._count / stats.totalLeads) * 100) : 0;
                return (
                  <div key={item.fuente}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-foreground uppercase tracking-wide">
                        {t(`leads.sources.${item.fuente}`)}
                      </span>
                      <span className="text-xs font-bold text-foreground">{pct}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: barColors[i % barColors.length] }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.leadsPorFuente.length === 0 && (
                <p className="text-secondary text-xs text-center py-4">{t("common.noData")}</p>
              )}
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("dashboard.propertiesByStatus")}</h3>
            <DonutChart data={donutData} />
          </div>
        </div>
      </div>
    </div>
  );
}
