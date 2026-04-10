"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { X, Search, Building2, User, Euro, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

interface NuevaOperacionModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  // Pre-fill si viene desde un inmueble o lead
  prefilledInmuebleId?: string;
  prefilledLeadId?: string;
}

interface InmuebleOption {
  id: string;
  referencia: string;
  titulo: string;
  precio: number;
  localidad: string;
  comercialId: string | null;
  comercial: { id: string; usuario: { nombre: string; apellidos: string } } | null;
}

interface LeadOption {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  faseFunnel: string;
  comercialId: string | null;
}

export function NuevaOperacionModal({
  open, onClose, onCreated, prefilledInmuebleId, prefilledLeadId,
}: NuevaOperacionModalProps) {
  const [inmuebles, setInmuebles] = useState<InmuebleOption[]>([]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedInmueble, setSelectedInmueble] = useState<InmuebleOption | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadOption | null>(null);
  const [searchInm, setSearchInm] = useState("");
  const [searchLead, setSearchLead] = useState("");
  const [tipo, setTipo] = useState<"VENTA" | "ALQUILER">("VENTA");
  const [precioFinal, setPrecioFinal] = useState("");
  const [comisionPct, setComisionPct] = useState("4");
  const [notas, setNotas] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setLoadingData(true);
    Promise.all([
      fetch("/api/inmuebles?limit=200").then((r) => r.json()),
      fetch("/api/leads?limit=200").then((r) => r.json()),
    ]).then(([inmData, leadData]) => {
      setInmuebles(inmData.data ?? []);
      setLeads(leadData.data ?? []);

      if (prefilledInmuebleId) {
        const inm = (inmData.data ?? []).find((i: InmuebleOption) => i.id === prefilledInmuebleId);
        if (inm) {
          setSelectedInmueble(inm);
          setPrecioFinal(String(Number(inm.precio)));
        }
      }
      if (prefilledLeadId) {
        const lead = (leadData.data ?? []).find((l: LeadOption) => l.id === prefilledLeadId);
        if (lead) setSelectedLead(lead);
      }
    }).finally(() => setLoadingData(false));
  }, [open, prefilledInmuebleId, prefilledLeadId]);

  function reset() {
    setSelectedInmueble(null);
    setSelectedLead(null);
    setSearchInm("");
    setSearchLead("");
    setTipo("VENTA");
    setPrecioFinal("");
    setComisionPct("4");
    setNotas("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!selectedInmueble || !selectedLead) return;

    const comercialId = selectedInmueble.comercialId ?? selectedLead.comercialId;
    if (!comercialId) {
      toast("El inmueble o el lead deben tener un comercial asignado", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/operaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inmuebleId: selectedInmueble.id,
          leadId: selectedLead.id,
          comercialId,
          tipo,
          precioFinal: Number(precioFinal),
          comisionPctPropietario: comisionPct ? Number(comisionPct) : undefined,
          notas: notas || undefined,
        }),
      });

      if (res.ok) {
        toast("Operacion creada correctamente", "success");
        handleClose();
        onCreated();
      } else {
        const err = await res.json();
        toast(err.error ?? "Error al crear operacion", "error");
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const filteredInm = inmuebles.filter((i) =>
    !searchInm || `${i.referencia} ${i.titulo} ${i.localidad}`.toLowerCase().includes(searchInm.toLowerCase())
  ).slice(0, 10);

  const filteredLeads = leads.filter((l) =>
    !searchLead || `${l.nombre} ${l.apellidos ?? ""} ${l.email ?? ""}`.toLowerCase().includes(searchLead.toLowerCase())
  ).slice(0, 10);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={handleClose} />
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <div className="bg-card rounded-2xl shadow-[var(--shadow-xl)] w-full max-w-[640px] max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">Nueva operacion</h2>
            <button onClick={handleClose} className="h-9 w-9 rounded-lg flex items-center justify-center text-secondary hover:bg-muted cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Seleccionar inmueble */}
            <div>
              <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-emerald-600" /> Inmueble
              </label>
              {selectedInmueble ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div>
                    <p className="text-xs font-mono text-secondary">{selectedInmueble.referencia}</p>
                    <p className="text-base font-semibold text-foreground">{selectedInmueble.titulo}</p>
                    <p className="text-sm text-secondary">{selectedInmueble.localidad} - {formatCurrency(Number(selectedInmueble.precio))}</p>
                  </div>
                  {!prefilledInmuebleId && (
                    <Button size="sm" variant="ghost" onClick={() => setSelectedInmueble(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary/50" />
                    <input
                      value={searchInm}
                      onChange={(e) => setSearchInm(e.target.value)}
                      placeholder="Buscar inmueble por ref, titulo, localidad..."
                      className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-base text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredInm.map((inm) => (
                      <button
                        key={inm.id}
                        onClick={() => {
                          setSelectedInmueble(inm);
                          setPrecioFinal(String(Number(inm.precio)));
                          setSearchInm("");
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      >
                        <span className="text-xs font-mono text-secondary">{inm.referencia}</span>
                        <span className="text-sm font-medium text-foreground ml-2">{inm.titulo}</span>
                        <span className="text-sm text-secondary ml-2">{formatCurrency(Number(inm.precio))}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Seleccionar lead/comprador */}
            <div>
              <label className="text-sm font-bold text-foreground flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-blue-600" /> Comprador (Lead)
              </label>
              {selectedLead ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex items-center gap-3">
                    <Avatar name={`${selectedLead.nombre} ${selectedLead.apellidos ?? ""}`} size="sm" />
                    <div>
                      <p className="text-base font-semibold text-foreground">{selectedLead.nombre} {selectedLead.apellidos ?? ""}</p>
                      <p className="text-sm text-secondary">{selectedLead.email ?? selectedLead.telefono ?? ""}</p>
                    </div>
                  </div>
                  {!prefilledLeadId && (
                    <Button size="sm" variant="ghost" onClick={() => setSelectedLead(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary/50" />
                    <input
                      value={searchLead}
                      onChange={(e) => setSearchLead(e.target.value)}
                      placeholder="Buscar lead por nombre, email..."
                      className="h-11 w-full rounded-lg border border-border bg-card pl-10 pr-3 text-base text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredLeads.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => { setSelectedLead(lead); setSearchLead(""); }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors flex items-center gap-2"
                      >
                        <Avatar name={`${lead.nombre} ${lead.apellidos ?? ""}`} size="sm" />
                        <span className="text-sm font-medium text-foreground">{lead.nombre} {lead.apellidos ?? ""}</span>
                        <Badge variant="default" size="sm">{lead.faseFunnel.replace(/_/g, " ")}</Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tipo + Precio + Comision */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-bold text-foreground block mb-2">Tipo</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTipo("VENTA")}
                    className={`flex-1 h-11 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                      tipo === "VENTA" ? "bg-primary text-white" : "bg-muted text-secondary"
                    }`}
                  >
                    Venta
                  </button>
                  <button
                    onClick={() => setTipo("ALQUILER")}
                    className={`flex-1 h-11 rounded-lg text-sm font-semibold cursor-pointer transition-all ${
                      tipo === "ALQUILER" ? "bg-primary text-white" : "bg-muted text-secondary"
                    }`}
                  >
                    Alquiler
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-foreground flex items-center gap-1 mb-2">
                  <Euro className="h-4 w-4" /> Precio final
                </label>
                <input
                  type="number"
                  value={precioFinal}
                  onChange={(e) => setPrecioFinal(e.target.value)}
                  placeholder="200000"
                  className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base font-bold text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-foreground flex items-center gap-1 mb-2">
                  <Percent className="h-4 w-4" /> Comision %
                </label>
                <input
                  type="number"
                  value={comisionPct}
                  onChange={(e) => setComisionPct(e.target.value)}
                  placeholder="4"
                  step="0.5"
                  min="0"
                  max="100"
                  className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Preview comision */}
            {precioFinal && comisionPct && (
              <div className="bg-muted/50 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{formatCurrency(Number(precioFinal) * Number(comisionPct) / 100)}</p>
                  <p className="text-xs text-secondary">Comision total</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-secondary">{formatCurrency(Number(precioFinal) * Number(comisionPct) / 100 * 0.7)}</p>
                  <p className="text-xs text-secondary">Empresa (70%)</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{formatCurrency(Number(precioFinal) * Number(comisionPct) / 100 * 0.3)}</p>
                  <p className="text-xs text-secondary">Comercial (30%)</p>
                </div>
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="text-sm font-bold text-foreground block mb-2">Notas (opcional)</label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={3}
                placeholder="Observaciones sobre la operacion..."
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-base text-foreground focus:border-primary focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              loading={saving}
              disabled={!selectedInmueble || !selectedLead || !precioFinal}
              size="lg"
            >
              Crear operacion
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
