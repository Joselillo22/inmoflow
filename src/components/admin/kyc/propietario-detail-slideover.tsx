"use client";

import { useEffect, useState, useCallback } from "react";
import { SlideOver } from "@/components/ui/slide-over";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, Mail, ShieldCheck, ShieldAlert } from "lucide-react";
import { formatPhone } from "@/lib/utils/formatters";
import { DatosKYCTab } from "./tabs/datos-kyc-tab";
import { InmueblesPropietarioTab } from "./tabs/inmuebles-propietario-tab";
import { OperacionesPropietarioTab } from "./tabs/operaciones-propietario-tab";
import type { PropietarioDetail } from "@/lib/types/propietario";

interface PropietarioDetailSlideOverProps {
  propietarioId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function PropietarioDetailSlideOver({ propietarioId, onClose, onUpdated }: PropietarioDetailSlideOverProps) {
  const [prop, setProp] = useState<PropietarioDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("datos");

  const fetchProp = useCallback(async () => {
    if (!propietarioId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/propietarios/${propietarioId}`);
      if (res.ok) {
        const data = await res.json();
        setProp(data.data);
      }
    } finally {
      setLoading(false);
    }
  }, [propietarioId]);

  useEffect(() => {
    if (propietarioId) {
      setActiveTab("datos");
      fetchProp();
    } else {
      setProp(null);
    }
  }, [propietarioId, fetchProp]);

  function handleUpdated() {
    fetchProp();
    onUpdated?.();
  }

  const totalOps = prop?.inmuebles.reduce((sum, inm) => sum + inm.operaciones.length, 0) ?? 0;

  const tabs = prop ? [
    { id: "datos", label: "Datos / KYC" },
    { id: "inmuebles", label: "Inmuebles", count: prop._count.inmuebles },
    { id: "operaciones", label: "Operaciones", count: totalOps },
  ] : [];

  return (
    <SlideOver open={!!propietarioId} onClose={onClose} width="w-[640px]">
      {loading || !prop ? (
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="w-12 h-12 rounded-full" />
            <div className="space-y-2"><Skeleton className="w-48 h-5" /><Skeleton className="w-32 h-4" /></div>
          </div>
          <Skeleton className="w-full h-10" />
          <Skeleton className="w-full h-40 rounded-xl" />
          <Skeleton className="w-full h-40 rounded-xl" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  {prop.nombre} {prop.apellidos ?? ""}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  {prop.telefono && (
                    <a href={`tel:${prop.telefono}`} className="flex items-center gap-1 text-sm text-secondary hover:text-primary">
                      <Phone className="h-3.5 w-3.5" /> {formatPhone(prop.telefono)}
                    </a>
                  )}
                  {prop.email && (
                    <a href={`mailto:${prop.email}`} className="flex items-center gap-1 text-sm text-secondary hover:text-primary">
                      <Mail className="h-3.5 w-3.5" /> {prop.email}
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {prop.kycVerificado ? (
                  <Badge variant="success" size="md" className="gap-1.5">
                    <ShieldCheck className="h-4 w-4" /> Verificado
                  </Badge>
                ) : (
                  <Badge variant="danger" size="md" className="gap-1.5">
                    <ShieldAlert className="h-4 w-4" /> KYC Pendiente
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          {/* Content */}
          <div>
            {activeTab === "datos" && <DatosKYCTab propietario={prop} onUpdated={handleUpdated} />}
            {activeTab === "inmuebles" && <InmueblesPropietarioTab inmuebles={prop.inmuebles} />}
            {activeTab === "operaciones" && <OperacionesPropietarioTab inmuebles={prop.inmuebles} kycVerificado={prop.kycVerificado} />}
          </div>
        </>
      )}
    </SlideOver>
  );
}
