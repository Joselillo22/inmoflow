"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { X, UserPlus } from "lucide-react";
import { FUENTE_LEAD_LABELS } from "@/lib/utils/constants";

interface NuevoLeadModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (leadId: string) => void;
}

interface ComercialOption {
  id: string;
  usuario: { nombre: string; apellidos: string };
}

const fuenteOptions = Object.entries(FUENTE_LEAD_LABELS).map(([value, label]) => ({ value, label }));
const idiomaOptions = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "de", label: "Alemán" },
  { value: "nl", label: "Neerlandés" },
  { value: "fr", label: "Francés" },
  { value: "sv", label: "Sueco" },
  { value: "no", label: "Noruego" },
];

export function NuevoLeadModal({ open, onClose, onCreated }: NuevoLeadModalProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [comerciales, setComerciales] = useState<ComercialOption[]>([]);

  const [nombre, setNombre] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [fuente, setFuente] = useState("");
  const [comercialId, setComercialId] = useState("");
  const [nacionalidad, setNacionalidad] = useState("");
  const [idioma, setIdioma] = useState("es");
  const [notas, setNotas] = useState("");

  useEffect(() => {
    if (!open) return;
    setNombre(""); setApellidos(""); setTelefono(""); setEmail("");
    setFuente(""); setComercialId(""); setNacionalidad(""); setIdioma("es"); setNotas("");
    fetch("/api/comerciales?activo=true")
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((d) => setComerciales(d.data ?? d.items ?? []))
      .catch(() => setComerciales([]));
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) {
      toast("El nombre es obligatorio", "error");
      return;
    }
    if (!fuente) {
      toast("La fuente es obligatoria", "error");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        nombre: nombre.trim(),
        fuente,
        idioma,
      };
      if (apellidos.trim()) body.apellidos = apellidos.trim();
      if (telefono.trim()) body.telefono = telefono.trim();
      if (email.trim()) body.email = email.trim();
      if (comercialId) body.comercialId = comercialId;
      if (nacionalidad.trim()) body.nacionalidad = nacionalidad.trim();
      if (notas.trim()) body.notas = notas.trim();

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "No se pudo crear el lead", "error");
        return;
      }
      const msg = data.asignacion
        ? `Lead creado y asignado automáticamente`
        : "Lead creado correctamente";
      toast(msg, "success");
      onCreated(data.data.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Nuevo lead
          </h3>
          <button type="button" onClick={onClose} className="text-secondary hover:text-foreground cursor-pointer transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input id="nombre" label="Nombre *" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan" autoFocus />
            <Input id="apellidos" label="Apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} placeholder="García López" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input id="telefono" label="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="600123456" />
            <Input id="email" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="juan@example.com" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select id="fuente" label="Fuente *" options={fuenteOptions} placeholder="Seleccionar..." value={fuente} onChange={(e) => setFuente(e.target.value)} />
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Comercial asignado</label>
              <select
                className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={comercialId}
                onChange={(e) => setComercialId(e.target.value)}
              >
                <option value="">Asignación automática</option>
                {comerciales.map((c) => (
                  <option key={c.id} value={c.id}>{c.usuario.nombre} {c.usuario.apellidos}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input id="nacionalidad" label="Nacionalidad" value={nacionalidad} onChange={(e) => setNacionalidad(e.target.value)} placeholder="Española" />
            <Select id="idioma" label="Idioma" options={idiomaOptions} value={idioma} onChange={(e) => setIdioma(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Notas</label>
            <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} placeholder="Información adicional, intereses, presupuesto..." />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              <UserPlus className="h-4 w-4" />
              {saving ? "Creando..." : "Crear lead"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
