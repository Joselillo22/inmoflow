"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckSquare, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
import type { ComercialTarea } from "@/lib/types/comercial";

const tipoLabels: Record<string, string> = {
  LLAMAR: "Llamar",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  SUBIR_FOTOS: "Subir fotos",
  ENVIAR_INFORME: "Enviar informe",
  DOCUMENTACION: "Documentacion",
  VISITA_CAPTACION: "Visita captacion",
  SEGUIMIENTO: "Seguimiento",
  OTRO: "Otro",
};

const prioridadConfig: Record<number, { label: string; color: string; icon: typeof AlertTriangle }> = {
  2: { label: "Urgente", color: "text-red-600 bg-red-50", icon: AlertTriangle },
  1: { label: "Alta", color: "text-amber-600 bg-amber-50", icon: Clock },
  0: { label: "Normal", color: "text-slate-500 bg-slate-50", icon: CheckSquare },
};

interface TareasTabProps {
  tareas: ComercialTarea[];
}

export function TareasTab({ tareas }: TareasTabProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  if (tareas.length === 0) {
    return <EmptyState icon={<CheckSquare className="h-8 w-8" />} title="Sin tareas" description="Este comercial no tiene tareas asignadas" />;
  }

  const pendientes = tareas.filter((t) => !t.completada);
  const completadas = tareas.filter((t) => t.completada);
  const now = new Date();

  function renderTarea(tarea: ComercialTarea) {
    const prio = prioridadConfig[tarea.prioridad] ?? prioridadConfig[0];
    const isOverdue = tarea.fechaLimite && new Date(tarea.fechaLimite) < now && !tarea.completada;

    return (
      <div key={tarea.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${tarea.completada ? "bg-muted/30 border-border/30" : "bg-card border-border"}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${prio.color}`}>
          <prio.icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Badge variant="default" size="sm">{tipoLabels[tarea.tipo] ?? tarea.tipo}</Badge>
            {tarea.prioridad > 0 && (
              <Badge variant={tarea.prioridad === 2 ? "danger" : "warning"} size="sm">{prio.label}</Badge>
            )}
          </div>
          <p className={`text-base ${tarea.completada ? "text-secondary line-through" : "font-medium text-foreground"}`}>
            {tarea.descripcion}
          </p>
          {tarea.fechaLimite && (
            <p className={`text-sm mt-0.5 ${isOverdue ? "text-red-600 font-semibold" : "text-secondary"}`}>
              {isOverdue ? "Vencida: " : "Fecha limite: "}{formatDate(tarea.fechaLimite)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      {/* Pendientes */}
      {pendientes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-secondary uppercase tracking-wider">Pendientes ({pendientes.length})</h3>
          <div className="space-y-2">
            {pendientes.map(renderTarea)}
          </div>
        </div>
      )}

      {/* Completadas */}
      {completadas.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm font-bold text-secondary uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors"
          >
            Completadas ({completadas.length})
            {showCompleted ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showCompleted && (
            <div className="space-y-2 mt-2">
              {completadas.map(renderTarea)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
