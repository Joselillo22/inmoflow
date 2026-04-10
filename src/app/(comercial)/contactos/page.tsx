"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, MessageCircle, Search, Users } from "lucide-react";
import { formatPhone } from "@/lib/utils/formatters";
import { FASE_FUNNEL_LABELS } from "@/lib/utils/constants";

interface Lead {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  faseFunnel: string;
  score: number;
}

const faseColor: Record<string, string> = {
  NUEVO: "bg-blue-100 text-blue-700",
  CONTACTADO: "bg-slate-100 text-slate-600",
  CUALIFICADO: "bg-emerald-100 text-emerald-700",
  VISITA_PROGRAMADA: "bg-amber-100 text-amber-700",
  VISITA_REALIZADA: "bg-orange-100 text-orange-700",
  OFERTA: "bg-violet-100 text-violet-700",
  RESERVA: "bg-cyan-100 text-cyan-700",
  CIERRE: "bg-emerald-100 text-emerald-800",
  PERDIDO: "bg-red-100 text-red-700",
};

function getInitials(nombre: string, apellidos: string | null) {
  return `${nombre[0] ?? ""}${apellidos?.[0] ?? ""}`.toUpperCase();
}

export default function ContactosPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filtered, setFiltered] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    fetch("/api/leads?limit=100")
      .then((r) => r.json())
      .then((res) => {
        setLeads(res.data ?? []);
        setFiltered(res.data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      leads.filter((l) =>
        `${l.nombre} ${l.apellidos ?? ""}`.toLowerCase().includes(q) ||
        (l.telefono ?? "").includes(q)
      )
    );
  }, [search, leads]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 rounded-xl" />
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-secondary" />
          {t("comercial.myContacts")}
        </h2>
        <Badge variant="info" size="sm">{filtered.length}</Badge>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary/50" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar contacto..."
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-white/80 backdrop-blur-sm text-sm placeholder:text-secondary/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>

      {/* Lista */}
      {filtered.map((lead) => (
        <div key={lead.id} className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm overflow-hidden">
          <Link href={`/contactos/${lead.id}`} className="block px-4 pt-4 pb-3">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">
                  {getInitials(lead.nombre, lead.apellidos)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-foreground truncate">
                    {lead.nombre} {lead.apellidos ?? ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${faseColor[lead.faseFunnel] ?? "bg-slate-100 text-slate-600"}`}>
                    {FASE_FUNNEL_LABELS[lead.faseFunnel] ?? lead.faseFunnel}
                  </span>
                  {lead.score > 0 && (
                    <span className="text-[10px] text-secondary">{lead.score}pts</span>
                  )}
                </div>
                <p className="text-xs text-secondary mt-0.5 truncate">
                  {lead.telefono ? formatPhone(lead.telefono) : t("leads.noPhone")}
                  {lead.email ? ` · ${lead.email}` : ""}
                </p>
              </div>
            </div>
          </Link>
          {lead.telefono && (
            <div className="flex border-t border-border/40">
              <a href={`tel:${lead.telefono}`} className="flex-1">
                <button className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-secondary hover:text-foreground hover:bg-muted transition-colors">
                  <Phone className="h-3.5 w-3.5" />
                  {t("comercial.call")}
                </button>
              </a>
              <div className="w-px bg-border/40" />
              <a
                href={`https://wa.me/34${lead.telefono.replace(/\D/g, "")}`}
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

      {filtered.length === 0 && (
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm py-10 text-center">
          <Users className="h-8 w-8 text-secondary/30 mx-auto mb-2" />
          <p className="text-sm text-secondary">
            {search ? "Sin resultados para esa búsqueda" : t("comercial.noContacts")}
          </p>
        </div>
      )}
    </div>
  );
}
