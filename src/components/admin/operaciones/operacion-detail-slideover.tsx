"use client";

import { useEffect, useState, useCallback } from "react";
import { SlideOver } from "@/components/ui/slide-over";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, User, UserCircle, Euro, Calendar, FileText, Phone, Mail,
  ArrowRight, Check, X, MapPin,
} from "lucide-react";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils/formatters";
import { ESTADO_OPERACION_LABELS, FASE_FUNNEL_LABELS } from "@/lib/utils/constants";
import type { OperacionDetail } from "@/lib/types/operacion";

const estadoVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  EN_NEGOCIACION: "info",
  OFERTA_ACEPTADA: "warning",
  ARRAS_FIRMADAS: "warning",
  PENDIENTE_NOTARIA: "warning",
  CERRADA: "success",
  CAIDA: "danger",
};

const estadoFlow = [
  "EN_NEGOCIACION", "OFERTA_ACEPTADA", "ARRAS_FIRMADAS",
  "PENDIENTE_NOTARIA", "CERRADA",
];

const estadoPagoVariant: Record<string, "success" | "warning" | "info"> = {
  PAGADO: "success",
  PENDIENTE: "warning",
  PARCIAL: "info",
};

interface OperacionDetailSlideOverProps {
  operacionId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function OperacionDetailSlideOver({ operacionId, onClose, onUpdated }: OperacionDetailSlideOverProps) {
  const [op, setOp] = useState<OperacionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("detalle");
  const [saving, setSaving] = useState(false);
  const [editNotas, setEditNotas] = useState(false);
  const [notas, setNotas] = useState("");

  const fetchOp = useCallback(async () => {
    if (!operacionId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/operaciones/${operacionId}`);
      if (res.ok) {
        const data = await res.json();
        setOp(data.data);
        setNotas(data.data.notas ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [operacionId]);

  useEffect(() => {
    if (operacionId) {
      setActiveTab("detalle");
      fetchOp();
    } else {
      setOp(null);
    }
  }, [operacionId, fetchOp]);

  async function advanceEstado(nuevoEstado: string) {
    if (!op) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { estado: nuevoEstado };
      if (nuevoEstado === "OFERTA_ACEPTADA") body.fechaOferta = new Date().toISOString();
      if (nuevoEstado === "ARRAS_FIRMADAS") body.fechaArras = new Date().toISOString();
      if (nuevoEstado === "CERRADA") body.fechaCierre = new Date().toISOString();

      const res = await fetch(`/api/operaciones/${op.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { fetchOp(); onUpdated?.(); }
    } finally {
      setSaving(false);
    }
  }

  async function saveNotas() {
    if (!op) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/operaciones/${op.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas }),
      });
      if (res.ok) { setEditNotas(false); fetchOp(); onUpdated?.(); }
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { id: "detalle", label: "Detalle" },
    { id: "timeline", label: "Timeline" },
    { id: "comision", label: "Comision" },
  ];

  return (
    <SlideOver open={!!operacionId} onClose={onClose} width="w-[620px]">
      {loading || !op ? (
        <div className="p-5 space-y-4">
          <Skeleton className="w-full h-8" />
          <Skeleton className="w-3/4 h-5" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="px-5 pt-5 pb-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <Badge variant={estadoVariant[op.estado] ?? "default"} size="md">
                {ESTADO_OPERACION_LABELS[op.estado] ?? op.estado}
              </Badge>
              <span className="text-sm font-medium text-secondary">{op.tipo}</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">{op.inmueble.titulo}</h2>
            <p className="text-sm text-secondary">{op.inmueble.referencia} - {op.inmueble.localidad}</p>
            <p className="text-3xl font-bold text-foreground mt-2">{formatCurrency(Number(op.precioFinal))}</p>

            {/* Advance estado */}
            {op.estado !== "CERRADA" && op.estado !== "CAIDA" && (
              <div className="flex gap-2 mt-4">
                {(() => {
                  const currentIdx = estadoFlow.indexOf(op.estado);
                  const nextEstado = currentIdx >= 0 && currentIdx < estadoFlow.length - 1 ? estadoFlow[currentIdx + 1] : null;
                  return (
                    <>
                      {nextEstado && (
                        <Button size="md" onClick={() => advanceEstado(nextEstado)} loading={saving} className="gap-2">
                          <ArrowRight className="h-4 w-4" />
                          Avanzar a {ESTADO_OPERACION_LABELS[nextEstado]}
                        </Button>
                      )}
                      <Button size="md" variant="danger" onClick={() => advanceEstado("CAIDA")} loading={saving} className="gap-2">
                        <X className="h-4 w-4" /> Marcar como caida
                      </Button>
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

          <div className="p-5">
            {activeTab === "detalle" && (
              <div className="space-y-6">
                {/* Partes involucradas */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Comprador */}
                  <div className="bg-muted/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-5 w-5 text-blue-600" />
                      <h4 className="text-sm font-bold text-secondary uppercase">Comprador</h4>
                    </div>
                    <p className="text-base font-semibold text-foreground">{op.lead.nombre} {op.lead.apellidos ?? ""}</p>
                    {op.lead.telefono && (
                      <a href={`tel:${op.lead.telefono}`} className="flex items-center gap-1.5 text-sm text-secondary mt-1 hover:text-primary">
                        <Phone className="h-3.5 w-3.5" /> {formatPhone(op.lead.telefono)}
                      </a>
                    )}
                    {op.lead.email && (
                      <a href={`mailto:${op.lead.email}`} className="flex items-center gap-1.5 text-sm text-secondary mt-0.5 hover:text-primary">
                        <Mail className="h-3.5 w-3.5" /> {op.lead.email}
                      </a>
                    )}
                  </div>

                  {/* Comercial */}
                  <div className="bg-muted/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <UserCircle className="h-5 w-5 text-violet-600" />
                      <h4 className="text-sm font-bold text-secondary uppercase">Comercial</h4>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={`${op.comercial.usuario.nombre} ${op.comercial.usuario.apellidos}`} size="sm" />
                      <p className="text-base font-semibold text-foreground">
                        {op.comercial.usuario.nombre} {op.comercial.usuario.apellidos}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Inmueble */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                    <h4 className="text-sm font-bold text-secondary uppercase">Inmueble</h4>
                  </div>
                  <p className="text-base font-semibold text-foreground">{op.inmueble.titulo}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin className="h-4 w-4 text-secondary" />
                    <p className="text-sm text-secondary">{op.inmueble.direccion}, {op.inmueble.localidad}</p>
                  </div>
                  <p className="text-sm text-secondary mt-1">Precio publicado: {formatCurrency(Number(op.inmueble.precio))}</p>
                </div>

                {/* Notas */}
                <div className="bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-amber-600" />
                      <h4 className="text-sm font-bold text-secondary uppercase">Notas</h4>
                    </div>
                    {!editNotas ? (
                      <Button size="sm" variant="ghost" onClick={() => setEditNotas(true)}>Editar</Button>
                    ) : (
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => { setEditNotas(false); setNotas(op.notas ?? ""); }}><X className="h-4 w-4" /></Button>
                        <Button size="sm" onClick={saveNotas} loading={saving}><Check className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </div>
                  {editNotas ? (
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/15 resize-none"
                    />
                  ) : (
                    <p className="text-base text-foreground whitespace-pre-wrap">{op.notas || "Sin notas"}</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "timeline" && (
              <div className="space-y-1">
                {[
                  { label: "Creada", date: op.createdAt, done: true },
                  { label: "Oferta", date: op.fechaOferta, done: !!op.fechaOferta },
                  { label: "Arras firmadas", date: op.fechaArras, done: !!op.fechaArras },
                  { label: "Pendiente notaria", date: op.estado === "PENDIENTE_NOTARIA" || op.estado === "CERRADA" ? (op.fechaArras ?? op.createdAt) : null, done: op.estado === "PENDIENTE_NOTARIA" || op.estado === "CERRADA" },
                  { label: "Cerrada", date: op.fechaCierre, done: op.estado === "CERRADA" },
                ].map((step, i, arr) => (
                  <div key={step.label} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-4 h-4 rounded-full shrink-0 mt-0.5 ${step.done ? "bg-primary" : "bg-border"}`}>
                        {step.done && <Check className="h-4 w-4 text-white" />}
                      </div>
                      {i < arr.length - 1 && <div className={`w-0.5 flex-1 ${step.done ? "bg-primary/30" : "bg-border"}`} />}
                    </div>
                    <div className="pb-6">
                      <p className={`text-base font-semibold ${step.done ? "text-foreground" : "text-secondary/50"}`}>{step.label}</p>
                      {step.date && step.done && (
                        <p className="text-sm text-secondary">{formatDate(step.date)}</p>
                      )}
                    </div>
                  </div>
                ))}

                {op.estado === "CAIDA" && (
                  <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-base font-bold text-red-700">Operacion caida</p>
                    <p className="text-sm text-red-600">Esta operacion se marco como caida y no se completo.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "comision" && (
              <div className="space-y-4">
                {op.comision ? (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-muted/50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(Number(op.comision.total))}</p>
                        <p className="text-sm text-secondary mt-1">Comision total</p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-secondary">{formatCurrency(Number(op.comision.importeEmpresa))}</p>
                        <p className="text-sm text-secondary mt-1">Empresa (70%)</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-emerald-600">{formatCurrency(Number(op.comision.importeComercial))}</p>
                        <p className="text-sm text-secondary mt-1">Comercial (30%)</p>
                      </div>
                    </div>
                    <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-between">
                      <span className="text-base font-medium text-foreground">Estado del pago</span>
                      <Badge variant={estadoPagoVariant[op.comision.estadoPago] ?? "warning"} size="md">
                        {op.comision.estadoPago === "PAGADO" ? "Pagado" : op.comision.estadoPago === "PARCIAL" ? "Parcial" : "Pendiente"}
                      </Badge>
                    </div>
                    {op.comision.fechaPago && (
                      <p className="text-sm text-secondary">Fecha de pago: {formatDate(op.comision.fechaPago)}</p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Euro className="h-10 w-10 text-secondary/30 mx-auto mb-3" />
                    <p className="text-base font-medium text-secondary">Sin comision calculada</p>
                    <p className="text-sm text-secondary/70 mt-1">La comision se calcula al crear la operacion con % de comision del propietario</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </SlideOver>
  );
}
