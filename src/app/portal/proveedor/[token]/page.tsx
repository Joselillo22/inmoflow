"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Wrench, CheckCircle, Clock, Upload, FileText, AlertCircle,
  Loader2, ImageIcon,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";

interface Solicitud {
  id: string;
  respondida: boolean;
  importe: number | null;
  detallePresupuesto: string | null;
  documentoUrl: string | null;
  enviadaAt: string | null;
  trabajo: {
    id: string;
    referencia: string;
    titulo: string;
    descripcion: string | null;
    categoria: string;
    fechaLimite: string | null;
    adjuntos: { id: string; nombre: string; url: string; tipo: string }[];
  };
}

interface PortalData {
  proveedor: { id: string; nombre: string; contacto: string | null };
  solicitudes: Solicitud[];
}

const CATEGORIA_LABELS: Record<string, string> = {
  FONTANERIA: "Fontanería", ELECTRICIDAD: "Electricidad", PINTURA: "Pintura",
  ALBANILERIA: "Albañilería", CARPINTERIA: "Carpintería", CERRAJERIA: "Cerrajería",
  CLIMATIZACION: "Climatización", LIMPIEZA: "Limpieza", MUDANZAS: "Mudanzas",
  CRISTALERIA: "Cristalería", REFORMAS_INTEGRALES: "Reformas integrales",
  JARDINERIA: "Jardinería", OTRO: "Otro",
};

export default function PortalProveedorPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [formImporte, setFormImporte] = useState("");
  const [formDetalle, setFormDetalle] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/portal/proveedor/${token}`)
      .then((r) => { if (!r.ok) throw new Error("invalid"); return r.json(); })
      .then((d) => setData(d))
      .catch(() => setError("Este enlace no es válido o ha expirado."))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(solicitudId: string) {
    if (!formImporte || parseFloat(formImporte) <= 0) return;
    setSubmitting(true);
    const fd = new FormData();
    fd.append("solicitudId", solicitudId);
    fd.append("importe", formImporte);
    fd.append("detalle", formDetalle);
    if (formFile) fd.append("documento", formFile);

    try {
      const res = await fetch(`/api/portal/proveedor/${token}`, { method: "POST", body: fd });
      if (res.ok) {
        setEnviados((prev) => new Set(prev).add(solicitudId));
        setEnviandoId(null);
        setFormImporte("");
        setFormDetalle("");
        setFormFile(null);
      } else {
        const err = await res.json();
        alert(err.error ?? "Error al enviar");
      }
    } catch {
      alert("Error de conexión");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-slate-800">Enlace no válido</p>
          <p className="text-sm text-slate-500 mt-1">{error || "Este enlace ha expirado o no existe."}</p>
        </div>
      </div>
    );
  }

  const pendientes = data.solicitudes.filter((s) => !s.respondida && !enviados.has(s.id));
  const respondidas = data.solicitudes.filter((s) => s.respondida || enviados.has(s.id));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white text-sm font-bold">IF</span>
          </div>
          <div>
            <p className="text-base font-bold text-slate-800">InmoFlow</p>
            <p className="text-xs text-slate-500">Portal del proveedor</p>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Saludo */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-lg font-bold text-slate-800">
            Hola, {data.proveedor.contacto ?? data.proveedor.nombre}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">
            {pendientes.length > 0
              ? `Tienes ${pendientes.length} solicitud${pendientes.length !== 1 ? "es" : ""} de presupuesto pendiente${pendientes.length !== 1 ? "s" : ""}.`
              : "No tienes solicitudes pendientes."}
          </p>
        </div>

        {/* Pendientes */}
        {pendientes.map((sol) => {
          const isExpanded = enviandoId === sol.id;
          const diasRestantes = sol.trabajo.fechaLimite
            ? Math.ceil((new Date(sol.trabajo.fechaLimite).getTime() - Date.now()) / 86400000)
            : null;

          return (
            <div key={sol.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4">
                {/* Trabajo info */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-xs font-mono text-slate-400">{sol.trabajo.referencia}</span>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{sol.trabajo.titulo}</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
                    {CATEGORIA_LABELS[sol.trabajo.categoria] ?? sol.trabajo.categoria}
                  </span>
                </div>

                {sol.trabajo.descripcion && (
                  <p className="text-sm text-slate-600 mb-3">{sol.trabajo.descripcion}</p>
                )}

                {diasRestantes !== null && (
                  <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mb-3 ${
                    diasRestantes <= 2 ? "bg-red-100 text-red-700" : diasRestantes <= 5 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    <Clock className="h-3 w-3" />
                    {diasRestantes > 0 ? `${diasRestantes} día${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""}` : "Fecha límite pasada"}
                  </div>
                )}

                {/* Fotos adjuntas del trabajo */}
                {sol.trabajo.adjuntos.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1.5">Fotos del trabajo:</p>
                    <div className="flex gap-2 overflow-x-auto">
                      {sol.trabajo.adjuntos.map((adj) => (
                        <a key={adj.id} href={adj.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          {adj.tipo.startsWith("image/") ? (
                            <img src={adj.url} alt={adj.nombre} className="w-20 h-20 rounded-lg object-cover border border-slate-200" />
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-1">
                              <FileText className="h-5 w-5 text-slate-400" />
                              <span className="text-[9px] text-slate-500">PDF</span>
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botón expandir formulario */}
                {!isExpanded ? (
                  <button
                    onClick={() => { setEnviandoId(sol.id); setFormImporte(""); setFormDetalle(""); setFormFile(null); }}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Wrench className="h-4 w-4" /> Enviar mi presupuesto
                  </button>
                ) : (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Importe total (€) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formImporte}
                        onChange={(e) => setFormImporte(e.target.value)}
                        placeholder="Ej: 1850.00"
                        className="w-full h-14 border-2 border-slate-300 rounded-xl px-4 text-lg font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Desglose / notas</label>
                      <textarea
                        value={formDetalle}
                        onChange={(e) => setFormDetalle(e.target.value)}
                        rows={3}
                        placeholder="Ej: Material 800€ + mano de obra 1050€. Plazo 5 días laborables. Garantía 2 años."
                        className="w-full border-2 border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">Adjuntar presupuesto (PDF o imagen)</label>
                      {formFile ? (
                        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <FileText className="h-5 w-5 text-emerald-600" />
                          <span className="text-sm text-emerald-700 font-medium flex-1 truncate">{formFile.name}</span>
                          <button onClick={() => setFormFile(null)} className="text-xs text-red-500 font-semibold cursor-pointer">Quitar</button>
                        </div>
                      ) : (
                        <label className="flex items-center justify-center gap-2 h-12 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all">
                          <Upload className="h-4 w-4" /> Seleccionar archivo
                          <input type="file" accept=".pdf,image/*" className="hidden" onChange={(e) => e.target.files?.[0] && setFormFile(e.target.files[0])} />
                        </label>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEnviandoId(null)}
                        className="flex-1 h-12 border border-slate-300 rounded-xl text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-50 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleSubmit(sol.id)}
                        disabled={submitting || !formImporte}
                        className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                      >
                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        {submitting ? "Enviando..." : "Enviar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Ya respondidos */}
        {respondidas.length > 0 && (
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Presupuestos enviados</p>
            {respondidas.map((sol) => (
              <div key={sol.id} className="bg-white rounded-2xl border border-emerald-200 p-4 mb-2">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-bold text-slate-800">{sol.trabajo.titulo}</span>
                </div>
                <p className="text-lg font-bold text-emerald-700 ml-6">
                  {sol.importe ? formatCurrency(Number(sol.importe)) : enviados.has(sol.id) ? "Enviado" : "—"}
                </p>
                {sol.detallePresupuesto && <p className="text-xs text-slate-500 ml-6 mt-0.5">{sol.detallePresupuesto}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Vacío */}
        {pendientes.length === 0 && respondidas.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="h-10 w-10 text-emerald-300 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-800">Todo al día</p>
            <p className="text-sm text-slate-500">No tienes solicitudes de presupuesto pendientes.</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[10px] text-slate-400 pt-4 pb-8">
          InmoFlow CRM · Portal del proveedor
        </p>
      </div>
    </div>
  );
}
