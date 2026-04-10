"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Building2, Eye, MessageSquare, Calendar, ChevronRight,
  Globe, Languages, ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface Inmueble {
  id: string;
  referencia: string;
  titulo: string;
  direccion: string;
  localidad: string;
  precio: number;
  estado: string;
  fotoPrincipal: string | null;
  estadisticas: {
    visitasTotal: number;
    visitasEsteMes: number;
    diasEnMercado: number;
  };
}

interface PortalData {
  propietario: { nombre: string; email: string | null; telefono: string | null };
  inmuebles: Inmueble[];
}

const estadoColors: Record<string, { bg: string; text: string; dot: string }> = {
  EN_CAPTACION: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  ACTIVO: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  RESERVADO: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  VENDIDO: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  ALQUILADO: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  RETIRADO: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

const estadoLabels: Record<string, Record<string, string>> = {
  es: {
    EN_CAPTACION: "En captación",
    ACTIVO: "Activo",
    RESERVADO: "Reservado",
    VENDIDO: "Vendido",
    ALQUILADO: "Alquilado",
    RETIRADO: "Retirado",
  },
  en: {
    EN_CAPTACION: "In capture",
    ACTIVO: "Active",
    RESERVADO: "Reserved",
    VENDIDO: "Sold",
    ALQUILADO: "Rented",
    RETIRADO: "Withdrawn",
  },
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

export default function PortalPropietarioDashboard() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    fetch(`/api/portal-propietario/datos?token=${token}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.error) setError(res.error);
        else setData(res);
      })
      .catch(() => setError("Error de conexión"))
      .finally(() => setLoading(false));
  }, [token]);

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
          <ShieldCheck className="h-10 w-10 text-slate-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Enlace no válido</h2>
          <p className="text-sm text-slate-500">
            {error ?? "Este enlace ha expirado o no es válido. Contacta con tu agente para obtener uno nuevo."}
          </p>
        </div>
      </div>
    );
  }

  const lang = i18n.language === "en" ? "en" : "es";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
              <span className="text-white text-xs font-bold">IF</span>
            </div>
            <span className="text-sm font-bold text-slate-800">InmoFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => i18n.changeLanguage(lang === "es" ? "en" : "es")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Languages className="h-3.5 w-3.5" />
              {lang === "es" ? "EN" : "ES"}
            </button>
            <span className="text-sm text-slate-600 hidden sm:block">
              {data.propietario.nombre}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Saludo */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === "es"
              ? `Hola ${data.propietario.nombre.split(" ")[0]},`
              : `Hello ${data.propietario.nombre.split(" ")[0]},`}
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            {lang === "es"
              ? "Aquí tienes el estado de tus inmuebles en tiempo real."
              : "Here is the real-time status of your properties."}
          </p>
        </div>

        {/* Inmuebles */}
        {data.inmuebles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {lang === "es" ? "No hay inmuebles asignados" : "No properties assigned"}
            </p>
          </div>
        ) : (
          data.inmuebles.map((inm) => {
            const colors = estadoColors[inm.estado] ?? estadoColors.EN_CAPTACION;
            const label = estadoLabels[lang]?.[inm.estado] ?? inm.estado;
            return (
              <div
                key={inm.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Foto */}
                <div className="relative h-48 bg-slate-100">
                  {inm.fotoPrincipal ? (
                    <img
                      src={inm.fotoPrincipal}
                      alt={inm.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="h-12 w-12 text-slate-300" />
                    </div>
                  )}
                  {/* Estado badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                      {label}
                    </span>
                  </div>
                  {/* Precio */}
                  <div className="absolute bottom-3 right-3 bg-black/60 text-white px-3 py-1 rounded-xl text-sm font-bold backdrop-blur-sm">
                    {formatPrice(inm.precio)}
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-xs text-slate-400 font-mono mb-0.5">{inm.referencia}</p>
                  <h2 className="text-base font-bold text-slate-900 mb-0.5">{inm.titulo}</h2>
                  <p className="text-sm text-slate-500 mb-4">{inm.direccion} · {inm.localidad}</p>

                  {/* 3 mini KPIs */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <Eye className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                      <p className="text-xl font-bold text-slate-900">{inm.estadisticas.visitasTotal}</p>
                      <p className="text-[10px] text-slate-500">
                        {lang === "es" ? "Visitas" : "Visits"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <MessageSquare className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                      <p className="text-xl font-bold text-slate-900">{inm.estadisticas.visitasEsteMes}</p>
                      <p className="text-[10px] text-slate-500">
                        {lang === "es" ? "Este mes" : "This month"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <Calendar className="h-4 w-4 text-slate-400 mx-auto mb-1" />
                      <p className="text-xl font-bold text-slate-900">{inm.estadisticas.diasEnMercado}</p>
                      <p className="text-[10px] text-slate-500">
                        {lang === "es" ? "Días en venta" : "Days listed"}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={`/propietario/${token}/${inm.id}`}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
                  >
                    {lang === "es" ? "Ver detalle completo" : "View full detail"}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })
        )}

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 pb-4">
          InmoFlow CRM · {lang === "es" ? "Datos actualizados en tiempo real" : "Real-time data"}
        </p>
      </main>
    </div>
  );
}
