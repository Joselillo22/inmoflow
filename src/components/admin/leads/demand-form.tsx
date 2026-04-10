"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Search } from "lucide-react";
import { TIPO_INMUEBLE_LABELS, TIPO_OPERACION_LABELS } from "@/lib/utils/constants";
import type { DemandaWithMatchings } from "@/lib/types/lead";

const tipoOptions = Object.entries(TIPO_INMUEBLE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const opOptions = Object.entries(TIPO_OPERACION_LABELS).map(([v, l]) => ({ value: v, label: l }));

const extrasOptions = [
  { key: "garaje", label: "Garaje" },
  { key: "piscina", label: "Piscina" },
  { key: "terraza", label: "Terraza" },
  { key: "ascensor", label: "Ascensor" },
  { key: "aireAcondicionado", label: "A/C" },
  { key: "trastero", label: "Trastero" },
];

interface DemandFormProps {
  leadId: string;
  demand?: DemandaWithMatchings | null;
  onSaved: () => void;
}

export function DemandForm({ leadId, demand, onSaved }: DemandFormProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [matching, setMatching] = useState(false);
  const [extras, setExtras] = useState<Record<string, boolean>>(
    (demand?.extras as Record<string, boolean>) ?? {}
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      tipoInmueble: fd.get("tipoInmueble") || undefined,
      tipoOperacion: fd.get("tipoOperacion") || undefined,
      precioMin: fd.get("precioMin") ? Number(fd.get("precioMin")) : undefined,
      precioMax: fd.get("precioMax") ? Number(fd.get("precioMax")) : undefined,
      zona: fd.get("zona") || undefined,
      habitacionesMin: fd.get("habitacionesMin") ? Number(fd.get("habitacionesMin")) : undefined,
      metrosMin: fd.get("metrosMin") ? Number(fd.get("metrosMin")) : undefined,
      extras: Object.keys(extras).length > 0 ? extras : undefined,
    };

    if (demand) {
      body.demandaId = demand.id;
    }

    const res = await fetch(`/api/leads/${leadId}/demanda`, {
      method: demand ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      toast(demand ? "Demanda actualizada" : `Demanda creada — ${data.matchings ?? 0} matchings encontrados`, "success");
      onSaved();
    } else {
      toast("Error al guardar demanda", "error");
    }
    setSaving(false);
  }

  async function triggerMatching() {
    if (!demand) return;
    setMatching(true);
    const res = await fetch(`/api/leads/${leadId}/matching`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ demandaId: demand.id }),
    });
    if (res.ok) {
      const data = await res.json();
      toast(`${data.total} inmuebles encontrados`, "success");
      onSaved();
    }
    setMatching(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Select id="tipoInmueble" name="tipoInmueble" label="Tipo" options={tipoOptions} placeholder="Cualquiera" defaultValue={demand?.tipoInmueble ?? ""} compact />
        <Select id="tipoOperacion" name="tipoOperacion" label="Operacion" options={opOptions} placeholder="Cualquiera" defaultValue={demand?.tipoOperacion ?? ""} compact />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="precioMin" name="precioMin" label="Precio min" type="number" placeholder="0" defaultValue={demand?.precioMin ?? ""} compact />
        <Input id="precioMax" name="precioMax" label="Precio max" type="number" placeholder="500000" defaultValue={demand?.precioMax ?? ""} compact />
      </div>
      <Input id="zona" name="zona" label="Zona preferida" placeholder="Alicante Centro, Playa..." defaultValue={demand?.zona ?? ""} compact />
      <div className="grid grid-cols-2 gap-3">
        <Input id="habitacionesMin" name="habitacionesMin" label="Habitaciones min" type="number" placeholder="2" defaultValue={demand?.habitacionesMin ?? ""} compact />
        <Input id="metrosMin" name="metrosMin" label="Metros min" type="number" placeholder="60" defaultValue={demand?.metrosMin ?? ""} compact />
      </div>

      {/* Extras */}
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Extras deseados</label>
        <div className="flex flex-wrap gap-2">
          {extrasOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setExtras((p) => ({ ...p, [opt.key]: !p[opt.key] }))}
              className={`px-2.5 py-1 rounded-lg text-sm font-medium cursor-pointer transition-all border ${
                extras[opt.key]
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted border-transparent text-secondary hover:border-border"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" size="sm" loading={saving}>
          {demand ? "Actualizar" : "Crear demanda"}
        </Button>
        {demand && (
          <Button type="button" size="sm" variant="outline" loading={matching} onClick={triggerMatching}>
            <Search className="h-3.5 w-3.5" />
            Buscar matchings
          </Button>
        )}
      </div>
    </form>
  );
}
