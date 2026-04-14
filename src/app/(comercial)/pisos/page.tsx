"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Search, BedDouble, Ruler } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { ESTADO_INMUEBLE_LABELS, TIPO_INMUEBLE_LABELS } from "@/lib/utils/constants";

interface Inmueble {
  id: string;
  referencia: string;
  titulo: string;
  tipo: string;
  estado: string;
  precio: number;
  localidad: string;
  habitaciones: number | null;
  metrosConstruidos: number | null;
  fotos?: { url: string }[];
}

const estadoColor: Record<string, string> = {
  EN_CAPTACION: "bg-blue-100 text-blue-700",
  ACTIVO: "bg-emerald-100 text-emerald-700",
  RESERVADO: "bg-amber-100 text-amber-700",
  VENDIDO: "bg-slate-100 text-slate-600",
  ALQUILADO: "bg-slate-100 text-slate-600",
  RETIRADO: "bg-red-100 text-red-700",
};

export default function PisosPage() {
  const [inmuebles, setInmuebles] = useState<Inmueble[]>([]);
  const [filtered, setFiltered] = useState<Inmueble[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    fetch("/api/inmuebles?limit=100")
      .then((r) => r.json())
      .then((res) => {
        setInmuebles(res.data ?? []);
        setFiltered(res.data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      inmuebles.filter((i) =>
        i.titulo.toLowerCase().includes(q) ||
        i.localidad.toLowerCase().includes(q) ||
        i.referencia.toLowerCase().includes(q)
      )
    );
  }, [search, inmuebles]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 rounded-xl" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-secondary" />
          {t("comercial.myProperties")}
        </h2>
        <Badge variant="info" size="sm">{filtered.length}</Badge>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary/50" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar piso, localidad..."
          className="w-full h-10 pl-9 pr-4 rounded-xl border border-border bg-white/80 backdrop-blur-sm text-sm placeholder:text-secondary/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
        />
      </div>

      {/* Lista */}
      {filtered.map((inm) => (
        <Link key={inm.id} href={`/pisos/${inm.id}`} className="block">
          <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm overflow-hidden active:scale-[0.99] transition-transform mb-3">
            <div className="flex gap-3 p-3.5">
              {/* Thumbnail */}
              <div className="w-20 h-16 rounded-xl bg-gradient-to-br from-slate-200 to-slate-100 shrink-0 overflow-hidden flex items-center justify-center">
                {inm.fotos?.[0] ? (
                  <img src={inm.fotos[0].url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="h-6 w-6 text-slate-400" />
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] font-mono text-secondary">{inm.referencia}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${estadoColor[inm.estado] ?? "bg-slate-100 text-slate-600"}`}>
                    {ESTADO_INMUEBLE_LABELS[inm.estado] ?? inm.estado}
                  </span>
                </div>
                <p className="font-semibold text-sm text-foreground truncate">{inm.titulo}</p>
                <p className="text-xs text-secondary truncate">
                  {TIPO_INMUEBLE_LABELS[inm.tipo]} · {inm.localidad}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <p className="text-sm font-bold text-primary">{formatCurrency(Number(inm.precio))}</p>
                  {inm.habitaciones && (
                    <span className="flex items-center gap-0.5 text-[10px] text-secondary">
                      <BedDouble className="h-3 w-3" />{inm.habitaciones}
                    </span>
                  )}
                  {inm.metrosConstruidos && (
                    <span className="flex items-center gap-0.5 text-[10px] text-secondary">
                      <Ruler className="h-3 w-3" />{inm.metrosConstruidos}m²
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Link>
      ))}

      {filtered.length === 0 && (
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-sm py-10 text-center">
          <Building2 className="h-8 w-8 text-secondary/30 mx-auto mb-2" />
          <p className="text-sm text-secondary">
            {search ? "Sin resultados para esa búsqueda" : t("comercial.noProperties")}
          </p>
        </div>
      )}
    </div>
  );
}
