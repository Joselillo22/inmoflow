"use client";

import { useEffect, useState, useCallback } from "react";
import { SlideOver } from "@/components/ui/slide-over";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Phone, MessageCircle, Mail, MapPin } from "lucide-react";
import { PhaseSelector } from "./phase-selector";
import { ScoreBar } from "./score-bar";
import { ActivityTimeline } from "./activity-timeline";
import { DemandForm } from "./demand-form";
import { MatchingCard } from "./matching-card";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { FUENTE_LEAD_LABELS, RESULTADO_VISITA_LABELS } from "@/lib/utils/constants";
import type { LeadDetail, MatchingWithInmueble } from "@/lib/types/lead";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadPortalButton } from "@/components/admin/lead-portal-button";

interface LeadDetailSlideOverProps {
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated?: () => void;
}

export function LeadDetailSlideOver({ leadId, onClose, onLeadUpdated }: LeadDetailSlideOverProps) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [matchings, setMatchings] = useState<MatchingWithInmueble[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("actividad");
  const { toast } = useToast();

  const fetchLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    const res = await fetch(`/api/leads/${leadId}`);
    if (res.ok) {
      const data = await res.json();
      setLead(data.data);
    }
    setLoading(false);
  }, [leadId]);

  const fetchMatchings = useCallback(async () => {
    if (!leadId) return;
    const res = await fetch(`/api/leads/${leadId}/matching`);
    if (res.ok) {
      const data = await res.json();
      setMatchings(data.data ?? []);
    }
  }, [leadId]);

  useEffect(() => {
    if (leadId) {
      setActiveTab("actividad");
      fetchLead();
      fetchMatchings();
    }
  }, [leadId, fetchLead, fetchMatchings]);

  async function handlePhaseChange(fase: string) {
    if (!leadId) return;
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faseFunnel: fase }),
    });
    if (res.ok) {
      fetchLead();
      onLeadUpdated?.();
      toast("Fase actualizada", "success");
    }
  }

  async function handleSaveInfo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!leadId) return;
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    for (const [key, value] of fd.entries()) {
      if (value) body[key] = value;
    }
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      fetchLead();
      onLeadUpdated?.();
      toast("Datos actualizados", "success");
    }
  }

  async function handleMatchingAction(matchingId: string, action: "visto" | "descartado") {
    await fetch(`/api/leads/${leadId}/matching`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchingId, [action]: true }),
    });
    fetchMatchings();
  }

  const tabs = [
    { id: "actividad", label: "Actividad", count: lead?._count.interacciones },
    { id: "demanda", label: "Demanda", count: lead?._count.demandas },
    { id: "visitas", label: "Visitas", count: lead?._count.visitas },
    { id: "matchings", label: "Matchings", count: matchings.length },
    { id: "info", label: "Info" },
  ];

  return (
    <SlideOver open={!!leadId} onClose={onClose} width="w-[560px]">
      {loading || !lead ? (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="px-5 pt-5 pb-3 border-b border-border">
            <div className="flex items-start gap-3 mb-3">
              <Avatar name={`${lead.nombre} ${lead.apellidos ?? ""}`} size="lg" />
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-semibold text-foreground truncate">
                  {lead.nombre} {lead.apellidos ?? ""}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <PhaseSelector value={lead.faseFunnel} onChange={handlePhaseChange} />
                  <ScoreBar score={lead.score} />
                </div>
                <p className="text-xs text-secondary mt-1">
                  <Badge variant="outline" size="sm">{FUENTE_LEAD_LABELS[lead.fuente]}</Badge>
                  <span className="ml-2">{formatDate(lead.createdAt)}</span>
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mb-3">
              {lead.telefono && (
                <>
                  <a href={`tel:${lead.telefono}`} className="flex-1">
                    <Button size="sm" className="w-full gap-1.5">
                      <Phone className="h-3.5 w-3.5" /> Llamar
                    </Button>
                  </a>
                  <a href={`https://wa.me/34${lead.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button size="sm" variant="success" className="w-full gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </Button>
                  </a>
                </>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex-1">
                  <Button size="sm" variant="secondary" className="w-full gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </Button>
                </a>
              )}
            </div>

            <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "actividad" && (
              <ActivityTimeline
                interactions={lead.interacciones}
                visits={lead.visitas}
                leadId={lead.id}
                onNewInteraction={fetchLead}
              />
            )}

            {activeTab === "demanda" && (
              <div className="overflow-y-auto h-full">
                <DemandForm
                  leadId={lead.id}
                  demand={lead.demandas[0] ?? null}
                  onSaved={() => { fetchLead(); fetchMatchings(); }}
                />
              </div>
            )}

            {activeTab === "visitas" && (
              <div className="overflow-y-auto h-full p-4 space-y-3">
                {lead.visitas.map((v) => (
                  <div key={v.id} className="rounded-xl border border-border/50 bg-white/60 p-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-secondary" />
                      <span className="text-xs font-semibold text-foreground">{formatDate(v.fecha)}</span>
                      <Badge size="sm" variant={v.resultado.includes("INTERESADO") ? "success" : v.resultado === "CANCELADA" || v.resultado === "NO_SHOW" ? "danger" : "default"}>
                        {RESULTADO_VISITA_LABELS[v.resultado] ?? v.resultado}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground">{v.inmueble.titulo}</p>
                    <p className="text-xs text-secondary">{v.inmueble.direccion} · {formatCurrency(Number(v.inmueble.precio))}</p>
                    {v.notasDespues && <p className="text-xs text-secondary mt-1 italic">{v.notasDespues}</p>}
                  </div>
                ))}
                {lead.visitas.length === 0 && (
                  <p className="text-xs text-secondary text-center py-8">Sin visitas registradas</p>
                )}
              </div>
            )}

            {activeTab === "matchings" && (
              <div className="overflow-y-auto h-full p-4 space-y-3">
                {matchings.map((m) => (
                  <MatchingCard
                    key={m.id}
                    matching={m}
                    onMarkVisto={() => handleMatchingAction(m.id, "visto")}
                    onDescartar={() => handleMatchingAction(m.id, "descartado")}
                  />
                ))}
                {matchings.length === 0 && (
                  <p className="text-xs text-secondary text-center py-8">
                    {lead.demandas.length > 0
                      ? "No se encontraron matchings. Prueba a buscar de nuevo."
                      : "Crea una demanda primero para buscar matchings."}
                  </p>
                )}
              </div>
            )}

            {activeTab === "info" && (
              <div className="overflow-y-auto h-full p-4">
                <form onSubmit={handleSaveInfo} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input id="nombre" name="nombre" label="Nombre" defaultValue={lead.nombre} compact />
                    <Input id="apellidos" name="apellidos" label="Apellidos" defaultValue={lead.apellidos ?? ""} compact />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input id="telefono" name="telefono" label="Telefono" defaultValue={lead.telefono ?? ""} compact />
                    <Input id="email" name="email" label="Email" defaultValue={lead.email ?? ""} compact />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input id="nacionalidad" name="nacionalidad" label="Nacionalidad" defaultValue={lead.nacionalidad ?? ""} compact />
                    <Input id="idioma" name="idioma" label="Idioma" defaultValue={lead.idioma} compact />
                  </div>
                  <Textarea id="notas" name="notas" label="Notas" defaultValue={lead.notas ?? ""} />

                  {lead.comercial && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted">
                      <Avatar name={`${lead.comercial.usuario.nombre} ${lead.comercial.usuario.apellidos}`} size="sm" />
                      <span className="text-xs font-medium text-foreground">
                        {lead.comercial.usuario.nombre} {lead.comercial.usuario.apellidos}
                      </span>
                      <Badge size="sm" variant="info">Comercial</Badge>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <LeadPortalButton
                      leadId={lead.id}
                      leadNombre={`${lead.nombre}${lead.apellidos ? " " + lead.apellidos : ""}`}
                    />
                    <Button type="submit" size="sm">Guardar cambios</Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </SlideOver>
  );
}
