"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TIPO_INMUEBLE_LABELS, TIPO_OPERACION_LABELS } from "@/lib/utils/constants";

const tipoOptions = Object.entries(TIPO_INMUEBLE_LABELS).map(([value, label]) => ({ value, label }));
const operacionOptions = Object.entries(TIPO_OPERACION_LABELS).map(([value, label]) => ({ value, label }));

export default function NuevoInmueblePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const body = {
      referencia: formData.get("referencia"),
      tipo: formData.get("tipo"),
      operacion: formData.get("operacion"),
      titulo: formData.get("titulo"),
      descripcion: formData.get("descripcion") || undefined,
      precio: Number(formData.get("precio")),
      metrosConstruidos: formData.get("metrosConstruidos") ? Number(formData.get("metrosConstruidos")) : undefined,
      habitaciones: formData.get("habitaciones") ? Number(formData.get("habitaciones")) : undefined,
      banos: formData.get("banos") ? Number(formData.get("banos")) : undefined,
      direccion: formData.get("direccion"),
      codigoPostal: formData.get("codigoPostal") || undefined,
      localidad: formData.get("localidad"),
      provincia: "Alicante",
    };

    const res = await fetch("/api/inmuebles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al crear inmueble");
      setLoading(false);
      return;
    }

    router.push("/inmuebles");
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Nuevo inmueble</h1>

      <Card>
        <CardHeader>
          <CardTitle>Datos del inmueble</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input id="referencia" name="referencia" label="Referencia" placeholder="INM-001" required />
              <Select id="tipo" name="tipo" label="Tipo" options={tipoOptions} placeholder="Seleccionar tipo" required />
            </div>

            <Select id="operacion" name="operacion" label="Operación" options={operacionOptions} placeholder="Seleccionar operación" required />

            <Input id="titulo" name="titulo" label="Título" placeholder="Piso 3 hab con vistas al mar" required />
            <Textarea id="descripcion" name="descripcion" label="Descripción" placeholder="Describe el inmueble..." />

            <div className="grid grid-cols-2 gap-4">
              <Input id="precio" name="precio" label="Precio (€)" type="number" placeholder="200000" required />
              <Input id="metrosConstruidos" name="metrosConstruidos" label="Metros construidos" type="number" placeholder="90" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input id="habitaciones" name="habitaciones" label="Habitaciones" type="number" placeholder="3" />
              <Input id="banos" name="banos" label="Baños" type="number" placeholder="2" />
            </div>

            <Input id="direccion" name="direccion" label="Dirección" placeholder="Calle Mayor 15, 3ºA" required />

            <div className="grid grid-cols-2 gap-4">
              <Input id="localidad" name="localidad" label="Localidad" placeholder="Alicante" required />
              <Input id="codigoPostal" name="codigoPostal" label="Código postal" placeholder="03001" />
            </div>

            {error && <p className="text-danger text-sm">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar inmueble"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.back()}>
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
