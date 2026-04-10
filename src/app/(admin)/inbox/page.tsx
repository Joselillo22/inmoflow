"use client";

import { useEffect, useState, useCallback } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Phone, MessageCircle, Mail, User, Megaphone, Globe, Monitor,
  Search, ChevronLeft, ChevronRight, Inbox as InboxIcon, Filter,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils/formatters";

interface InteraccionItem {
  id: string;
  canal: string;
  contenido: string | null;
  fecha: string;
  lead: { id: string; nombre: string; apellidos: string | null; telefono: string | null; email: string | null; faseFunnel: string };
  comercial: { usuario: { nombre: string; apellidos: string } };
}

const canalConfig: Record<string, { icon: typeof Phone; label: string; color: string }> = {
  TELEFONO: { icon: Phone, label: "Llamada", color: "bg-emerald-50 text-emerald-700" },
  WHATSAPP: { icon: MessageCircle, label: "WhatsApp", color: "bg-green-50 text-green-700" },
  EMAIL: { icon: Mail, label: "Email", color: "bg-blue-50 text-blue-700" },
  PRESENCIAL: { icon: User, label: "Presencial", color: "bg-violet-50 text-violet-700" },
  PORTAL: { icon: Globe, label: "Portal", color: "bg-amber-50 text-amber-700" },
  SISTEMA: { icon: Monitor, label: "Sistema", color: "bg-slate-100 text-slate-600" },
};

export default function InboxPage() {
  const [interacciones, setInteracciones] = useState<InteraccionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCanal, setFilterCanal] = useState("");
  const [page, setPage] = useState(1);
  const limit = 30;

  const fetchInteracciones = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("page", String(page));
    if (search) params.set("search", search);
    if (filterCanal) params.set("canal", filterCanal);

    const res = await fetch(`/api/inbox?${params}`);
    if (res.ok) {
      const data = await res.json();
      setInteracciones(data.data ?? []);
    }
    setLoading(false);
  }, [page, search, filterCanal]);

  useEffect(() => { fetchInteracciones(); }, [fetchInteracciones]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Inbox</h1>
        <Badge variant="info" size="md">Todas las interacciones</Badge>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary/50" />
          <input
            type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar por lead, contenido..."
            className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-base text-foreground placeholder:text-secondary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => { setFilterCanal(""); setPage(1); }}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all ${!filterCanal ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-secondary"}`}
          >
            Todos
          </button>
          {Object.entries(canalConfig).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { setFilterCanal(key === filterCanal ? "" : key); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                filterCanal === key ? "bg-primary text-white shadow-sm" : "bg-card border border-border text-secondary"
              }`}
            >
              <cfg.icon className="h-4 w-4" /> {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-4"><Skeleton className="w-10 h-10 rounded-full shrink-0" /><div className="flex-1 space-y-2"><Skeleton className="w-48 h-4" /><Skeleton className="w-full h-3" /></div></div>
            ))}
          </div>
        ) : interacciones.length === 0 ? (
          <EmptyState icon={<InboxIcon className="h-8 w-8" />} title="Sin interacciones" description={search || filterCanal ? "No hay resultados con estos filtros" : "Aun no hay interacciones registradas"} />
        ) : (
          <div className="divide-y divide-border/30">
            {interacciones.map((inter) => {
              const cfg = canalConfig[inter.canal] ?? canalConfig.SISTEMA;
              const Icon = cfg.icon;
              return (
                <div key={inter.id} className="flex items-start gap-4 px-5 py-4 hover:bg-primary/[0.02] transition-colors">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base font-semibold text-foreground">
                        {inter.lead.nombre} {inter.lead.apellidos ?? ""}
                      </span>
                      <Badge variant="default" size="sm">{cfg.label}</Badge>
                      <span className="text-sm text-secondary ml-auto shrink-0">{formatDateTime(inter.fecha)}</span>
                    </div>
                    {inter.contenido && (
                      <p className="text-sm text-secondary line-clamp-2">{inter.contenido}</p>
                    )}
                    <p className="text-xs text-secondary/50 mt-0.5">
                      Comercial: {inter.comercial.usuario.nombre} {inter.comercial.usuario.apellidos}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {interacciones.length > 0 && (
          <div className="flex items-center justify-center gap-2 py-4 border-t border-border/50">
            <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-10 w-10 p-0">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-base font-semibold text-foreground px-3">Pagina {page}</span>
            <Button size="sm" variant="ghost" disabled={interacciones.length < limit} onClick={() => setPage(p => p + 1)} className="h-10 w-10 p-0">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
