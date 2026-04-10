"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Eye, MessageSquare, Calendar, Heart,
  Globe, FileText, Download, CheckCircle, Clock, XCircle,
  AlertCircle, TrendingUp, Languages, MapPin, Home, Zap,
  ChevronRight, Star,
} from "lucide-react";

interface Foto { id: string; url: string; thumbnailUrl: string | null; esPrincipal: boolean; orden: number }
interface Visita { id: string; fecha: string; resultado: string; feedbackResumen: string | null }
interface Publicacion { id: string; portal: string; estado: string; ultimaSync: string | null; errorMsg: string | null }
interface Documento { id: string; tipo: string; nombre: string; url: string; createdAt: string }
interface Operacion { id: string; tipo: string; estado: string; precioFinal: number; fechaOferta: string | null; fechaArras: string | null; fechaCierre: string | null }
interface TimelineItem { fecha: string; tipo: string; descripcion: string }

interface InmuebleDetail {
  id: string;
  referencia: string;
  titulo: string;
  descripcion: string | null;
  direccion: string;
  localidad: string;
  precio: number;
  estado: string;
  tipo: string;
  operacion: string;
  caracteristicas: {
    habitaciones: number | null;
    banos: number | null;
    metrosConstruidos: number | null;
    metrosUtiles: number | null;
    planta: number | null;
    ascensor: boolean | null;
    garaje: boolean | null;
    trastero: boolean | null;
    piscina: boolean | null;
    terraza: boolean | null;
    certEnergetico: string | null;
  };
  estadisticas: {
    visitasTotal: number;
    visitasEsteMes: number;
    visitasInteresados: number;
    diasEnMercado: number;
  };
  fotos: Foto[];
  ultimasVisitas: Visita[];
  publicaciones: Publicacion[];
  documentos: Documento[];
  operaciones: Operacion[];
  timeline: TimelineItem[];
}

const ESTADOCOLOR: Record<string, { bg: string; text: string; dot: string }> = {
  EN_CAPTACION: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  ACTIVO: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  RESERVADO: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  VENDIDO: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  ALQUILADO: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  RETIRADO: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

const ESTADO_LABEL: Record<string, Record<string, string>> = {
  es: { EN_CAPTACION: "En captación", ACTIVO: "Activo", RESERVADO: "Reservado", VENDIDO: "Vendido", ALQUILADO: "Alquilado", RETIRADO: "Retirado" },
  en: { EN_CAPTACION: "In capture", ACTIVO: "Active", RESERVADO: "Reserved", VENDIDO: "Sold", ALQUILADO: "Rented", RETIRADO: "Withdrawn" },
};

const RESULTADO_CONFIG: Record<string, { icon: React.ElementType; color: string; label: Record<string, string> }> = {
  REALIZADA_INTERESADO: { icon: CheckCircle, color: "text-emerald-500", label: { es: "Interesado", en: "Interested" } },
  REALIZADA_NO_INTERESADO: { icon: XCircle, color: "text-red-400", label: { es: "No interesado", en: "Not interested" } },
  PENDIENTE: { icon: Clock, color: "text-blue-400", label: { es: "Programada", en: "Scheduled" } },
  CANCELADA: { icon: AlertCircle, color: "text-amber-400", label: { es: "Cancelada", en: "Cancelled" } },
  NO_SHOW: { icon: AlertCircle, color: "text-slate-400", label: { es: "No se presentó", en: "No show" } },
};

const PUB_ESTADO: Record<string, { color: string; label: Record<string, string> }> = {
  PUBLICADO: { color: "text-emerald-600 bg-emerald-50", label: { es: "Publicado", en: "Published" } },
  PENDIENTE: { color: "text-amber-600 bg-amber-50", label: { es: "Pendiente", en: "Pending" } },
  ERROR: { color: "text-red-600 bg-red-50", label: { es: "Error", en: "Error" } },
  RETIRADO: { color: "text-slate-500 bg-slate-100", label: { es: "Retirado", en: "Withdrawn" } },
};

const TIMELINE_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  visita: { icon: Calendar, color: "bg-blue-100 text-blue-600" },
  publicacion: { icon: Globe, color: "bg-purple-100 text-purple-600" },
  oferta: { icon: TrendingUp, color: "bg-amber-100 text-amber-600" },
  arras: { icon: Star, color: "bg-orange-100 text-orange-600" },
  cierre: { icon: CheckCircle, color: "bg-emerald-100 text-emerald-600" },
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(price);
}

function formatDate(d: string, locale: string) {
  return new Date(d).toLocaleDateString(locale === "en" ? "en-GB" : "es-ES", { day: "numeric", month: "short", year: "numeric" });
}

type Tab = "resumen" | "visitas" | "portales" | "documentos" | "timeline";

export default function InmuebleDetallePage() {
  const { token, inmuebleId } = useParams<{ token: string; inmuebleId: string }>();
  const [data, setData] = useState<InmuebleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<"es" | "en">("es");
  const [tab, setTab] = useState<Tab>("resumen");
  const [photoIdx, setPhotoIdx] = useState(0);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("i18nextLng") : null;
    if (saved === "en") setLang("en");
  }, []);

  useEffect(() => {
    fetch(`/api/portal-propietario/inmueble/${inmuebleId}?token=${token}`)
      .then((r) => r.json())
      .then((res) => { if (res.error) setError(res.error); else setData(res); })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [token, inmuebleId]);

  const toggleLang = () => {
    const next = lang === "es" ? "en" : "es";
    setLang(next);
    if (typeof window !== "undefined") localStorage.setItem("i18nextLng", next);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
            <span className="text-white text-sm font-bold">IF</span>
          </div>
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
          <Building2 className="h-10 w-10 text-slate-400 mx-auto mb-4" />
          <p className="text-sm text-slate-500">{error ?? "Inmueble no encontrado"}</p>
          <Link href={`/propietario/${token}`} className="mt-4 inline-block text-sm text-blue-600 font-semibold">
            ← {lang === "es" ? "Volver" : "Back"}
          </Link>
        </div>
      </div>
    );
  }

  const estadoColor = ESTADOCOLOR[data.estado] ?? ESTADOCOLOR.EN_CAPTACION;
  const estadoLabel = ESTADO_LABEL[lang]?.[data.estado] ?? data.estado;
  const mainFoto = data.fotos[photoIdx]?.url ?? null;

  const tabs: { key: Tab; label: Record<string, string>; count?: number }[] = [
    { key: "resumen", label: { es: "Resumen", en: "Overview" } },
    { key: "visitas", label: { es: "Visitas", en: "Visits" }, count: data.ultimasVisitas.length },
    { key: "portales", label: { es: "Portales", en: "Portals" }, count: data.publicaciones.length },
    { key: "documentos", label: { es: "Documentos", en: "Documents" }, count: data.documentos.length },
    { key: "timeline", label: { es: "Actividad", en: "Activity" }, count: data.timeline.length },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/propietario/${token}`} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">IF</span>
              </div>
              <span className="text-sm font-bold text-slate-800 hidden sm:block">InmoFlow</span>
            </div>
          </div>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === "es" ? "EN" : "ES"}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Foto principal */}
        <div className="relative rounded-2xl overflow-hidden bg-slate-200 h-56 sm:h-72">
          {mainFoto ? (
            <img src={mainFoto} alt={data.titulo} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="h-16 w-16 text-slate-300" />
            </div>
          )}
          {/* Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${estadoColor.bg} ${estadoColor.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${estadoColor.dot}`} />
              {estadoLabel}
            </span>
          </div>
          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
            <div>
              <p className="text-white/70 text-xs font-mono">{data.referencia}</p>
              <p className="text-white font-bold text-lg leading-tight">{data.titulo}</p>
            </div>
            <p className="text-white font-bold text-xl bg-black/50 px-3 py-1 rounded-xl backdrop-blur-sm">
              {formatPrice(data.precio)}
              {data.operacion === "ALQUILER" && <span className="text-sm font-normal">/mes</span>}
            </p>
          </div>
          {/* Mini thumbnails */}
          {data.fotos.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {data.fotos.slice(0, 6).map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => setPhotoIdx(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === photoIdx ? "bg-white scale-125" : "bg-white/50"}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Ubicación + características rápidas */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
            <span>{data.direccion} · {data.localidad}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.caracteristicas.habitaciones && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-lg text-xs font-medium text-slate-700">
                <Home className="h-3 w-3" /> {data.caracteristicas.habitaciones} {lang === "es" ? "hab." : "beds"}
              </span>
            )}
            {data.caracteristicas.banos && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-lg text-xs font-medium text-slate-700">
                🚿 {data.caracteristicas.banos} {lang === "es" ? "baños" : "baths"}
              </span>
            )}
            {data.caracteristicas.metrosConstruidos && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-lg text-xs font-medium text-slate-700">
                📐 {data.caracteristicas.metrosConstruidos} m²
              </span>
            )}
            {data.caracteristicas.planta !== null && data.caracteristicas.planta !== undefined && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-lg text-xs font-medium text-slate-700">
                🏢 {lang === "es" ? "Planta" : "Floor"} {data.caracteristicas.planta}
              </span>
            )}
            {data.caracteristicas.ascensor && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-lg text-xs font-medium text-slate-700">
                🛗 {lang === "es" ? "Ascensor" : "Lift"}
              </span>
            )}
            {data.caracteristicas.garaje && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-lg text-xs font-medium text-slate-700">
                🚗 {lang === "es" ? "Garaje" : "Garage"}
              </span>
            )}
            {data.caracteristicas.piscina && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-lg text-xs font-medium text-slate-700">
                🏊 {lang === "es" ? "Piscina" : "Pool"}
              </span>
            )}
            {data.caracteristicas.terraza && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-lg text-xs font-medium text-slate-700">
                ☀️ {lang === "es" ? "Terraza" : "Terrace"}
              </span>
            )}
            {data.caracteristicas.certEnergetico && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 rounded-lg text-xs font-medium text-slate-700">
                <Zap className="h-3 w-3" /> {data.caracteristicas.certEnergetico}
              </span>
            )}
          </div>
        </div>

        {/* 4 KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <Eye className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
            <p className="text-2xl font-bold text-slate-900">{data.estadisticas.visitasTotal}</p>
            <p className="text-xs text-slate-500 mt-0.5">{lang === "es" ? "Visitas totales" : "Total visits"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <MessageSquare className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
            <p className="text-2xl font-bold text-slate-900">{data.estadisticas.visitasEsteMes}</p>
            <p className="text-xs text-slate-500 mt-0.5">{lang === "es" ? "Este mes" : "This month"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <Heart className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
            <p className="text-2xl font-bold text-slate-900">{data.estadisticas.visitasInteresados}</p>
            <p className="text-xs text-slate-500 mt-0.5">{lang === "es" ? "Interesados" : "Interested"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
            <Calendar className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
            <p className="text-2xl font-bold text-slate-900">{data.estadisticas.diasEnMercado}</p>
            <p className="text-xs text-slate-500 mt-0.5">{lang === "es" ? "Días en venta" : "Days listed"}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Tab bar */}
          <div className="flex overflow-x-auto border-b border-slate-100 scrollbar-hide">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  tab === t.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label[lang]}
                {t.count !== undefined && t.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tab === t.key ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-5">
            {/* RESUMEN */}
            {tab === "resumen" && (
              <div className="space-y-4">
                {data.descripcion && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                      {lang === "es" ? "Descripción" : "Description"}
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed">{data.descripcion}</p>
                  </div>
                )}
                {data.operaciones.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                      {lang === "es" ? "Negociaciones activas" : "Active negotiations"}
                    </p>
                    <div className="space-y-2">
                      {data.operaciones.map((op) => (
                        <div key={op.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{formatPrice(op.precioFinal)}</p>
                            <p className="text-xs text-amber-700 font-medium">{op.estado.replace(/_/g, " ")}</p>
                          </div>
                          {op.fechaOferta && (
                            <p className="text-xs text-slate-500">{formatDate(op.fechaOferta, lang)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!data.descripcion && data.operaciones.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-4">
                    {lang === "es" ? "Sin información adicional" : "No additional info"}
                  </p>
                )}
              </div>
            )}

            {/* VISITAS */}
            {tab === "visitas" && (
              <div>
                {data.ultimasVisitas.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">{lang === "es" ? "Sin visitas registradas" : "No visits recorded"}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.ultimasVisitas.map((v) => {
                      const cfg = RESULTADO_CONFIG[v.resultado] ?? RESULTADO_CONFIG.PENDIENTE;
                      const Icon = cfg.icon;
                      return (
                        <div key={v.id} className="flex gap-3 p-3 rounded-xl bg-slate-50">
                          <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${cfg.color}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800">{cfg.label[lang]}</p>
                              <p className="text-xs text-slate-400 shrink-0">{formatDate(v.fecha, lang)}</p>
                            </div>
                            {v.feedbackResumen && (
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{v.feedbackResumen}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* PORTALES */}
            {tab === "portales" && (
              <div>
                {data.publicaciones.length === 0 ? (
                  <div className="text-center py-8">
                    <Globe className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">{lang === "es" ? "Sin publicaciones" : "No publications"}</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {data.publicaciones.map((p) => {
                      const cfg = PUB_ESTADO[p.estado] ?? PUB_ESTADO.PENDIENTE;
                      return (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                          <div className="flex items-center gap-3">
                            <Globe className="h-4 w-4 text-slate-400" />
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{p.portal.replace(/_/g, " ")}</p>
                              {p.ultimaSync && (
                                <p className="text-xs text-slate-400">{lang === "es" ? "Sync:" : "Sync:"} {formatDate(p.ultimaSync, lang)}</p>
                              )}
                            </div>
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                            {cfg.label[lang]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENTOS */}
            {tab === "documentos" && (
              <div>
                {data.documentos.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">{lang === "es" ? "Sin documentos" : "No documents"}</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {data.documentos.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-100 transition-colors group"
                      >
                        <FileText className="h-5 w-5 text-slate-400 group-hover:text-blue-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{doc.nombre}</p>
                          <p className="text-xs text-slate-400">{doc.tipo.replace(/_/g, " ")} · {formatDate(doc.createdAt, lang)}</p>
                        </div>
                        <Download className="h-4 w-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TIMELINE */}
            {tab === "timeline" && (
              <div>
                {data.timeline.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">{lang === "es" ? "Sin actividad registrada" : "No activity yet"}</p>
                  </div>
                ) : (
                  <div className="relative space-y-0">
                    {data.timeline.map((item, i) => {
                      const cfg = TIMELINE_ICON[item.tipo] ?? TIMELINE_ICON.visita;
                      const Icon = cfg.icon;
                      return (
                        <div key={i} className="flex gap-3 pb-4 last:pb-0 relative">
                          {i < data.timeline.length - 1 && (
                            <div className="absolute left-[18px] top-9 bottom-0 w-px bg-slate-100" />
                          )}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5">
                            <p className="text-sm text-slate-700 leading-snug">{item.descripcion}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{formatDate(item.fecha, lang)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 pb-4">
          InmoFlow CRM · {lang === "es" ? "Datos actualizados en tiempo real" : "Real-time data"}
        </p>
      </main>
    </div>
  );
}
