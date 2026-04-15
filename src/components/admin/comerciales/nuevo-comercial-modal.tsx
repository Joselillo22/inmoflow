"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { X, UserPlus, RefreshCw, Eye, EyeOff, Copy, Check } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (comercialId: string) => void;
}

const ZONAS_SUGERIDAS = [
  "Alicante", "San Juan de Alicante", "El Campello", "Mutxamel",
  "San Vicente del Raspeig", "Santa Pola", "Elche", "Crevillente",
  "Benidorm", "Torrevieja", "Toda la provincia",
];

function generarPassword(): string {
  const mayus = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const minus = "abcdefghjkmnpqrstuvwxyz";
  const nums = "23456789";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let pwd = pick(mayus) + pick(minus) + pick(nums);
  const all = mayus + minus + nums;
  for (let i = 0; i < 9; i++) pwd += pick(all);
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

export function NuevoComercialModal({ open, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPwd, setCopiedPwd] = useState(false);

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [zona, setZona] = useState("");
  const [numRegistroCV, setNumRegistroCV] = useState("");

  useEffect(() => {
    if (!open) return;
    setNombre(""); setApellidos(""); setEmail(""); setPassword("");
    setTelefono(""); setZona(""); setNumRegistroCV("");
    setShowPassword(false); setCopiedPwd(false);
  }, [open]);

  if (!open) return null;

  function autoGenerar() {
    const p = generarPassword();
    setPassword(p);
    setShowPassword(true);
    toast("Contraseña generada — recuérdate de copiársela al comercial", "info");
  }

  async function copiarPassword() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopiedPwd(true);
    setTimeout(() => setCopiedPwd(false), 2000);
    toast("Contraseña copiada", "success");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Validación frontend mínima
    if (!nombre.trim() || !apellidos.trim()) {
      toast("Nombre y apellidos obligatorios", "error");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast("Email no válido", "error");
      return;
    }
    if (!telefono.trim()) {
      toast("El teléfono es obligatorio", "error");
      return;
    }
    if (!zona.trim()) {
      toast("La zona es obligatoria", "error");
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      toast("La contraseña necesita mínimo 8 caracteres, mayúscula, minúscula y número", "error");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        nombre: nombre.trim(),
        apellidos: apellidos.trim(),
        email: email.trim().toLowerCase(),
        password,
        telefono: telefono.trim(),
        zona: zona.trim(),
      };
      if (numRegistroCV.trim()) body.numRegistroCV = numRegistroCV.trim();

      const res = await fetch("/api/comerciales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "No se pudo crear el comercial", "error");
        return;
      }
      toast("Comercial creado correctamente", "success");
      onCreated(data.data.comercial.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Nuevo comercial
          </h3>
          <button type="button" onClick={onClose} className="text-secondary hover:text-foreground cursor-pointer transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-secondary">
            Se creará un usuario con rol COMERCIAL y acceso al panel mobile. Comparte las credenciales con el agente para que pueda iniciar sesión.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Input id="nombre" label="Nombre *" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Pedro" autoFocus />
            <Input id="apellidos" label="Apellidos *" value={apellidos} onChange={(e) => setApellidos(e.target.value)} placeholder="García López" />
          </div>

          <Input id="email" label="Email (login) *" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pedro@entraymas.es" />

          {/* Password con generador */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-foreground">Contraseña *</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={autoGenerar} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 cursor-pointer">
                  <RefreshCw className="h-3 w-3" /> Generar
                </button>
                {password && (
                  <button type="button" onClick={copiarPassword} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 cursor-pointer">
                    {copiedPwd ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedPwd ? "Copiada" : "Copiar"}
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full h-10 rounded-md border border-border bg-background px-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-secondary mt-1">Mínimo 8 caracteres · 1 mayúscula · 1 minúscula · 1 número</p>
          </div>

          <Input id="telefono" label="Teléfono *" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+34 600 123 456" />

          {/* Zona con chips */}
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Zona asignada *</label>
            <input
              type="text"
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              placeholder="Alicante, Elche, toda la provincia..."
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {ZONAS_SUGERIDAS.map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZona(z)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
                >
                  {z}
                </button>
              ))}
            </div>
          </div>

          <Input id="numRegistroCV" label="Nº registro API (Comunidad Valenciana)" value={numRegistroCV} onChange={(e) => setNumRegistroCV(e.target.value)} placeholder="Opcional · ej: RAICV-12345" />

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              {saving ? "Creando..." : "Crear comercial"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
