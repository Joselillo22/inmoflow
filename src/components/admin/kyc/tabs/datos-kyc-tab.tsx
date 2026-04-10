"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ShieldCheck, ShieldAlert, Pencil, X, Check, User, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
import type { PropietarioDetail } from "@/lib/types/propietario";

const tipoDocOptions = [
  { value: "DNI", label: "DNI" },
  { value: "NIE", label: "NIE" },
  { value: "Pasaporte", label: "Pasaporte" },
  { value: "CIF", label: "CIF" },
];

const origenFondosOptions = [
  { value: "Actividad profesional", label: "Actividad profesional" },
  { value: "Herencia", label: "Herencia" },
  { value: "Venta de inmueble", label: "Venta de inmueble" },
  { value: "Ahorro", label: "Ahorro" },
  { value: "Inversion", label: "Inversion" },
  { value: "Prestamo", label: "Prestamo" },
  { value: "Otro", label: "Otro" },
];

interface DatosKYCTabProps {
  propietario: PropietarioDetail;
  onUpdated: () => void;
}

export function DatosKYCTab({ propietario, onUpdated }: DatosKYCTabProps) {
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [personal, setPersonal] = useState({
    nombre: propietario.nombre,
    apellidos: propietario.apellidos ?? "",
    telefono: propietario.telefono ?? "",
    email: propietario.email ?? "",
    notas: propietario.notas ?? "",
  });

  const [kyc, setKyc] = useState({
    dniNie: propietario.dniNie ?? "",
    tipoDocumento: propietario.tipoDocumento ?? "",
    nacionalidad: propietario.nacionalidad ?? "",
    actividadPro: propietario.actividadPro ?? "",
    origenFondos: propietario.origenFondos ?? "",
  });

  async function savePersonal() {
    setSaving(true);
    try {
      const res = await fetch(`/api/propietarios/${propietario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(personal),
      });
      if (res.ok) { setEditingPersonal(false); onUpdated(); toast("Datos guardados", "success"); }
    } finally { setSaving(false); }
  }

  async function verificarKYC() {
    if (!kyc.dniNie || !kyc.tipoDocumento || !kyc.nacionalidad || !kyc.actividadPro || !kyc.origenFondos) {
      toast("Todos los campos KYC son obligatorios", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/propietarios/${propietario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kyc),
      });
      if (res.ok) { onUpdated(); toast("KYC verificado correctamente", "success"); }
    } finally { setSaving(false); }
  }

  async function revocarKYC() {
    setSaving(true);
    try {
      const res = await fetch(`/api/propietarios/${propietario.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kycVerificado: false }),
      });
      if (res.ok) { onUpdated(); toast("Verificacion KYC revocada", "success"); }
    } finally { setSaving(false); }
  }

  const inputClass = "h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/15";
  const selectClass = inputClass + " appearance-none";
  const labelClass = "text-sm font-medium text-secondary block mb-1";

  return (
    <div className="p-5 space-y-6">
      {/* Datos personales */}
      <div className="bg-muted/30 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-bold text-foreground">Datos personales</h3>
          </div>
          {!editingPersonal ? (
            <Button size="sm" variant="outline" onClick={() => setEditingPersonal(true)} className="gap-2">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditingPersonal(false)}><X className="h-4 w-4" /></Button>
              <Button size="sm" onClick={savePersonal} loading={saving} className="gap-2"><Check className="h-4 w-4" /> Guardar</Button>
            </div>
          )}
        </div>

        {!editingPersonal ? (
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm text-secondary">Nombre</p><p className="text-base font-medium text-foreground">{propietario.nombre} {propietario.apellidos ?? ""}</p></div>
            <div><p className="text-sm text-secondary">Telefono</p><p className="text-base font-medium text-foreground">{propietario.telefono ?? "—"}</p></div>
            <div><p className="text-sm text-secondary">Email</p><p className="text-base font-medium text-foreground">{propietario.email ?? "—"}</p></div>
            {propietario.notas && <div className="col-span-2"><p className="text-sm text-secondary">Notas</p><p className="text-base text-foreground">{propietario.notas}</p></div>}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelClass}>Nombre</label><input value={personal.nombre} onChange={(e) => setPersonal({ ...personal, nombre: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Apellidos</label><input value={personal.apellidos} onChange={(e) => setPersonal({ ...personal, apellidos: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Telefono</label><input value={personal.telefono} onChange={(e) => setPersonal({ ...personal, telefono: e.target.value })} className={inputClass} /></div>
            <div><label className={labelClass}>Email</label><input value={personal.email} onChange={(e) => setPersonal({ ...personal, email: e.target.value })} className={inputClass} /></div>
            <div className="col-span-2"><label className={labelClass}>Notas</label><textarea value={personal.notas} onChange={(e) => setPersonal({ ...personal, notas: e.target.value })} rows={3} className={inputClass + " py-2 resize-none h-auto"} /></div>
          </div>
        )}
      </div>

      {/* KYC/PBC */}
      <div className={`rounded-xl p-5 ${propietario.kycVerificado ? "bg-emerald-50/50 border border-emerald-200" : "bg-amber-50/50 border border-amber-200"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {propietario.kycVerificado ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-amber-600" />}
            <h3 className="text-base font-bold text-foreground">KYC / PBC</h3>
          </div>
          <Badge variant={propietario.kycVerificado ? "success" : "warning"} size="md">
            {propietario.kycVerificado ? "Verificado" : "Pendiente"}
          </Badge>
        </div>

        {propietario.kycVerificado ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><p className="text-sm text-secondary">DNI/NIE</p><p className="text-base font-mono font-medium text-foreground">{propietario.dniNie}</p></div>
              <div><p className="text-sm text-secondary">Tipo documento</p><p className="text-base font-medium text-foreground">{propietario.tipoDocumento}</p></div>
              <div><p className="text-sm text-secondary">Nacionalidad</p><p className="text-base font-medium text-foreground">{propietario.nacionalidad}</p></div>
              <div><p className="text-sm text-secondary">Actividad profesional</p><p className="text-base font-medium text-foreground">{propietario.actividadPro}</p></div>
              <div><p className="text-sm text-secondary">Origen de fondos</p><p className="text-base font-medium text-foreground">{propietario.origenFondos}</p></div>
              <div><p className="text-sm text-secondary">Fecha verificacion</p><p className="text-base font-medium text-foreground">{propietario.kycFecha ? formatDate(propietario.kycFecha) : "—"}</p></div>
            </div>
            <Button size="sm" variant="danger" onClick={revocarKYC} loading={saving} className="gap-2">
              <ShieldAlert className="h-4 w-4" /> Revocar verificacion
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-amber-700 mb-4">Complete todos los campos obligatorios para verificar el KYC del propietario.</p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className={labelClass}>DNI/NIE *</label>
                <input value={kyc.dniNie} onChange={(e) => setKyc({ ...kyc, dniNie: e.target.value })} placeholder="12345678A" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tipo documento *</label>
                <select value={kyc.tipoDocumento} onChange={(e) => setKyc({ ...kyc, tipoDocumento: e.target.value })} className={selectClass}>
                  <option value="">Seleccionar...</option>
                  {tipoDocOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Nacionalidad *</label>
                <input value={kyc.nacionalidad} onChange={(e) => setKyc({ ...kyc, nacionalidad: e.target.value })} placeholder="Espanola" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Actividad profesional *</label>
                <input value={kyc.actividadPro} onChange={(e) => setKyc({ ...kyc, actividadPro: e.target.value })} placeholder="Empresario" className={inputClass} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Origen de fondos *</label>
                <select value={kyc.origenFondos} onChange={(e) => setKyc({ ...kyc, origenFondos: e.target.value })} className={selectClass}>
                  <option value="">Seleccionar...</option>
                  {origenFondosOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <Button size="lg" variant="success" onClick={verificarKYC} loading={saving} className="w-full gap-2">
              <ShieldCheck className="h-5 w-5" /> Verificar KYC
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
