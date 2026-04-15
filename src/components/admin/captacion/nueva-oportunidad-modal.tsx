"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { X, Target } from "lucide-react";

const portalOptions = [
  { value: "IDEALISTA", label: "Idealista" },
  { value: "FOTOCASA", label: "Fotocasa" },
  { value: "MILANUNCIOS", label: "Milanuncios" },
  { value: "WALLAPOP", label: "Wallapop" },
  { value: "CARTEL_CALLE", label: "Cartel en calle" },
  { value: "REFERIDO", label: "Referido" },
  { value: "WEB_PROPIA", label: "Web propia" },
  { value: "PUERTA_FRIA", label: "Puerta fría" },
  { value: "OTRO", label: "Otro" },
];

const operacionOptions = [
  { value: "VENTA", label: "Venta" },
  { value: "ALQUILER", label: "Alquiler" },
];

const tipoOptions = [
  { value: "piso", label: "Piso" },
  { value: "casa", label: "Casa" },
  { value: "chalet", label: "Chalet" },
  { value: "adosado", label: "Adosado" },
  { value: "atico", label: "Ático" },
  { value: "duplex", label: "Dúplex" },
  { value: "estudio", label: "Estudio" },
  { value: "local", label: "Local" },
  { value: "oficina", label: "Oficina" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function NuevaOportunidadModal({ open, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [portal, setPortal] = useState("");
  const [operacion, setOperacion] = useState("VENTA");
  const [urlAnuncio, setUrlAnuncio] = useState("");
  const [tipoInmueble, setTipoInmueble] = useState("piso");
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState("");
  const [localidad, setLocalidad] = useState("Alicante");
  const [direccionAproximada, setDireccionAproximada] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [habitaciones, setHabitaciones] = useState("");
  const [banos, setBanos] = useState("");
  const [metrosConstruidos, setMetrosConstruidos] = useState("");
  const [nombrePropietario, setNombrePropietario] = useState("");
  const [telefonoPropietario, setTelefonoPropietario] = useState("");
  const [emailPropietario, setEmailPropietario] = useState("");
  const [notas, setNotas] = useState("");

  if (!open) return null;

  function reset() {
    setPortal(""); setOperacion("VENTA"); setUrlAnuncio(""); setTipoInmueble("piso");
    setTitulo(""); setPrecio(""); setLocalidad("Alicante"); setDireccionAproximada("");
    setCodigoPostal(""); setHabitaciones(""); setBanos(""); setMetrosConstruidos("");
    setNombrePropietario(""); setTelefonoPropietario(""); setEmailPropietario(""); setNotas("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!portal) {
      toast("El portal es obligatorio", "error");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        portal, operacion, tipoInmueble,
        localidad: localidad || undefined,
      };
      if (urlAnuncio.trim()) body.urlAnuncio = urlAnuncio.trim();
      if (titulo.trim()) body.titulo = titulo.trim();
      if (precio) body.precio = Number(precio);
      if (direccionAproximada.trim()) body.direccionAproximada = direccionAproximada.trim();
      if (codigoPostal.trim()) body.codigoPostal = codigoPostal.trim();
      if (habitaciones) body.habitaciones = Number(habitaciones);
      if (banos) body.banos = Number(banos);
      if (metrosConstruidos) body.metrosConstruidos = Number(metrosConstruidos);
      if (nombrePropietario.trim()) body.nombrePropietario = nombrePropietario.trim();
      if (telefonoPropietario.trim()) body.telefonoPropietario = telefonoPropietario.trim();
      if (emailPropietario.trim()) body.emailPropietario = emailPropietario.trim();
      if (notas.trim()) body.notas = notas.trim();

      const res = await fetch("/api/captacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "No se pudo crear la oportunidad", "error");
        return;
      }
      toast("Oportunidad creada", "success");
      reset();
      onCreated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Nueva oportunidad de captación
          </h3>
          <button type="button" onClick={onClose} className="text-secondary hover:text-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-xs text-secondary">
            Crea una oportunidad manual (referido, cartel en calle, propietario que contactó directamente...). Para las detectadas automáticamente por el scraper no necesitas este modal.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <Select id="portal" label="Origen *" options={portalOptions} placeholder="Seleccionar..." value={portal} onChange={(e) => setPortal(e.target.value)} />
            <Select id="operacion" label="Operación *" options={operacionOptions} value={operacion} onChange={(e) => setOperacion(e.target.value)} />
            <Select id="tipoInmueble" label="Tipo" options={tipoOptions} value={tipoInmueble} onChange={(e) => setTipoInmueble(e.target.value)} />
          </div>

          <Input id="urlAnuncio" label="URL del anuncio (si existe)" type="url" value={urlAnuncio} onChange={(e) => setUrlAnuncio(e.target.value)} placeholder="https://www.idealista.com/inmueble/..." />

          <Input id="titulo" label="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Piso 3 hab Playa San Juan" />

          <div className="grid grid-cols-3 gap-3">
            <Input id="precio" label="Precio (€)" type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="195000" />
            <Input id="metrosConstruidos" label="m²" type="number" value={metrosConstruidos} onChange={(e) => setMetrosConstruidos(e.target.value)} />
            <Input id="habitaciones" label="Hab." type="number" value={habitaciones} onChange={(e) => setHabitaciones(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input id="banos" label="Baños" type="number" value={banos} onChange={(e) => setBanos(e.target.value)} />
            <Input id="codigoPostal" label="CP" value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value)} />
            <Input id="localidad" label="Localidad" value={localidad} onChange={(e) => setLocalidad(e.target.value)} />
          </div>

          <Input id="direccion" label="Dirección aproximada" value={direccionAproximada} onChange={(e) => setDireccionAproximada(e.target.value)} placeholder="Calle Mayor 15" />

          <div className="pt-3 border-t border-border space-y-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Propietario</p>
            <div className="grid grid-cols-2 gap-3">
              <Input id="nombrePropietario" label="Nombre" value={nombrePropietario} onChange={(e) => setNombrePropietario(e.target.value)} />
              <Input id="telefonoPropietario" label="Teléfono" value={telefonoPropietario} onChange={(e) => setTelefonoPropietario(e.target.value)} placeholder="600123456" />
            </div>
            <Input id="emailPropietario" label="Email" type="email" value={emailPropietario} onChange={(e) => setEmailPropietario(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Notas</label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} placeholder="Información extra, referencia, contexto..." />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving} className="gap-1.5">
              <Target className="h-4 w-4" /> {saving ? "Creando..." : "Crear oportunidad"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
