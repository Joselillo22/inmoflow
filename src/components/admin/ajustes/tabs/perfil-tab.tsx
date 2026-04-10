"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { User, Lock, Check } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";

interface Perfil {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  rol: string;
  createdAt: string;
}

export function PerfilTab() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [passwordActual, setPasswordActual] = useState("");
  const [passwordNueva, setPasswordNueva] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    fetch("/api/perfil").then(async (res) => {
      if (res.ok) {
        const { data } = await res.json();
        setPerfil(data);
        setNombre(data.nombre);
        setApellidos(data.apellidos);
      }
      setLoading(false);
    });
  }, []);

  async function guardarDatos() {
    setSaving(true);
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, apellidos }),
      });
      if (res.ok) toast("Datos actualizados", "success");
      else { const err = await res.json(); toast(err.error ?? "Error", "error"); }
    } finally { setSaving(false); }
  }

  async function cambiarPassword() {
    if (!passwordActual || !passwordNueva) {
      toast("Rellena ambos campos de contrasena", "error"); return;
    }
    if (passwordNueva.length < 8) {
      toast("La nueva contrasena debe tener minimo 8 caracteres", "error"); return;
    }
    if (passwordNueva !== passwordConfirm) {
      toast("Las contrasenas no coinciden", "error"); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordActual, passwordNueva }),
      });
      if (res.ok) {
        toast("Contrasena cambiada correctamente", "success");
        setPasswordActual("");
        setPasswordNueva("");
        setPasswordConfirm("");
      } else {
        const err = await res.json();
        toast(err.error ?? "Error al cambiar contrasena", "error");
      }
    } finally { setSaving(false); }
  }

  const inputClass = "h-11 w-full rounded-lg border border-border bg-card px-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/15";

  if (loading) return <div className="p-5 space-y-4"><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div>;

  const rolLabel: Record<string, string> = { ADMIN: "Administrador", COORDINADORA: "Coordinadora", COMERCIAL: "Comercial" };

  return (
    <div className="p-5 space-y-6">
      {/* Info sesion */}
      <div className="bg-muted/30 rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-base font-bold text-foreground">{perfil?.nombre} {perfil?.apellidos}</p>
          <p className="text-sm text-secondary">{perfil?.email}</p>
        </div>
        <Badge variant="info" size="md">{rolLabel[perfil?.rol ?? ""] ?? perfil?.rol}</Badge>
        <span className="text-sm text-secondary">Desde {perfil?.createdAt ? formatDate(perfil.createdAt) : ""}</span>
      </div>

      {/* Datos personales */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-bold text-foreground">Datos personales</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-secondary block mb-1">Nombre</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-secondary block mb-1">Apellidos</label>
            <input value={apellidos} onChange={(e) => setApellidos(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-secondary block mb-1">Email</label>
            <input value={perfil?.email ?? ""} disabled className={inputClass + " opacity-50 cursor-not-allowed"} />
            <p className="text-xs text-secondary mt-1">El email no se puede cambiar desde aqui</p>
          </div>
        </div>
        <Button size="md" onClick={guardarDatos} loading={saving} className="mt-4 gap-2">
          <Check className="h-4 w-4" /> Guardar datos
        </Button>
      </div>

      {/* Cambiar password */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-amber-600" />
          <h3 className="text-base font-bold text-foreground">Cambiar contrasena</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-secondary block mb-1">Contrasena actual</label>
            <input type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-secondary block mb-1">Nueva contrasena</label>
            <input type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="text-sm font-medium text-secondary block mb-1">Confirmar nueva</label>
            <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className={inputClass} />
          </div>
        </div>
        {passwordNueva && passwordConfirm && passwordNueva !== passwordConfirm && (
          <p className="text-sm text-red-600 mt-2">Las contrasenas no coinciden</p>
        )}
        <Button size="md" variant="outline" onClick={cambiarPassword} loading={saving} className="mt-4 gap-2">
          <Lock className="h-4 w-4" /> Cambiar contrasena
        </Button>
      </div>
    </div>
  );
}
