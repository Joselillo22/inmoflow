"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Ruler, BedDouble, Bath, ExternalLink } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { ESTADO_INMUEBLE_LABELS, TIPO_INMUEBLE_LABELS, TIPO_OPERACION_LABELS } from "@/lib/utils/constants";
import { MapaInmueble } from "@/components/shared/MapaInmuebleDynamic";

const estadoVariant: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
  EN_CAPTACION: "info", ACTIVO: "success", RESERVADO: "warning",
  VENDIDO: "default", ALQUILADO: "default", RETIRADO: "danger",
};

interface Inmueble {
  id: string;
  referencia: string;
  tipo: string;
  operacion: string;
  estado: string;
  titulo: string;
  descripcion: string | null;
  precio: number;
  metrosConstruidos: number | null;
  habitaciones: number | null;
  banos: number | null;
  planta: number | null;
  ascensor: boolean | null;
  garaje: boolean | null;
  piscina: boolean | null;
  terraza: boolean | null;
  aireAcondicionado: boolean | null;
  direccion: string;
  localidad: string;
  latitud: number | null;
  longitud: number | null;
  propietario: { nombre: string; apellidos: string | null; telefono: string | null } | null;
  visitas: Array<{
    id: string;
    fecha: string;
    resultado: string;
    lead: { nombre: string; apellidos: string | null; telefono: string | null };
  }>;
  _count: { visitas: number };
}

export default function PisoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [inmueble, setInmueble] = useState<Inmueble | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inmuebles/${id}`)
      .then((r) => r.json())
      .then((res) => setInmueble(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}><CardContent className="h-24 animate-pulse bg-muted rounded" /></Card>
        ))}
      </div>
    );
  }

  if (!inmueble) {
    return (
      <Card><CardContent className="text-center py-8">
        <p className="text-secondary text-lg">Piso no encontrado</p>
      </CardContent></Card>
    );
  }

  const extras = [
    inmueble.ascensor && "Ascensor",
    inmueble.garaje && "Garaje",
    inmueble.piscina && "Piscina",
    inmueble.terraza && "Terraza",
    inmueble.aireAcondicionado && "A/C",
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-secondary hover:text-foreground cursor-pointer">
        <ArrowLeft className="h-5 w-5" /> Volver
      </button>

      {/* Cabecera */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-secondary">{inmueble.referencia}</span>
            <Badge variant={estadoVariant[inmueble.estado] ?? "default"}>
              {ESTADO_INMUEBLE_LABELS[inmueble.estado]}
            </Badge>
          </div>
          <h2 className="text-xl font-bold">{inmueble.titulo}</h2>
          <p className="text-secondary flex items-center gap-1 mt-1">
            <MapPin className="h-4 w-4" /> {inmueble.direccion}, {inmueble.localidad}
          </p>
          <p className="text-2xl font-bold text-primary mt-2">
            {formatCurrency(Number(inmueble.precio))}
          </p>
          <p className="text-sm text-secondary mt-1">
            {TIPO_INMUEBLE_LABELS[inmueble.tipo]} · {TIPO_OPERACION_LABELS[inmueble.operacion]}
          </p>
        </CardContent>
      </Card>

      {/* Características */}
      <Card>
        <CardHeader><CardTitle className="text-base">Características</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-xs text-secondary">Superficie</p>
                <p className="font-semibold">{inmueble.metrosConstruidos ?? "—"} m²</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BedDouble className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-xs text-secondary">Habitaciones</p>
                <p className="font-semibold">{inmueble.habitaciones ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Bath className="h-5 w-5 text-secondary" />
              <div>
                <p className="text-xs text-secondary">Baños</p>
                <p className="font-semibold">{inmueble.banos ?? "—"}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-secondary">Planta</p>
              <p className="font-semibold">{inmueble.planta ?? "—"}</p>
            </div>
          </div>
          {extras.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {extras.map((e) => (
                <Badge key={e as string} variant="info">{e as string}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Descripción */}
      {inmueble.descripcion && (
        <Card>
          <CardHeader><CardTitle className="text-base">Descripción</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{inmueble.descripcion}</p>
          </CardContent>
        </Card>
      )}

      {/* Mapa */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ubicación</CardTitle>
            <a
              href={
                inmueble.latitud && inmueble.longitud
                  ? `https://www.google.com/maps?q=${inmueble.latitud},${inmueble.longitud}`
                  : `https://www.google.com/maps/search/${encodeURIComponent(`${inmueble.direccion}, ${inmueble.localidad}`)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              <ExternalLink className="h-3 w-3" /> Google Maps
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <MapaInmueble
            latitud={inmueble.latitud}
            longitud={inmueble.longitud}
            direccion={`${inmueble.direccion}, ${inmueble.localidad}`}
            titulo={inmueble.titulo}
            precio={Number(inmueble.precio)}
            altura={250}
            modo="simple"
          />
        </CardContent>
      </Card>

      {/* Propietario */}
      {inmueble.propietario && (
        <Card>
          <CardHeader><CardTitle className="text-base">Propietario</CardTitle></CardHeader>
          <CardContent>
            <p className="font-semibold">{inmueble.propietario.nombre} {inmueble.propietario.apellidos ?? ""}</p>
            {inmueble.propietario.telefono && (
              <p className="text-secondary text-sm">{inmueble.propietario.telefono}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Visitas */}
      {inmueble.visitas.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Visitas ({inmueble._count.visitas})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {inmueble.visitas.map((v) => (
              <div key={v.id} className="py-2 border-b border-border last:border-0">
                <div className="flex justify-between">
                  <p className="font-medium">{v.lead.nombre} {v.lead.apellidos ?? ""}</p>
                  <p className="text-xs text-secondary">{formatDate(v.fecha)}</p>
                </div>
                <p className="text-sm text-secondary">{v.resultado.replace(/_/g, " ")}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
