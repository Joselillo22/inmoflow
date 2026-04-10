"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, ClipboardList } from "lucide-react";

interface Tarea {
  id: string;
  tipo: string;
  descripcion: string;
  prioridad: number;
  completada: boolean;
  fechaLimite: string | null;
}

interface TaskListProps {
  tareas: Tarea[];
  onUpdate?: (id: string, completada: boolean) => void;
}

const prioridadLabel: Record<number, { text: string; class: string }> = {
  0: { text: "", class: "" },
  1: { text: "ALTA", class: "text-warning" },
  2: { text: "URGENTE", class: "text-danger" },
};

export function TaskList({ tareas: initialTareas, onUpdate }: TaskListProps) {
  const [tareas, setTareas] = useState(initialTareas);

  async function toggleTarea(id: string, completada: boolean) {
    const res = await fetch(`/api/tareas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completada }),
    });

    if (res.ok) {
      setTareas((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completada } : t))
      );
      onUpdate?.(id, completada);
    }
  }

  const pendientes = tareas.filter((t) => !t.completada);
  const completadas = tareas.filter((t) => t.completada);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Tareas ({pendientes.length} pendientes)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {pendientes.map((tarea) => (
          <label
            key={tarea.id}
            className="flex items-start gap-3 py-3 border-b border-border last:border-0 cursor-pointer group"
          >
            <button
              onClick={() => toggleTarea(tarea.id, true)}
              className="mt-0.5 h-6 w-6 rounded border-2 border-border flex items-center justify-center shrink-0 hover:border-primary transition-colors cursor-pointer"
            >
              <Check className="h-4 w-4 text-transparent group-hover:text-primary/30" />
            </button>
            <div className="flex-1">
              <p className="font-medium">{tarea.descripcion}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-secondary">{tarea.tipo.replace(/_/g, " ")}</span>
                {tarea.prioridad > 0 && (
                  <span className={`text-xs font-semibold ${prioridadLabel[tarea.prioridad]?.class}`}>
                    {prioridadLabel[tarea.prioridad]?.text}
                  </span>
                )}
              </div>
            </div>
          </label>
        ))}

        {pendientes.length === 0 && (
          <div className="flex items-center gap-2 py-4 text-success">
            <Check className="h-5 w-5" />
            <p className="font-medium">Todo al día</p>
          </div>
        )}

        {completadas.length > 0 && (
          <details className="mt-4">
            <summary className="text-sm text-secondary cursor-pointer">
              {completadas.length} completadas
            </summary>
            <div className="mt-2 space-y-1">
              {completadas.map((tarea) => (
                <label
                  key={tarea.id}
                  className="flex items-start gap-3 py-2 opacity-50 cursor-pointer"
                >
                  <button
                    onClick={() => toggleTarea(tarea.id, false)}
                    className="mt-0.5 h-6 w-6 rounded border-2 border-success bg-success/10 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <Check className="h-4 w-4 text-success" />
                  </button>
                  <p className="line-through">{tarea.descripcion}</p>
                </label>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
