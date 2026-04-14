"use client";

import { signOut, useSession } from "next-auth/react";
import { LogOut, Bell, Check, CheckCheck, UserPlus, Calendar, AlertTriangle, TrendingUp, ShieldAlert, Clock, X, ExternalLink } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/shared/language-selector";
import { useState, useEffect, useRef, useCallback } from "react";
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
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function ComercialHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotif = useCallback(async () => {
    try {
      const res = await fetch("/api/notificaciones?limit=20");
      if (res.ok) {
        const data = await res.json();
        setNotificaciones(data.data ?? []);
        setNoLeidas(data.noLeidas ?? 0);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNotif();
    const interval = setInterval(fetchNotif, 30000);
    return () => clearInterval(interval);
  }, [fetchNotif]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function marcarLeida(id: string) {
    await fetch("/api/notificaciones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchNotif();
  }

  async function marcarTodas() {
    await fetch("/api/notificaciones", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marcarTodas: true }) });
    fetchNotif();
  }

  function handleNotifClick(notif: Notificacion) {
    if (!notif.leida) marcarLeida(notif.id);
    if (notif.enlace) { router.push(notif.enlace); setNotifOpen(false); }
  }

  return (
    <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border z-30 px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">IF</span>
        </div>
        <span className="text-sm font-bold text-foreground">InmoFlow</span>
      </div>
      <div className="flex items-center gap-2">
        <LanguageSelector variant="mobile" />

        {/* Notificaciones */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) fetchNotif(); }}
            className="relative p-2 rounded-lg text-secondary hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <Bell className="h-5 w-5" />
            {noLeidas > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {noLeidas > 99 ? "99+" : noLeidas}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="fixed top-14 left-4 right-4 bg-card rounded-2xl shadow-xl border border-border z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-bold text-foreground">Notificaciones</p>
                <div className="flex items-center gap-1">
                  {noLeidas > 0 && (
                    <button onClick={marcarTodas} className="text-[11px] text-primary font-semibold cursor-pointer px-2 py-1 rounded-lg hover:bg-primary/5">
                      Marcar todas
                    </button>
                  )}
                  <button onClick={() => setNotifOpen(false)} className="p-1 rounded-lg text-secondary hover:bg-muted cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-[60vh] overflow-y-auto">
                {notificaciones.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell className="h-7 w-7 text-secondary/30 mx-auto mb-2" />
                    <p className="text-sm text-secondary">Sin notificaciones</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {notificaciones.map((notif) => {
                      const cfg = tipoConfig[notif.tipo] ?? tipoConfig.SISTEMA;
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={notif.id}
                          onClick={() => handleNotifClick(notif)}
                          className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                            notif.leida ? "hover:bg-muted/30" : "bg-primary/[0.03] hover:bg-primary/[0.06]"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-4 w-4 ${cfg.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <p className={`text-sm leading-snug ${notif.leida ? "text-secondary" : "text-foreground font-semibold"}`}>
                                {notif.titulo}
                              </p>
                              <span className="text-[10px] text-secondary/60 shrink-0">{timeAgo(notif.createdAt)}</span>
                            </div>
                            <p className="text-xs text-secondary mt-0.5 line-clamp-2">{notif.mensaje}</p>
                          </div>
                          {!notif.leida && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <Avatar name={session?.user?.name ?? "U"} size="sm" />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-1.5 rounded-lg text-secondary hover:bg-muted hover:text-foreground transition-colors duration-200 cursor-pointer"
          aria-label="Cerrar sesion"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
