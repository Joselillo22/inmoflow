"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft, MapPin, Bed, Bath, Maximize2, Home, Wifi, Car, Waves,
  TreePine, Wind, Flame, Globe, Calculator, ChevronLeft, ChevronRight,
  ExternalLink, MessageCircle,
} from "lucide-react";
import { MapaInmueble } from "@/components/shared/MapaInmuebleDynamic";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Caracteristicas {
  habitaciones: number | null;
  banos: number | null;
  metrosConstruidos: number | null;
  metrosUtiles: number | null;
  planta: string | null;
  ascensor: boolean;
  garaje: boolean;
  trastero: boolean;
  piscina: boolean;
  terraza: boolean;
  aireAcondicionado: boolean;
  calefaccion: boolean;
}

interface Legal {
  certEnergetico: string | null;
  anoConst: number | null;
  ibiAnual: number | null;
  comunidadMes: number | null;
}

interface Foto {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  esPrincipal: boolean;
}

interface InmuebleDetalle {
  id: string;
  referencia: string;
  titulo: string;
  descripcion: string | null;
  direccion: string;
  localidad: string;
  provincia: string | null;
  coordenadas: { lat: number; lng: number } | null;
  precio: number;
  estado: string;
  tipo: string;
  operacion: string;
  caracteristicas: Caracteristicas;
  legal: Legal;
  fotos: Foto[];
  idioma: string;
}

// ─── i18n ────────────────────────────────────────────────────────────────────

const tr: Record<string, Record<string, string>> = {
  es: {
    volver: "Volver",
    venta: "Venta",
    alquiler: "Alquiler",
    mes: "/mes",
    caracteristicas: "Características",
    descripcion: "Descripción",
    calculadora: "Calculadora fiscal estimada",
    calcTitle: "Coste estimado de la compra",
    precioVivienda: "Precio de la vivienda",
    tipoVivienda: "Tipo de vivienda",
    nueva: "Nueva (IVA 10%)",
    usada: "Segunda mano (ITP ~10%)",
    impuestos: "Impuestos",
    notaria: "Notaría + Registro",
    total: "Coste total estimado",
    verMapa: "Ver en mapa",
    solicitarVisita: "Solicitar visita",
    ibi: "IBI anual",
    comunidad: "Comunidad",
    construido: "Construido",
    util: "Útil",
    planta: "Planta",
    ano: "Año construcción",
    certEnergetico: "Cert. energético",
    extras: "Extras",
    lang: "EN",
  },
  en: {
    volver: "Back",
    venta: "Sale",
    alquiler: "Rental",
    mes: "/month",
    caracteristicas: "Features",
    descripcion: "Description",
    calculadora: "Estimated fiscal costs",
    calcTitle: "Estimated purchase costs",
    precioVivienda: "Property price",
    tipoVivienda: "Property type",
    nueva: "New (VAT 10%)",
    usada: "Second-hand (ITP ~10%)",
    impuestos: "Taxes",
    notaria: "Notary + Registry",
    total: "Estimated total cost",
    verMapa: "View on map",
    solicitarVisita: "Request visit",
    ibi: "Annual IBI",
    comunidad: "Community fees",
    construido: "Built",
    util: "Useful",
    planta: "Floor",
    ano: "Year built",
    certEnergetico: "Energy cert.",
    extras: "Extras",
    lang: "ES",
  },
};

function formatPrice(price: number, operacion: string, lang: string) {
  const fmt = new Intl.NumberFormat(lang === "es" ? "es-ES" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
  return operacion === "ALQUILER" ? `${fmt}${tr[lang].mes}` : fmt;
}

function formatCurrency(n: number, lang: string) {
  return new Intl.NumberFormat(lang === "es" ? "es-ES" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Fiscal Calculator ────────────────────────────────────────────────────────

function FiscalCalculator({ precio, lang }: { precio: number; lang: string }) {
  const [tipo, setTipo] = useState<"usada" | "nueva">("usada");
  const [precioInput, setPrecioInput] = useState(precio);
  const l = tr[lang];

  const itpOiva = tipo === "nueva" ? precioInput * 0.10 : precioInput * 0.10;
  const ajd = tipo === "nueva" ? precioInput * 0.015 : 0;
  const notaria = Math.min(Math.max(precioInput * 0.005, 800), 2500);
  const registro = Math.min(Math.max(precioInput * 0.003, 400), 1500);
  const total = precioInput + itpOiva + ajd + notaria + registro;

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4">
      <h3 className="font-bold text-slate-800">{l.calculadora}</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">{l.precioVivienda}</label>
          <input
            type="number"
            value={precioInput}
            onChange={(e) => setPrecioInput(Number(e.target.value))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 font-medium block mb-1">{l.tipoVivienda}</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as "usada" | "nueva")}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="usada">{l.usada}</option>
            <option value="nueva">{l.nueva}</option>
          </select>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">{tipo === "nueva" ? "IVA (10%)" : "ITP (10%)"}</span>
          <span className="font-semibold">{formatCurrency(itpOiva, lang)}</span>
        </div>
        {tipo === "nueva" && (
          <div className="flex justify-between">
            <span className="text-slate-600">AJD (1.5%)</span>
            <span className="font-semibold">{formatCurrency(ajd, lang)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-600">{l.notaria}</span>
          <span className="font-semibold">≈ {formatCurrency(notaria + registro, lang)}</span>
        </div>
        <div className="border-t border-slate-200 pt-2 flex justify-between">
          <span className="font-bold text-slate-800">{l.total}</span>
          <span className="font-bold text-blue-700 text-base">{formatCurrency(total, lang)}</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-400">* Estimación orientativa. ITP varía por comunidad autónoma.</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function InmuebleDetallePage() {
  const params = useParams();
  const token = params.token as string;
  const id = params.id as string;

  const [lang, setLang] = useState<"es" | "en">("es");
  const [inm, setInm] = useState<InmuebleDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("portal_lang") : null;
    if (stored === "en" || stored === "es") setLang(stored);
  }, []);

  useEffect(() => {
    fetch(`/api/portal-comprador/inmueble/${id}?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setInm(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Error cargando inmueble");
        setLoading(false);
      });
  }, [token, id]);

  const toggleLang = () => {
    const next = lang === "es" ? "en" : "es";
    setLang(next);
    localStorage.setItem("portal_lang", next);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !inm) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500">Inmueble no disponible</p>
          <a href={`/comprador/${token}`} className="text-blue-600 text-sm mt-2 block">← Volver</a>
        </div>
      </div>
    );
  }

  const l = tr[lang];
  const foto = inm.fotos[photoIdx];
  const mapsUrl = inm.coordenadas
    ? `https://www.google.com/maps?q=${inm.coordenadas.lat},${inm.coordenadas.lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(`${inm.direccion}, ${inm.localidad}`)}`;

  const extras = [
    { key: "ascensor", label: "Ascensor / Lift", Icon: Home },
    { key: "garaje", label: "Garaje / Garage", Icon: Car },
    { key: "trastero", label: "Trastero / Storage", Icon: Home },
    { key: "piscina", label: "Piscina / Pool", Icon: Waves },
    { key: "terraza", label: "Terraza / Terrace", Icon: TreePine },
    { key: "aireAcondicionado", label: "A/C", Icon: Wind },
    { key: "calefaccion", label: "Calefacción / Heating", Icon: Flame },
    { key: "wifi", label: "Internet", Icon: Wifi },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <a
            href={`/comprador/${token}`}
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {l.volver}
          </a>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
          >
            <Globe className="h-3 w-3" />
            {l.lang}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Photo gallery */}
        {inm.fotos.length > 0 && (
          <div className="relative rounded-2xl overflow-hidden bg-slate-900" style={{ height: 320 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.url} alt={inm.titulo} className="w-full h-full object-cover" />
            {inm.fotos.length > 1 && (
              <>
                <button
                  onClick={() => setPhotoIdx((i) => (i - 1 + inm.fotos.length) % inm.fotos.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPhotoIdx((i) => (i + 1) % inm.fotos.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                {/* Dots */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {inm.fotos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-colors cursor-pointer ${i === photoIdx ? "bg-white" : "bg-white/40"}`}
                    />
                  ))}
                </div>
                <span className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                  {photoIdx + 1}/{inm.fotos.length}
                </span>
              </>
            )}
          </div>
        )}

        {/* Header info */}
        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">{inm.titulo}</h1>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="text-slate-500 text-sm">{inm.direccion}, {inm.localidad}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-blue-700">{formatPrice(inm.precio, inm.operacion, lang)}</p>
              <span className="text-xs text-slate-400 font-medium">Ref. {inm.referencia}</span>
            </div>
          </div>

          {/* Quick pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            {inm.caracteristicas.habitaciones && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
                <Bed className="h-3 w-3" /> {inm.caracteristicas.habitaciones} hab.
              </span>
            )}
            {inm.caracteristicas.banos && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
                <Bath className="h-3 w-3" /> {inm.caracteristicas.banos} baños
              </span>
            )}
            {inm.caracteristicas.metrosConstruidos && (
              <span className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
                <Maximize2 className="h-3 w-3" /> {inm.caracteristicas.metrosConstruidos} m²
              </span>
            )}
            {inm.caracteristicas.planta && (
              <span className="px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-700">
                {l.planta} {inm.caracteristicas.planta}
              </span>
            )}
            {inm.legal.certEnergetico && (
              <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                {l.certEnergetico} {inm.legal.certEnergetico}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {inm.descripcion && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-800 mb-3">{l.descripcion}</h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{inm.descripcion}</p>
          </div>
        )}

        {/* Extras */}
        {(inm.caracteristicas.ascensor || inm.caracteristicas.garaje || inm.caracteristicas.trastero ||
          inm.caracteristicas.piscina || inm.caracteristicas.terraza || inm.caracteristicas.aireAcondicionado ||
          inm.caracteristicas.calefaccion) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-800 mb-3">{l.extras}</h2>
            <div className="flex flex-wrap gap-2">
              {extras.map(({ key, label, Icon }) => {
                const val = inm.caracteristicas[key as keyof Caracteristicas];
                if (!val) return null;
                return (
                  <span key={key} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold">
                    <Icon className="h-3 w-3" /> {label}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Legal / costs */}
        {(inm.legal.ibiAnual || inm.legal.comunidadMes || inm.legal.anoConst) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="font-bold text-slate-800 mb-3">{l.caracteristicas}</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {inm.legal.anoConst && (
                <div><span className="text-slate-500">{l.ano}</span><p className="font-semibold">{inm.legal.anoConst}</p></div>
              )}
              {inm.legal.ibiAnual && (
                <div><span className="text-slate-500">{l.ibi}</span><p className="font-semibold">{formatCurrency(inm.legal.ibiAnual, lang)}</p></div>
              )}
              {inm.legal.comunidadMes && (
                <div><span className="text-slate-500">{l.comunidad}</span><p className="font-semibold">{formatCurrency(inm.legal.comunidadMes, lang)}/mes</p></div>
              )}
              {inm.caracteristicas.metrosUtiles && (
                <div><span className="text-slate-500">{l.util}</span><p className="font-semibold">{inm.caracteristicas.metrosUtiles} m²</p></div>
              )}
            </div>
          </div>
        )}

        {/* Fiscal Calculator (only for sale) */}
        {inm.operacion === "VENTA" && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-slate-500" />
            </div>
            <FiscalCalculator precio={inm.precio} lang={lang} />
          </div>
        )}

        {/* Mapa */}
        <div>
          <MapaInmueble
            latitud={inm.coordenadas?.lat}
            longitud={inm.coordenadas?.lng}
            direccion={`${inm.direccion}, ${inm.localidad}`}
            titulo={inm.titulo}
            precio={inm.precio}
            altura={320}
            modo="full"
          />
        </div>

        {/* CTA buttons */}
        <div className="grid grid-cols-2 gap-3 pb-6">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            {l.verMapa}
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Hola, me interesa el inmueble "${inm.titulo}" (Ref. ${inm.referencia}). Me gustaría solicitar una visita.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold text-white transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            {l.solicitarVisita}
          </a>
        </div>
      </main>
    </div>
  );
}
