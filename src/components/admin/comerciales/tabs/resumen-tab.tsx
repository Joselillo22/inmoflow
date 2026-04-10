"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Eye, Building2, Handshake, Euro, MapPin, Phone, Globe, Calendar, FileText, Pencil, X, Check } from "lucide-react";
import { formatCurrency, formatDate, formatPhone } from "@/lib/utils/formatters";
import type { ComercialDetail } from "@/lib/types/comercial";

interface ResumenTabProps {
  comercial: ComercialDetail;
  onUpdated: () => void;
}

export function ResumenTab({ comercial, onUpdated }: ResumenTabProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    telefono: comercial.telefono,
    zona: comercial.zona,
    numRegistroCV: comercial.numRegistroCV ?? "",
    activo: comercial.activo,
  });

  const now = new Date();
  const mesActual = new Date(now.getFullYear(), now.getMonth(), 1);

  const leadsActivos = comercial.leads.filter(
    (l) => !["PERDIDO", "CIERRE"].includes(l.faseFunnel)
  ).length;

  const visitasMes = comercial.visitas.filter(
    (v) => new Date(v.fecha) >= mesActual
  ).length;

  const facturacionPendiente = comercial.comisiones
    .filter((c) => c.estadoPago !== "PAGADO")
    .reduce((sum, c) => sum + Number(c.importeComercial), 0);

  const kpis = [
    { label: "Leads activos", value: leadsActivos, icon: Users, color: "text-blue-600" },
    { label: "Visitas este mes", value: visitasMes, icon: Eye, color: "text-amber-600" },
    { label: "Inmuebles", value: comercial._count.inmuebles, icon: Building2, color: "text-emerald-600" },
    { label: "Operaciones", value: comercial._count.operaciones, icon: Handshake, color: "text-violet-600" },
    { label: "Facturacion pendiente", value: formatCurrency(facturacionPendiente), icon: Euro, color: "text-rose-600" },
  ];

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/comerciales/${comercial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setEditing(false);
        onUpdated();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-muted/50 rounded-xl p-4 text-center">
            <kpi.icon className={`h-5 w-5 mx-auto mb-2 ${kpi.color}`} />
            <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            <p className="text-sm text-secondary mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Info + Edit */}
      <div className="bg-muted/30 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground">Informacion del comercial</h3>
          {!editing ? (
            <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-2">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSave} loading={saving} className="gap-2">
                <Check className="h-4 w-4" /> Guardar
              </Button>
            </div>
          )}
        </div>

        {!editing ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-secondary">Zona</p>
                <p className="text-base font-medium text-foreground">{comercial.zona}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-secondary">Telefono</p>
                <p className="text-base font-medium text-foreground">{formatPhone(comercial.telefono)}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-secondary">Idiomas</p>
                <div className="flex gap-1.5 mt-0.5">
                  {comercial.idiomas.map((i) => (
                    <Badge key={i} variant="info" size="sm">{i.toUpperCase()}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm text-secondary">Fecha de alta</p>
                <p className="text-base font-medium text-foreground">{formatDate(comercial.fechaAlta)}</p>
              </div>
            </div>
            {comercial.numRegistroCV && (
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-secondary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-secondary">Num. Registro CV</p>
                  <p className="text-base font-medium text-foreground">{comercial.numRegistroCV}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${comercial.activo ? "bg-emerald-500" : "bg-red-500"}`} />
              <div>
                <p className="text-sm text-secondary">Estado</p>
                <Badge variant={comercial.activo ? "success" : "danger"} size="sm">
                  {comercial.activo ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-secondary block mb-1">Telefono</label>
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/15"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-secondary block mb-1">Zona</label>
              <input
                value={form.zona}
                onChange={(e) => setForm({ ...form, zona: e.target.value })}
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/15"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-secondary block mb-1">Num. Registro CV</label>
              <input
                value={form.numRegistroCV}
                onChange={(e) => setForm({ ...form, numRegistroCV: e.target.value })}
                className="h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/15"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-secondary block mb-1">Estado</label>
              <button
                onClick={() => setForm({ ...form, activo: !form.activo })}
                className={`h-11 px-4 rounded-lg text-base font-medium cursor-pointer transition-colors ${
                  form.activo ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {form.activo ? "Activo" : "Inactivo"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
