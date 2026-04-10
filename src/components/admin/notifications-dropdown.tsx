"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Bell, Check, CheckCheck, UserPlus, Calendar, AlertTriangle,
  TrendingUp, ShieldAlert, Clock, X, ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  enlace: string | null;
  createdAt: string;
}

const tipoConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  LEAD_ASIGNADO: { icon: UserPlus, color: "text-blue-600", bg: "bg-blue-50" },
  VISITA_MANANA: { icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-50" },
  TAREA_VENCIDA: { icon: Clock, color: "text-red-600", bg: "bg-red-50" },
  OPERACION_AVANCE: { icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
  KYC_PENDIENTE: { icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50" },
  LEAD_SIN_CONTACTAR: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  SISTEMA: { icon: Bell, color: "text-slate-600", bg: "bg-slate-50" },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days}d`;
  return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotificaciones = useCallback(async () => {
    try {
      const res = await fetch("/api/notificaciones?limit=20");
      if (res.ok) {
        const data = await res.json();
        setNotificaciones(data.data ?? []);
        setNoLeidas(data.noLeidas ?? 0);
      }
    } catch { /* silently fail */ }
  }, []);

  // Fetch on mount + poll every 30s
  useEffect(() => {
    fetchNotificaciones();
    const interval = setInterval(fetchNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [fetchNotificaciones]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function marcarLeida(id: string) {
    await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchNotificaciones();
  }

  async function marcarTodas() {
    await fetch("/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marcarTodas: true }),
    });
    fetchNotificaciones();
  }

  function handleClick(notif: Notificacion) {
    if (!notif.leida) marcarLeida(notif.id);
    if (notif.enlace) {
      router.push(notif.enlace);
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open) fetchNotificaciones(); }}
        className="relative p-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
      >
        <Bell className="h-5 w-5" />
        {noLeidas > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-in zoom-in duration-200">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[420px] bg-card rounded-2xl shadow-[var(--shadow-xl)] border border-border z-50 animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">Notificaciones</h3>
              {noLeidas > 0 && <Badge variant="danger" size="sm">{noLeidas} nuevas</Badge>}
            </div>
            <div className="flex items-center gap-1">
              {noLeidas > 0 && (
                <button
                  onClick={marcarTodas}
                  className="flex items-center gap-1 text-xs font-medium text-primary hover:bg-primary/5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-secondary hover:bg-muted cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notifications list */}
          <div className="max-h-[480px] overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 text-secondary/30 mx-auto mb-2" />
                <p className="text-sm text-secondary">No hay notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {notificaciones.map((notif) => {
                  const cfg = tipoConfig[notif.tipo] ?? tipoConfig.SISTEMA;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleClick(notif)}
                      className={`flex items-start gap-3 px-5 py-3.5 cursor-pointer transition-colors ${
                        notif.leida ? "bg-card hover:bg-muted/30" : "bg-primary/[0.03] hover:bg-primary/[0.06]"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className={`h-4.5 w-4.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${notif.leida ? "text-secondary" : "text-foreground font-semibold"}`}>
                            {notif.titulo}
                          </p>
                          <span className="text-xs text-secondary/60 shrink-0 mt-0.5">{timeAgo(notif.createdAt)}</span>
                        </div>
                        <p className="text-xs text-secondary mt-0.5 line-clamp-2">{notif.mensaje}</p>
                        {notif.enlace && (
                          <span className="inline-flex items-center gap-0.5 text-xs text-primary mt-1">
                            Ver detalle <ExternalLink className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                      {!notif.leida && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
