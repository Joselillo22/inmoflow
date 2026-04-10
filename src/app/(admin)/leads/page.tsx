"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PhaseSelector } from "@/components/admin/leads/phase-selector";
import { ScoreBar } from "@/components/admin/leads/score-bar";
import { LeadDetailSlideOver } from "@/components/admin/leads/lead-detail-slideover";
import { useToast } from "@/components/ui/toast";
import {
  Search, Plus, Users, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { formatDate, formatPhone } from "@/lib/utils/formatters";
import { FASE_FUNNEL_LABELS, FUENTE_LEAD_LABELS } from "@/lib/utils/constants";
import { useTranslation } from "react-i18next";
import type { LeadListItem } from "@/lib/types/lead";

const faseColors: Record<string, string> = {
  NUEVO: "bg-blue-500", CONTACTADO: "bg-slate-400", CUALIFICADO: "bg-emerald-500",
  VISITA_PROGRAMADA: "bg-amber-500", VISITA_REALIZADA: "bg-orange-500",
  OFERTA: "bg-violet-500", RESERVA: "bg-cyan-500", CIERRE: "bg-emerald-600", PERDIDO: "bg-red-500",
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [faseFunnel, setFaseFunnel] = useState<string>("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { t } = useTranslation();

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", limit.toString());
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    if (search) params.set("search", search);
    if (faseFunnel) params.set("faseFunnel", faseFunnel);

    const res = await fetch(`/api/leads?${params}`);
    if (res.ok) {
      const data = await res.json();
      setLeads(data.data ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [page, limit, search, faseFunnel, sortBy, sortOrder]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchLeads(); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function toggleSort(col: string) {
    if (sortBy === col) setSortOrder((o) => o === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortOrder("desc"); }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === leads.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(leads.map((l) => l.id)));
  }

  async function handlePhaseChange(leadId: string, fase: string) {
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faseFunnel: fase }),
    });
    fetchLeads();
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const totalPages = Math.ceil(total / limit);

  const SortIcon = ({ col }: { col: string }) => (
    <span className={`ml-1 text-[8px] ${sortBy === col ? "text-primary" : "text-transparent"}`}>
      {sortOrder === "asc" ? "▲" : "▼"}
    </span>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">{t("leads.title")}</h1>
          <Badge variant="info" size="md">{total}</Badge>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> {t("leads.new")}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.searchPlaceholder")}
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-xs text-foreground placeholder:text-secondary/40 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/15 transition-all"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => { setFaseFunnel(""); setPage(1); }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap cursor-pointer transition-all ${
              !faseFunnel ? "bg-primary text-white" : "bg-card border border-border text-secondary hover:border-primary/30"
            }`}
          >
            {t("common.all")}
          </button>
          {Object.entries(FASE_FUNNEL_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setFaseFunnel(key === faseFunnel ? "" : key); setPage(1); }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap cursor-pointer transition-all ${
                faseFunnel === key ? "bg-primary text-white" : "bg-card border border-border text-secondary hover:border-primary/30"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${faseFunnel === key ? "bg-white" : faseColors[key]}`} />
              {t(`leads.phases.${key}`)}
            </button>
          ))}
        </div>

        {(search || faseFunnel) && (
          <button
            onClick={() => { setSearch(""); setFaseFunnel(""); setPage(1); }}
            className="flex items-center gap-1 text-xs text-secondary hover:text-foreground cursor-pointer"
          >
            <X className="h-3 w-3" /> {t("common.clearFilters")}
          </button>
        )}
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
          <span className="text-xs font-semibold text-primary">{selectedIds.size} {t("common.selected")}</span>
          <button onClick={() => setSelectedIds(new Set())} className="text-xs text-secondary hover:text-foreground cursor-pointer">{t("common.cancel")}</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="w-10 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === leads.length && leads.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded cursor-pointer"
                  />
                </th>
                <th onClick={() => toggleSort("nombre")} className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider cursor-pointer hover:text-foreground">
                  {t("leads.name")} <SortIcon col="nombre" />
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">{t("leads.phone")}</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">{t("leads.phase")}</th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">{t("leads.source")}</th>
                <th onClick={() => toggleSort("score")} className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider cursor-pointer hover:text-foreground">
                  {t("leads.score")} <SortIcon col="score" />
                </th>
                <th className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider">{t("leads.commercial")}</th>
                <th onClick={() => toggleSort("createdAt")} className="text-left px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider cursor-pointer hover:text-foreground">
                  {t("leads.createdAt")} <SortIcon col="createdAt" />
                </th>
                <th className="text-center px-3 py-2.5 text-[10px] font-semibold text-secondary/60 uppercase tracking-wider w-16">Vis</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="px-3 py-3"><Skeleton className="w-4 h-4 rounded" /></td>
                    <td className="px-3 py-3"><div className="flex items-center gap-2"><Skeleton className="w-7 h-7 rounded-full" /><Skeleton className="w-28 h-3.5" /></div></td>
                    <td className="px-3 py-3"><Skeleton className="w-20 h-3" /></td>
                    <td className="px-3 py-3"><Skeleton className="w-16 h-5 rounded-md" /></td>
                    <td className="px-3 py-3"><Skeleton className="w-16 h-4 rounded" /></td>
                    <td className="px-3 py-3"><Skeleton className="w-14 h-2" /></td>
                    <td className="px-3 py-3"><Skeleton className="w-24 h-3" /></td>
                    <td className="px-3 py-3"><Skeleton className="w-16 h-3" /></td>
                    <td className="px-3 py-3"><Skeleton className="w-6 h-3 mx-auto" /></td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon={<Users className="h-6 w-6" />}
                      title={t("common.noResults")}
                      description={search || faseFunnel ? t("common.noResults") : t("leads.new")}
                    />
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`border-b border-border/30 cursor-pointer transition-colors ${
                      selectedLeadId === lead.id ? "bg-primary/[0.04]" : "hover:bg-primary/[0.02]"
                    }`}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        className="rounded cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={`${lead.nombre} ${lead.apellidos ?? ""}`} size="sm" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{lead.nombre} {lead.apellidos ?? ""}</p>
                          {lead.email && <p className="text-[10px] text-secondary truncate">{lead.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-secondary">
                      {lead.telefono ? formatPhone(lead.telefono) : "—"}
                    </td>
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <PhaseSelector value={lead.faseFunnel} onChange={(f) => handlePhaseChange(lead.id, f)} />
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] text-secondary">{t(`leads.sources.${lead.fuente}`)}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <ScoreBar score={lead.score} />
                    </td>
                    <td className="px-3 py-2.5">
                      {lead.comercial ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar name={`${lead.comercial.usuario.nombre} ${lead.comercial.usuario.apellidos}`} size="sm" />
                          <span className="text-[11px] text-secondary truncate max-w-[100px]">{lead.comercial.usuario.nombre}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-secondary/50">{t("leads.unassigned")}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-[11px] text-secondary">{formatDate(lead.createdAt)}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-foreground">{lead._count.visitas}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-[11px] text-secondary">
              {t("common.showing")} {from}-{to} {t("common.of")} {total}
            </span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-7 w-7">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium text-foreground px-2">{page} / {totalPages}</span>
              <Button size="icon" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="h-7 w-7">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* SlideOver */}
      <LeadDetailSlideOver
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onLeadUpdated={fetchLeads}
      />
    </div>
  );
}
