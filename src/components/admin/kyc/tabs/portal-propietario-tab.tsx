"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import {
  Globe, Plus, Copy, ExternalLink, MessageCircle, Trash2,
  Loader2, Clock, CheckCircle,
} from "lucide-react";

interface Acceso {
  id: string;
  token: string;
  expiresAt: string;
  ultimoAcceso: string | null;
  activo: boolean;
  createdAt: string;
}

interface PortalPropietarioTabProps {
  propietarioId: string;
  propietarioNombre: string;
  propietarioTelefono: string | null;
}

export function PortalPropietarioTab({ propietarioId, propietarioNombre, propietarioTelefono }: PortalPropietarioTabProps) {
  const [accesos, setAccesos] = useState<Acceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const fetchAccesos = useCallback(() => {
    fetch(`/api/propietarios/${propietarioId}/generar-acceso`)
      .then((r) => r.json())
      .then((d) => setAccesos(d.data ?? []))
      .finally(() => setLoading(false));
  }, [propietarioId]);

  useEffect(() => { fetchAccesos(); }, [fetchAccesos]);

  async function generarEnlace() {
    setGenerating(true);
    const res = await fetch(`/api/propietarios/${propietarioId}/generar-acceso`, { method: "POST" });
    if (res.ok) {
      toast("Enlace generado (válido 30 días)", "success");
      fetchAccesos();
    } else {
      toast("Error al generar enlace", "error");
    }
    setGenerating(false);
  }

  async function revocar(accesoId: string) {
    await fetch(`/api/propietarios/${propietarioId}/generar-acceso?accesoId=${accesoId}`, { method: "DELETE" });
    toast("Acceso revocado", "success");
    fetchAccesos();
  }

  function copiar(token: string) {
    const url = `${window.location.origin}/propietario/${token}`;
    navigator.clipboard.writeText(url);
    toast("Enlace copiado", "success");
  }

  function enviarWhatsApp(token: string) {
    if (!propietarioTelefono) { toast("El propietario no tiene teléfono", "warning"); return; }
    const url = `${window.location.origin}/propietario/${token}`;
    const texto = `Hola ${propietarioNombre}, aquí tienes el acceso a la información de tus inmuebles en tiempo real:\n\n${url}\n\nEl enlace es válido durante 30 días. Saludos, InmoFlow.`;
    window.open(`https://wa.me/34${propietarioTelefono.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`, "_blank");
  }

  if (loading) return <div className="p-5"><Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /></div>;

  const activos = accesos.filter((a) => a.activo && new Date(a.expiresAt) > new Date());
  const expirados = accesos.filter((a) => !a.activo || new Date(a.expiresAt) <= new Date());

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-primary" /> Portal del propietario
        </p>
        <Button size="sm" onClick={generarEnlace} disabled={generating} className="gap-1.5">
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Generar enlace (30 días)
        </Button>
      </div>

      <p className="text-xs text-secondary">
        El propietario puede ver el estado de sus inmuebles, visitas, publicaciones e informes sin necesitar login.
      </p>

      {/* Activos */}
      {activos.length > 0 && (
        <div className="space-y-2">
          {activos.map((a) => {
            const diasRestantes = Math.ceil((new Date(a.expiresAt).getTime() - Date.now()) / 86400000);
            return (
              <div key={a.id} className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    <Badge size="sm" variant="success">Activo</Badge>
                    <span className="text-[10px] text-secondary">{diasRestantes} días restantes</span>
                  </div>
                  {a.ultimoAcceso && (
                    <span className="text-[10px] text-secondary">
                      Último acceso: {new Date(a.ultimoAcceso).toLocaleDateString("es-ES")}
                    </span>
                  )}
                </div>
                <p className="text-xs font-mono text-secondary truncate bg-white/60 rounded-lg px-2 py-1.5">
                  {window.location.origin}/propietario/{a.token.slice(0, 12)}...
                </p>
                <div className="flex gap-1.5">
                  <button onClick={() => copiar(a.token)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-border text-xs font-medium cursor-pointer hover:bg-muted transition-colors">
                    <Copy className="h-3 w-3" /> Copiar
                  </button>
                  <a href={`/propietario/${a.token}`} target="_blank" rel="noopener noreferrer">
                    <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-border text-xs font-medium cursor-pointer hover:bg-muted transition-colors">
                      <ExternalLink className="h-3 w-3" /> Abrir
                    </button>
                  </a>
                  {propietarioTelefono && (
                    <button onClick={() => enviarWhatsApp(a.token)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium cursor-pointer hover:bg-emerald-600 transition-colors">
                      <MessageCircle className="h-3 w-3" /> WhatsApp
                    </button>
                  )}
                  <button onClick={() => revocar(a.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-500 text-xs font-medium cursor-pointer hover:bg-red-50 transition-colors ml-auto">
                    <Trash2 className="h-3 w-3" /> Revocar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sin acceso activo */}
      {activos.length === 0 && (
        <div className="text-center py-6 bg-muted/30 rounded-xl">
          <Globe className="h-8 w-8 text-secondary/30 mx-auto mb-2" />
          <p className="text-sm text-secondary">Sin acceso activo al portal</p>
          <p className="text-xs text-secondary mt-0.5">Genera un enlace para que el propietario pueda ver sus inmuebles</p>
        </div>
      )}

      {/* Expirados */}
      {expirados.length > 0 && (
        <div>
          <p className="text-[10px] text-secondary font-semibold uppercase tracking-wider mb-1.5">Expirados / Revocados ({expirados.length})</p>
          {expirados.slice(0, 3).map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2 px-3 text-xs text-secondary opacity-60">
              <span className="font-mono truncate flex-1">{a.token.slice(0, 16)}...</span>
              <Badge size="sm" variant="default">Expirado</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
