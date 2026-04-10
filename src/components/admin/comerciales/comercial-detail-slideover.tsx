"use client";

import { useEffect, useState, useCallback } from "react";
import { SlideOver } from "@/components/ui/slide-over";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail } from "lucide-react";
import { formatPhone } from "@/lib/utils/formatters";
import { ResumenTab } from "./tabs/resumen-tab";
import { LeadsTab } from "./tabs/leads-tab";
import { InmueblesTab } from "./tabs/inmuebles-tab";
import { VisitasTab } from "./tabs/visitas-tab";
import { TareasTab } from "./tabs/tareas-tab";
import { ComisionesTab } from "./tabs/comisiones-tab";
import { AgendaComercialTab } from "./tabs/agenda-comercial-tab";
import { RendimientoTab } from "./tabs/rendimiento-tab";
import type { ComercialDetail } from "@/lib/types/comercial";

interface ComercialDetailSlideOverProps {
  comercialId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function ComercialDetailSlideOver({ comercialId, onClose, onUpdated }: ComercialDetailSlideOverProps) {
  const [comercial, setComercial] = useState<ComercialDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("resumen");

  const fetchComercial = useCallback(async () => {
    if (!comercialId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comerciales/${comercialId}`);
      if (res.ok) {
        const data = await res.json();
        setComercial(data.data);
      }
    } finally {
      setLoading(false);
    }
  }, [comercialId]);

  useEffect(() => {
    if (comercialId) {
      setActiveTab("resumen");
      fetchComercial();
    } else {
      setComercial(null);
    }
  }, [comercialId, fetchComercial]);

  function handleUpdated() {
    fetchComercial();
    onUpdated?.();
  }

  const tabs = comercial
    ? [
        { id: "resumen", label: "Resumen" },
        { id: "leads", label: "Leads", count: comercial._count.leads },
        { id: "inmuebles", label: "Inmuebles", count: comercial._count.inmuebles },
        { id: "visitas", label: "Visitas", count: comercial._count.visitas },
        { id: "agenda", label: "Agenda" },
        { id: "tareas", label: "Tareas", count: comercial._count.tareas },
        { id: "comisiones", label: "Comisiones", count: comercial._count.comisiones },
        { id: "rendimiento", label: "Rendimiento" },
      ]
    : [];

  return (
    <SlideOver open={!!comercialId} onClose={onClose} width="w-[680px]">
      {loading || !comercial ? (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="w-48 h-5" />
              <Skeleton className="w-32 h-4" />
            </div>
          </div>
          <Skeleton className="w-full h-10" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar
                  name={`${comercial.usuario.nombre} ${comercial.usuario.apellidos}`}
                  size="lg"
                />
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    {comercial.usuario.nombre} {comercial.usuario.apellidos}
                  </h2>
                  <p className="text-sm text-secondary">{comercial.usuario.email}</p>
                </div>
              </div>
              <Badge variant={comercial.activo ? "success" : "danger"} size="md">
                {comercial.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-4">
              <a
                href={`tel:${comercial.telefono}`}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-emerald-50 text-emerald-700 font-medium text-sm hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <Phone className="h-4 w-4" /> {formatPhone(comercial.telefono)}
              </a>
              <a
                href={`mailto:${comercial.usuario.email}`}
                className="flex items-center gap-2 h-10 px-4 rounded-lg bg-blue-50 text-blue-700 font-medium text-sm hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Mail className="h-4 w-4" /> Email
              </a>
            </div>
          </div>

          {/* Tabs */}
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Tab content */}
          <div>
            {activeTab === "resumen" && <ResumenTab comercial={comercial} onUpdated={handleUpdated} />}
            {activeTab === "leads" && <LeadsTab leads={comercial.leads} />}
            {activeTab === "inmuebles" && <InmueblesTab inmuebles={comercial.inmuebles} />}
            {activeTab === "visitas" && <VisitasTab visitas={comercial.visitas} />}
            {activeTab === "agenda" && <AgendaComercialTab visitas={comercial.visitas} tareas={comercial.tareas} comercialId={comercial.id} onUpdated={handleUpdated} />}
            {activeTab === "tareas" && <TareasTab tareas={comercial.tareas} />}
            {activeTab === "comisiones" && <ComisionesTab comisiones={comercial.comisiones} />}
            {activeTab === "rendimiento" && <RendimientoTab comercialId={comercial.id} />}
          </div>
        </>
      )}
    </SlideOver>
  );
}
