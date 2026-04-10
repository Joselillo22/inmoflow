"use client";

import { useState } from "react";
import { Link2, Copy, Trash2, RefreshCw, Check, ExternalLink } from "lucide-react";

interface Acceso {
  id: string;
  token: string;
  expiresAt: string;
  ultimoAcceso: string | null;
  activo: boolean;
  createdAt: string;
}

interface Props {
  leadId: string;
  leadNombre: string;
}

export function LeadPortalButton({ leadId, leadNombre }: Props) {
  const [open, setOpen] = useState(false);
  const [accesos, setAccesos] = useState<Acceso[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "";

  const load = async () => {
    setLoading(true);
    const res = await fetch(`/api/leads/${leadId}/generar-acceso`);
    const json = await res.json();
    setAccesos(json.data ?? []);
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(true);
    load();
  };

  const generate = async () => {
    setGenerating(true);
    const res = await fetch(`/api/leads/${leadId}/generar-acceso`, { method: "POST" });
    if (res.ok) await load();
    setGenerating(false);
  };

  const revoke = async (accesoId: string) => {
    await fetch(`/api/leads/${leadId}/generar-acceso?accesoId=${accesoId}`, { method: "DELETE" });
    await load();
  };

  const copy = async (token: string) => {
    const url = `${baseUrl}/comprador/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold transition-colors cursor-pointer"
      >
        <Link2 className="h-3.5 w-3.5" />
        Portal
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">Portal del Comprador</p>
                <p className="text-xs text-slate-500 mt-0.5">{leadNombre}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer">×</button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              <button
                onClick={generate}
                disabled={generating}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
              >
                {generating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="h-4 w-4" />
                )}
                Generar nuevo enlace (30 días)
              </button>

              {loading ? (
                <div className="flex justify-center py-4">
                  <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              ) : accesos && accesos.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Enlaces activos ({accesos.length})
                  </p>
                  {accesos.map((a) => {
                    const url = `${baseUrl}/comprador/${a.token}`;
                    const isCopied = copied === a.token;
                    const expired = new Date(a.expiresAt) < new Date();
                    return (
                      <div key={a.id} className="flex items-start gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-mono text-slate-600 truncate">{url}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${expired ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                              {expired ? "Expirado" : "Activo"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Expira {formatDate(a.expiresAt)}
                            </span>
                            {a.ultimoAcceso && (
                              <span className="text-[10px] text-slate-400">
                                · Último acceso {formatDate(a.ultimoAcceso)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => copy(a.token)}
                            title="Copiar enlace"
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir portal"
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <button
                            onClick={() => revoke(a.id)}
                            title="Revocar"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : accesos?.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-2">Sin enlaces activos</p>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
