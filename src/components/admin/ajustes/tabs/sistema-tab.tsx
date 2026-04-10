"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, Database, Clock, Zap, Globe, Shield } from "lucide-react";

interface SystemStats {
  usuarios: number;
  leads: number;
  inmuebles: number;
  operaciones: number;
  comerciales: number;
  propietarios: number;
  visitas: number;
  tareas: number;
  automatizaciones: number;
}

export function SistemaTab() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch stats from multiple endpoints
    Promise.all([
      fetch("/api/usuarios").then(r => r.json()),
      fetch("/api/leads?limit=1").then(r => r.json()),
      fetch("/api/inmuebles?limit=1").then(r => r.json()),
      fetch("/api/operaciones").then(r => r.json()),
      fetch("/api/comerciales").then(r => r.json()),
      fetch("/api/propietarios").then(r => r.json()),
      fetch("/api/automatizaciones").then(r => r.json()),
    ]).then(([usuarios, leads, inmuebles, operaciones, comerciales, propietarios, autos]) => {
      setStats({
        usuarios: (usuarios.data ?? []).length,
        leads: leads.total ?? (leads.data ?? []).length,
        inmuebles: inmuebles.total ?? (inmuebles.data ?? []).length,
        operaciones: (operaciones.data ?? []).length,
        comerciales: (comerciales.data ?? []).length,
        propietarios: (propietarios.data ?? []).length,
        visitas: 0, // Would need a count endpoint
        tareas: 0,
        automatizaciones: (autos.data ?? []).length,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const cronJobs = [
    { nombre: "Email parsing portales", frecuencia: "Cada 5 minutos", script: "cron-emails.sh" },
    { nombre: "Detectar leads sin contactar", frecuencia: "Cada 5 minutos", script: "cron-emails.sh (integrado)" },
    { nombre: "Recordatorios WhatsApp visitas", frecuencia: "Diario 20:00", script: "cron-wa-reminders.sh" },
    { nombre: "Informes mensuales propietarios", frecuencia: "Dia 1 cada mes 06:00", script: "cron-informes.sh" },
  ];

  return (
    <div className="p-5 space-y-6">
      {/* App info */}
      <div className="bg-muted/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Server className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-bold text-foreground">Informacion del sistema</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-secondary">Aplicacion</p>
            <p className="text-base font-semibold text-foreground">InmoFlow CRM v0.1.0</p>
          </div>
          <div>
            <p className="text-sm text-secondary">Entorno</p>
            <Badge variant="success" size="sm">Production</Badge>
          </div>
          <div>
            <p className="text-sm text-secondary">URL</p>
            <p className="text-base font-medium text-primary">inmo.eaistudio.es</p>
          </div>
          <div>
            <p className="text-sm text-secondary">Framework</p>
            <p className="text-base font-medium text-foreground">Next.js 16 + Prisma 5</p>
          </div>
          <div>
            <p className="text-sm text-secondary">Base de datos</p>
            <p className="text-base font-medium text-foreground">PostgreSQL 16 + PostGIS</p>
          </div>
          <div>
            <p className="text-sm text-secondary">Servidor</p>
            <p className="text-base font-medium text-foreground">VPS Debian + Nginx + PM2</p>
          </div>
        </div>
      </div>

      {/* Counters */}
      <div className="bg-muted/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-bold text-foreground">Contadores de la base de datos</h3>
        </div>
        {loading ? (
          <div className="grid grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
        ) : stats ? (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Usuarios", value: stats.usuarios },
              { label: "Comerciales", value: stats.comerciales },
              { label: "Leads", value: stats.leads },
              { label: "Inmuebles", value: stats.inmuebles },
              { label: "Operaciones", value: stats.operaciones },
              { label: "Propietarios", value: stats.propietarios },
              { label: "Automatizaciones", value: stats.automatizaciones },
            ].map((s) => (
              <div key={s.label} className="bg-card rounded-lg border border-border p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-sm text-secondary">{s.label}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Cron jobs */}
      <div className="bg-muted/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-amber-600" />
          <h3 className="text-base font-bold text-foreground">Cron jobs programados</h3>
        </div>
        <div className="space-y-2">
          {cronJobs.map((cron) => (
            <div key={cron.nombre} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
              <div>
                <p className="text-base font-medium text-foreground">{cron.nombre}</p>
                <p className="text-xs font-mono text-secondary">{cron.script}</p>
              </div>
              <Badge variant="info" size="sm">{cron.frecuencia}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-muted/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-red-600" />
          <h3 className="text-base font-bold text-foreground">Seguridad</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            "HTTPS + SSL Let's Encrypt",
            "HSTS habilitado (2 anos)",
            "X-Frame-Options: DENY",
            "X-Content-Type-Options: nosniff",
            "Referrer-Policy: strict-origin",
            "Passwords: bcrypt (cost 12)",
            "Sesiones JWT (8h max)",
            "RGPD: KYC/PBC integrado",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-sm text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
