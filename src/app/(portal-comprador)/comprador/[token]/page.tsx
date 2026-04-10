"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Heart, MapPin, Home, Bed, Maximize2, Calendar, ChevronRight, CheckCircle2, Circle, ArrowRight, Globe } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface InmuebleCard {
  id: string;
  titulo: string;
  localidad: string;
  precio: number;
  habitaciones: number | null;
  metros: number | null;
  tipo: string;
  operacion: string;
  estado: string;
  fotoPrincipal: string | null;
  score: number;
}

interface OperacionTimeline {
  paso: string;
  fecha: string | null;
  completado: boolean;
}

interface Operacion {
  inmueble: {
    titulo: string;
    direccion: string;
    precio: number;
    fotoPrincipal: string | null;
  };
  estado: string;
  timeline: OperacionTimeline[];
}

interface Cita {
  id: string;
  fecha: string;
  inmueble: string;
  direccion: string;
  localidad: string;
}

interface DatosPortal {
  comprador: { nombre: string; email: string | null; idioma: string };
  inmuebles_matching: InmuebleCard[];
  favoritos: string[];
  operacion: Operacion | null;
  citas: Cita[];
}

// ─── i18n simple ─────────────────────────────────────────────────────────────

const t: Record<string, Record<string, string>> = {
  es: {
    bienvenida: "Hola {{nombre}}, estos inmuebles encajan con lo que buscas",
    matching: "Inmuebles para ti",
    operacion: "Estado de tu compra",
    citas: "Próximas visitas",
    noCitas: "No tienes visitas programadas",
    noMatching: "Aún no hay inmuebles que encajen con tu búsqueda",
    favoritos: "Favoritos",
    ver: "Ver detalle",
    compatible: "compatible",
    paso: "Paso",
    oferta: "Oferta",
    arras: "Arras",
    notaria: "Notaría",
    llaves: "Entrega llaves",
    venta: "Venta",
    alquiler: "Alquiler",
    mes: "/mes",
    lang: "EN",
  },
  en: {
    bienvenida: "Hello {{nombre}}, these properties match what you're looking for",
    matching: "Properties for you",
    operacion: "Your purchase status",
    citas: "Upcoming visits",
    noCitas: "No visits scheduled",
    noMatching: "No properties match your search yet",
    favoritos: "Favorites",
    ver: "View detail",
    compatible: "match",
    paso: "Step",
    oferta: "Offer",
    arras: "Deposit",
    notaria: "Notary",
    llaves: "Key handover",
    venta: "Sale",
    alquiler: "Rental",
    mes: "/month",
    lang: "ES",
  },
};

function formatPrice(price: number, operacion: string, lang: string) {
  const formatted = new Intl.NumberFormat(lang === "es" ? "es-ES" : "en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(price);
  return operacion === "ALQUILER" ? `${formatted}${t[lang].mes}` : formatted;
}

function formatDate(d: string, lang: string) {
  return new Date(d).toLocaleDateString(lang === "es" ? "es-ES" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PortalCompradorPage() {
  const params = useParams();
  const token = params.token as string;

  const [lang, setLang] = useState<"es" | "en">("es");
  const [datos, setDatos] = useState<DatosPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("portal_lang") : null;
    if (stored === "en" || stored === "es") setLang(stored);
  }, []);

  useEffect(() => {
    fetch(`/api/portal-comprador/datos?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setDatos(data);
          setFavoritos(data.favoritos ?? []);
          if (data.comprador?.idioma && (data.comprador.idioma === "en" || data.comprador.idioma === "es")) {
            const stored = localStorage.getItem("portal_lang");
            if (!stored) setLang(data.comprador.idioma as "es" | "en");
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Error cargando datos");
        setLoading(false);
      });
  }, [token]);

  const toggleLang = () => {
    const next = lang === "es" ? "en" : "es";
    setLang(next);
    localStorage.setItem("portal_lang", next);
  };

  const toggleFav = async (inmuebleId: string) => {
    if (toggling) return;
    setToggling(inmuebleId);
    const isFav = favoritos.includes(inmuebleId);
    setFavoritos(isFav ? favoritos.filter((id) => id !== inmuebleId) : [...favoritos, inmuebleId]);
    try {
      await fetch(`/api/portal-comprador/favorito?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inmuebleId }),
      });
    } catch {
      // revert on error
      setFavoritos(isFav ? [...favoritos, inmuebleId] : favoritos.filter((id) => id !== inmuebleId));
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error || !datos) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm p-8">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Acceso no válido</h1>
          <p className="text-sm text-slate-500">
            {error === "Acceso revocado o expirado"
              ? "Este enlace ha expirado o ha sido revocado. Contacta con tu agente para obtener uno nuevo."
              : "Este enlace no es válido. Contacta con tu agente inmobiliario."}
          </p>
        </div>
      </div>
    );
  }

  const { comprador, inmuebles_matching, operacion, citas } = datos;
  const tr = t[lang];

  // Separate favoritos from all matching
  const favItems = inmuebles_matching.filter((i) => favoritos.includes(i.id));
  const restItems = inmuebles_matching.filter((i) => !favoritos.includes(i.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-600" />
            <span className="font-bold text-slate-800 text-sm">InmoFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">{comprador.nombre}</span>
            <button
              onClick={toggleLang}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            >
              <Globe className="h-3 w-3" />
              {tr.lang}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {tr.bienvenida.replace("{{nombre}}", comprador.nombre.split(" ")[0])}
          </h1>
        </div>

        {/* Operacion pipeline */}
        {operacion && (
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">{tr.operacion}</h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {operacion.inmueble.fotoPrincipal && (
                <div className="h-40 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={operacion.inmueble.fotoPrincipal}
                    alt={operacion.inmueble.titulo}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <p className="text-white font-bold text-lg">{operacion.inmueble.titulo}</p>
                    <p className="text-white/80 text-sm">{operacion.inmueble.direccion}</p>
                  </div>
                </div>
              )}
              <div className="p-5">
                {!operacion.inmueble.fotoPrincipal && (
                  <div className="mb-3">
                    <p className="font-bold text-slate-800">{operacion.inmueble.titulo}</p>
                    <p className="text-sm text-slate-500">{operacion.inmueble.direccion}</p>
                  </div>
                )}
                {/* Pipeline steps */}
                <div className="flex items-center gap-1">
                  {operacion.timeline.map((paso, idx) => {
                    const label = [tr.oferta, tr.arras, tr.notaria, tr.llaves][idx];
                    return (
                      <div key={paso.paso} className="flex items-center flex-1 min-w-0">
                        <div className="flex flex-col items-center flex-1 min-w-0">
                          {paso.completado ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                          ) : (
                            <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                          )}
                          <span className={`text-[10px] font-semibold mt-1 text-center truncate w-full ${paso.completado ? "text-emerald-600" : "text-slate-400"}`}>
                            {label}
                          </span>
                          {paso.fecha && (
                            <span className="text-[9px] text-slate-400">{formatDate(paso.fecha, lang)}</span>
                          )}
                        </div>
                        {idx < operacion.timeline.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-slate-300 shrink-0 mb-3" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Favoritos */}
        {favItems.length > 0 && (
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">
              {tr.favoritos} ({favItems.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {favItems.map((inm) => (
                <InmuebleCard
                  key={inm.id}
                  inm={inm}
                  token={token}
                  isFav={true}
                  toggling={toggling === inm.id}
                  onToggleFav={toggleFav}
                  lang={lang}
                  tr={tr}
                />
              ))}
            </div>
          </section>
        )}

        {/* Matching inmuebles */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">{tr.matching}</h2>
          {restItems.length === 0 && favItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
              <Home className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">{tr.noMatching}</p>
            </div>
          ) : restItems.length === 0 ? null : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {restItems.map((inm) => (
                <InmuebleCard
                  key={inm.id}
                  inm={inm}
                  token={token}
                  isFav={favoritos.includes(inm.id)}
                  toggling={toggling === inm.id}
                  onToggleFav={toggleFav}
                  lang={lang}
                  tr={tr}
                />
              ))}
            </div>
          )}
        </section>

        {/* Citas */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">{tr.citas}</h2>
          {citas.length === 0 ? (
            <p className="text-sm text-slate-400">{tr.noCitas}</p>
          ) : (
            <div className="space-y-3">
              {citas.map((cita) => (
                <div key={cita.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                  <div className="p-2.5 rounded-xl bg-blue-50">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{cita.inmueble}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 truncate">{cita.direccion}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-800">{formatDate(cita.fecha, lang)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ─── InmuebleCard subcomponent ────────────────────────────────────────────────

function InmuebleCard({
  inm,
  token,
  isFav,
  toggling,
  onToggleFav,
  lang,
  tr,
}: {
  inm: InmuebleCard;
  token: string;
  isFav: boolean;
  toggling: boolean;
  onToggleFav: (id: string) => void;
  lang: string;
  tr: Record<string, string>;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Photo */}
      <div className="relative h-44 bg-slate-100">
        {inm.fotoPrincipal ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={inm.fotoPrincipal} alt={inm.titulo} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="h-10 w-10 text-slate-300" />
          </div>
        )}
        {/* Score badge */}
        <div className="absolute top-2 left-2">
          <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {inm.score}% {tr.compatible}
          </span>
        </div>
        {/* Fav button */}
        <button
          onClick={() => onToggleFav(inm.id)}
          disabled={toggling}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 hover:bg-white shadow-sm transition-colors cursor-pointer"
        >
          <Heart
            className={`h-4 w-4 transition-colors ${isFav ? "fill-red-500 text-red-500" : "text-slate-400"}`}
          />
        </button>
      </div>

      {/* Info */}
      <div className="p-4">
        <p className="font-bold text-slate-800 text-sm leading-tight mb-1 line-clamp-1">{inm.titulo}</p>
        <div className="flex items-center gap-1 mb-2">
          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
          <span className="text-xs text-slate-500">{inm.localidad}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 mb-3">
          {inm.habitaciones && (
            <span className="flex items-center gap-1">
              <Bed className="h-3 w-3" />{inm.habitaciones}
            </span>
          )}
          {inm.metros && (
            <span className="flex items-center gap-1">
              <Maximize2 className="h-3 w-3" />{inm.metros} m²
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="font-bold text-blue-700 text-base">
            {formatPrice(inm.precio, inm.operacion, lang)}
          </p>
          <a
            href={`/comprador/${token}/inmueble/${inm.id}`}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
          >
            {tr.ver} <ChevronRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
