"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  FileText, Download, ExternalLink, Eye, MessageSquare,
  Building2, Loader2, Calendar, RefreshCw,
} from "lucide-react";

interface Informe {
  id: string;
  periodo: string;
  visitasCount: number;
  consultasPortal: number;
  contactosCount: number;
  pdfUrl: string | null;
  inmueble: { id: string; titulo: string; referencia: string };
}

interface InmueblaData {
  id: string;
  titulo: string;
  referencia: string;
}

interface InformesPropietarioTabProps {
  propietarioId: string;
  inmuebles: InmueblaData[];
}

export function InformesPropietarioTab({ propietarioId, inmuebles }: InformesPropietarioTabProps) {
  const [informes, setInformes] = useState<Informe[]>([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchInformes = useCallback(() => {
    fetch(`/api/propietarios/${propietarioId}/informes`)
      .then((r) => r.json())
      .then((d) => setInformes(d.data ?? []))
      .finally(() => setLoading(false));
  }, [propietarioId]);

  useEffect(() => { fetchInformes(); }, [fetchInformes]);

  async function generarInforme(inmuebleId: string) {
    setGenerando(inmuebleId);
    const ahora = new Date();
    const periodo = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}`;
    try {
      const res = await fetch(`/api/informes?propietarioId=${propietarioId}&inmuebleId=${inmuebleId}&periodo=${periodo}&format=json`);
      if (res.ok) {
        toast("Informe generado", "success");
        fetchInformes();
      } else {
        toast("Error al generar informe", "error");
      }
    } catch {
      toast("Error de conexión", "error");
    }
    setGenerando(null);
  }

  if (loading) return <div className="p-5"><Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /></div>;

  // Agrupar informes por inmueble
  const informesPorInmueble: Record<string, Informe[]> = {};
  for (const inf of informes) {
    const key = inf.inmueble.id;
    if (!informesPorInmueble[key]) informesPorInmueble[key] = [];
    informesPorInmueble[key].push(inf);
  }

  return (
    <div className="p-5 space-y-4">
      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
        <FileText className="h-3.5 w-3.5 text-primary" /> Informes mensuales
      </p>

      {inmuebles.length === 0 ? (
        <div className="text-center py-8">
          <Building2 className="h-8 w-8 text-secondary/30 mx-auto mb-2" />
          <p className="text-sm text-secondary">Sin inmuebles asignados</p>
        </div>
      ) : (
        inmuebles.map((inm) => {
          const infs = informesPorInmueble[inm.id] ?? [];
          return (
            <div key={inm.id} className="border border-border rounded-xl overflow-hidden">
              {/* Inmueble header */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted/30">
                <div>
                  <p className="text-xs font-mono text-secondary">{inm.referencia}</p>
                  <p className="text-sm font-medium text-foreground">{inm.titulo}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generarInforme(inm.id)}
                  disabled={generando === inm.id}
                  className="gap-1 shrink-0"
                >
                  {generando === inm.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Generar
                </Button>
              </div>

              {/* Informes list */}
              {infs.length === 0 ? (
                <p className="text-xs text-secondary text-center py-4">Sin informes</p>
              ) : (
                <div className="divide-y divide-border/30">
                  {infs.map((inf) => (
                    <div key={inf.id} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-secondary" />
                          {inf.periodo}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-secondary flex items-center gap-0.5">
                            <Eye className="h-3 w-3" /> {inf.visitasCount} visitas
                          </span>
                          <span className="text-[10px] text-secondary flex items-center gap-0.5">
                            <MessageSquare className="h-3 w-3" /> {inf.contactosCount} contactos
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {inf.pdfUrl && (
                          <a href={inf.pdfUrl} download>
                            <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold cursor-pointer hover:bg-blue-100 transition-colors">
                              <Download className="h-3 w-3" /> PDF
                            </button>
                          </a>
                        )}
                        <a href={`/api/informes?propietarioId=${propietarioId}&inmuebleId=${inm.id}&periodo=${inf.periodo}&format=html`} target="_blank" rel="noopener noreferrer">
                          <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium cursor-pointer hover:bg-muted transition-colors">
                            <ExternalLink className="h-3 w-3" /> Ver
                          </button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
