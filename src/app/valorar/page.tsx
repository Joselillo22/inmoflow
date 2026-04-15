"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ValoracionResultCard, type ValoracionInput } from "@/components/admin/valoracion/valoracion-card";
import { ArrowLeft, Calculator, MapPin } from "lucide-react";

const tipoOptions = [
  { value: "piso", label: "Piso" },
  { value: "casa", label: "Casa" },
  { value: "chalet", label: "Chalet / Villa" },
  { value: "adosado", label: "Adosado" },
  { value: "atico", label: "Ático" },
  { value: "duplex", label: "Dúplex" },
  { value: "estudio", label: "Estudio" },
];

const operacionOptions = [
  { value: "venta", label: "Venta" },
  { value: "alquiler", label: "Alquiler" },
];

const LOCALIDADES_POPULARES = [
  "Alicante", "San Juan de Alicante", "El Campello", "Mutxamel",
  "San Vicente del Raspeig", "Santa Pola", "Elche", "Crevillente",
];

export default function ValorarPage() {
  const { toast } = useToast();
  const router = useRouter();

  const [tipoInmueble, setTipoInmueble] = useState("piso");
  const [operacion, setOperacion] = useState<"venta" | "alquiler">("venta");
  const [localidad, setLocalidad] = useState("");
  const [metrosConstruidos, setMetros] = useState("");
  const [habitaciones, setHabitaciones] = useState("");
  const [banos, setBanos] = useState("");
  const [anoConstruccion, setAno] = useState("");
  const [garaje, setGaraje] = useState(false);
  const [piscina, setPiscina] = useState(false);
  const [terraza, setTerraza] = useState(false);
  const [ascensor, setAscensor] = useState(false);

  const [input, setInput] = useState<ValoracionInput | null>(null);

  function calcular() {
    if (!localidad.trim()) {
      toast("Introduce una localidad", "error");
      return;
    }
    const m2 = Number(metrosConstruidos);
    if (!m2 || m2 <= 0) {
      toast("Introduce los m² construidos", "error");
      return;
    }
    setInput({
      tipoInmueble,
      operacion,
      localidad: localidad.trim(),
      metrosConstruidos: m2,
      habitaciones: habitaciones ? Number(habitaciones) : undefined,
      banos: banos ? Number(banos) : undefined,
      anoConstruccion: anoConstruccion ? Number(anoConstruccion) : undefined,
      garaje, piscina, terraza, ascensor,
    });
  }

  function resetForm() {
    setInput(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20">
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-secondary hover:text-foreground cursor-pointer">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Calculator className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold text-foreground">Valoración rápida</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {!input ? (
          <>
            <p className="text-sm text-secondary">
              Introduce los datos básicos del inmueble y obtén una estimación del precio de mercado en segundos.
            </p>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Select id="tipoInmueble" label="Tipo *" options={tipoOptions} value={tipoInmueble} onChange={(e) => setTipoInmueble(e.target.value)} />
                <Select id="operacion" label="Operación *" options={operacionOptions} value={operacion} onChange={(e) => setOperacion(e.target.value as "venta" | "alquiler")} />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Localidad *
                </label>
                <input
                  type="text"
                  value={localidad}
                  onChange={(e) => setLocalidad(e.target.value)}
                  placeholder="Alicante, Elche, Santa Pola..."
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {LOCALIDADES_POPULARES.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setLocalidad(loc)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted hover:bg-primary/10 hover:text-primary cursor-pointer transition-colors"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              <Input id="metros" label="m² construidos *" type="number" value={metrosConstruidos} onChange={(e) => setMetros(e.target.value)} placeholder="90" />

              <div className="grid grid-cols-2 gap-3">
                <Input id="habitaciones" label="Habitaciones" type="number" value={habitaciones} onChange={(e) => setHabitaciones(e.target.value)} />
                <Input id="banos" label="Baños" type="number" value={banos} onChange={(e) => setBanos(e.target.value)} />
              </div>

              <Input id="anoConst" label="Año construcción" type="number" value={anoConstruccion} onChange={(e) => setAno(e.target.value)} placeholder="1985" />

              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">Extras</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: "garaje" as const, label: "Garaje", value: garaje, set: setGaraje },
                    { key: "piscina" as const, label: "Piscina", value: piscina, set: setPiscina },
                    { key: "terraza" as const, label: "Terraza", value: terraza, set: setTerraza },
                    { key: "ascensor" as const, label: "Ascensor", value: ascensor, set: setAscensor },
                  ].map((e) => (
                    <button
                      key={e.key}
                      type="button"
                      onClick={() => e.set(!e.value)}
                      className={`px-2 py-2 rounded-lg border-2 text-xs text-center transition-colors cursor-pointer ${
                        e.value ? "border-primary bg-primary/5 font-medium text-foreground" : "border-border text-secondary"
                      }`}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={calcular} className="w-full gap-2" size="md">
                <Calculator className="h-4 w-4" /> Calcular valoración
              </Button>
            </div>
          </>
        ) : (
          <>
            <ValoracionResultCard input={input} />
            <Button onClick={resetForm} variant="outline" className="w-full">
              Hacer otra valoración
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
