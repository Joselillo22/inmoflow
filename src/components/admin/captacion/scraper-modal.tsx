"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { X, RefreshCw, Check, AlertTriangle, Zap } from "lucide-react";

interface Run {
  portal: string;
  runId: string;
  status: string;
  actorId: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onFinished: () => void;
}

const PORTALES = [
  { value: "MILANUNCIOS", label: "Milanuncios", desc: "Suele exponer teléfono del vendedor" },
  { value: "IDEALISTA", label: "Idealista", desc: "Teléfono oculto; volumen alto" },
  { value: "FOTOCASA", label: "Fotocasa", desc: "Teléfono oculto; fuente complementaria" },
];

const STATUS_LABELS: Record<string, { cls: string; label: string }> = {
  READY: { cls: "bg-slate-100 text-slate-700", label: "Pendiente" },
  RUNNING: { cls: "bg-amber-100 text-amber-700", label: "Ejecutando" },
  SUCCEEDED: { cls: "bg-emerald-100 text-emerald-700", label: "Completado" },
  FAILED: { cls: "bg-red-100 text-red-700", label: "Fallido" },
  ABORTED: { cls: "bg-slate-100 text-slate-600", label: "Abortado" },
  "TIMING-OUT": { cls: "bg-amber-100 text-amber-700", label: "Timeout" },
  "TIMED-OUT": { cls: "bg-red-100 text-red-700", label: "Timeout" },
  PROCESSED: { cls: "bg-blue-100 text-blue-700", label: "Procesado" },
};

export function ScraperModal({ open, onClose, onFinished }: Props) {
  const { toast } = useToast();
  const [seleccionados, setSeleccionados] = useState<string[]>(["MILANUNCIOS"]);
  const [runs, setRuns] = useState<(Run & { result?: Record<string, unknown>; error?: string })[]>([]);
  const [launching, setLaunching] = useState(false);
  const [errores, setErrores] = useState<{ portal: string; error: string }[]>([]);

  useEffect(() => {
    if (!open) { setRuns([]); setErrores([]); }
  }, [open]);

  // Polling cada 30s hasta que todos los runs terminen
  useEffect(() => {
    if (runs.length === 0) return;
    const activos = runs.filter((r) => !["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT", "PROCESSED"].includes(r.status));
    if (activos.length === 0) return;

    const id = setInterval(async () => {
      const next = await Promise.all(runs.map(async (r) => {
        if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT", "PROCESSED"].includes(r.status)) return r;
        try {
          const res = await fetch(`/api/captacion/scraper/status/${r.runId}`);
          if (!res.ok) return r;
          const data = await res.json();
          const updated = { ...r, status: data.status };
          if (data.status === "SUCCEEDED" && r.status !== "PROCESSED") {
            // Auto-procesar
            const pres = await fetch("/api/captacion/scraper/process", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ runId: r.runId, portal: r.portal }),
            });
            if (pres.ok) {
              const pdata = await pres.json();
              updated.status = "PROCESSED";
              updated.result = pdata;
              onFinished();
            } else {
              const err = await pres.json();
              updated.error = err.error ?? "Error procesando";
            }
          }
          return updated;
        } catch {
          return r;
        }
      }));
      setRuns(next);
    }, 30000);

    return () => clearInterval(id);
  }, [runs, onFinished]);

  async function lanzar() {
    if (seleccionados.length === 0) {
      toast("Selecciona al menos un portal", "error");
      return;
    }
    setLaunching(true);
    setErrores([]);
    try {
      const res = await fetch("/api/captacion/scraper/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portales: seleccionados }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "No se pudo lanzar", "error");
        return;
      }
      setRuns(data.runs ?? []);
      setErrores(data.errores ?? []);
      if ((data.runs ?? []).length > 0) {
        toast(`${data.runs.length} scraper(s) lanzados. Se procesarán automáticamente al finalizar.`, "success");
      }
    } finally {
      setLaunching(false);
    }
  }

  if (!open) return null;

  const running = runs.some((r) => ["READY", "RUNNING"].includes(r.status));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Ejecutar scraper Apify
          </h3>
          <button onClick={onClose} className="text-secondary hover:text-foreground cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {runs.length === 0 ? (
            <>
              <p className="text-sm text-secondary">Selecciona los portales a escanear. Se buscarán anuncios de <strong>particulares en Alicante provincia</strong>.</p>

              <div className="space-y-2">
                {PORTALES.map((p) => {
                  const active = seleccionados.includes(p.value);
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        if (active) setSeleccionados(seleccionados.filter((x) => x !== p.value));
                        else setSeleccionados([...seleccionados, p.value]);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
                        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="text-left">
                        <p className="text-sm font-semibold">{p.label}</p>
                        <p className="text-xs text-secondary">{p.desc}</p>
                      </div>
                      {active && <Check className="h-4 w-4 text-primary" />}
                    </button>
                  );
                })}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  Cada ejecución puede tardar <strong>5–15 minutos</strong> y consumir créditos Apify. Los resultados se procesan automáticamente al terminar.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="ghost" onClick={onClose} disabled={launching}>Cancelar</Button>
                <Button onClick={lanzar} disabled={launching} className="gap-1.5">
                  {launching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {launching ? "Lanzando..." : "Lanzar scraper"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-secondary">
                {running ? "Scraping en progreso. El modal se actualiza cada 30s." : "Todos los scrapers completados."}
              </p>

              <div className="space-y-2">
                {runs.map((r) => {
                  const s = STATUS_LABELS[r.status] ?? { cls: "bg-slate-100 text-slate-600", label: r.status };
                  const result = r.result as { creadas?: number; actualizadas?: number; duplicadas?: number; saltadas?: number; totalItems?: number } | undefined;
                  return (
                    <div key={r.runId} className="rounded-xl border border-border p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{r.portal}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.cls} flex items-center gap-1`}>
                          {running && !["SUCCEEDED", "FAILED", "PROCESSED"].includes(r.status) && <RefreshCw className="h-2.5 w-2.5 animate-spin" />}
                          {s.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-secondary font-mono">{r.runId}</p>
                      {result && (
                        <div className="pt-1.5 border-t border-border/40 text-xs grid grid-cols-4 gap-2 mt-1.5">
                          <div><span className="text-secondary">Total:</span> {result.totalItems}</div>
                          <div className="text-emerald-600"><span className="text-secondary">Creadas:</span> {result.creadas}</div>
                          <div className="text-blue-600"><span className="text-secondary">Actualizadas:</span> {result.actualizadas}</div>
                          <div className="text-amber-600"><span className="text-secondary">Dup:</span> {result.duplicadas}</div>
                        </div>
                      )}
                      {r.error && <p className="text-xs text-red-600">{r.error}</p>}
                    </div>
                  );
                })}
              </div>

              {errores.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-1">
                  <p className="text-xs font-semibold text-red-700">Errores al lanzar:</p>
                  {errores.map((e, i) => (
                    <p key={i} className="text-xs text-red-700">{e.portal}: {e.error}</p>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-border">
                <Button onClick={onClose}>Cerrar</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
