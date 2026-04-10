"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import {
  Phone, MessageCircle, Mail, Users, Globe, Settings, MapPin,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils/formatters";
import type { InteraccionItem, VisitaItem } from "@/lib/types/lead";

const canalConfig: Record<string, { icon: typeof Phone; color: string; bg: string }> = {
  TELEFONO: { icon: Phone, color: "text-blue-600", bg: "bg-blue-50" },
  WHATSAPP: { icon: MessageCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  EMAIL: { icon: Mail, color: "text-violet-600", bg: "bg-violet-50" },
  PRESENCIAL: { icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
  PORTAL: { icon: Globe, color: "text-cyan-600", bg: "bg-cyan-50" },
  SISTEMA: { icon: Settings, color: "text-slate-500", bg: "bg-slate-100" },
};

interface ActivityTimelineProps {
  interactions: InteraccionItem[];
  visits: VisitaItem[];
  leadId: string;
  onNewInteraction?: () => void;
}

type TimelineEvent = {
  id: string;
  date: string;
  type: "interaction" | "visit";
  canal?: string;
  contenido?: string | null;
  resultado?: string;
  inmueble?: string;
};

export function ActivityTimeline({ interactions, visits, leadId, onNewInteraction }: ActivityTimelineProps) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const events: TimelineEvent[] = [
    ...interactions.map((i) => ({
      id: i.id, date: i.fecha, type: "interaction" as const,
      canal: i.canal, contenido: i.contenido,
    })),
    ...visits.map((v) => ({
      id: v.id, date: v.fecha, type: "visit" as const,
      canal: "VISITA", contenido: v.notasDespues,
      resultado: v.resultado, inmueble: v.inmueble?.titulo,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  async function sendInteraction(canal: string) {
    if (!content.trim() && canal !== "TELEFONO") return;
    setSending(true);
    await fetch(`/api/leads/${leadId}/interaccion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canal, contenido: content || undefined }),
    });
    setContent("");
    setSending(false);
    onNewInteraction?.();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Timeline */}
      <div className="flex-1 overflow-y-auto space-y-3 py-3">
        {events.map((event) => {
          const config = canalConfig[event.canal ?? "SISTEMA"] ?? canalConfig.SISTEMA;
          const Icon = event.type === "visit" ? MapPin : config.icon;
          return (
            <div key={event.id} className="flex gap-3 px-4">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5", config.bg)}>
                <Icon className={cn("h-3.5 w-3.5", config.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-foreground">
                    {event.canal?.replace(/_/g, " ") ?? "Sistema"}
                  </span>
                  {event.resultado && (
                    <span className="text-sm text-secondary">{event.resultado.replace(/_/g, " ")}</span>
                  )}
                </div>
                {event.contenido && (
                  <p className="text-sm text-secondary leading-relaxed">{event.contenido}</p>
                )}
                {event.inmueble && (
                  <p className="text-sm text-primary font-medium mt-0.5">{event.inmueble}</p>
                )}
                <span className="text-sm text-secondary/60 mt-1 block">{formatDateTime(event.date)}</span>
              </div>
            </div>
          );
        })}
        {events.length === 0 && (
          <p className="text-sm text-secondary text-center py-8">Sin actividad registrada</p>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-border p-3 bg-muted/50">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe una nota..."
          className="w-full h-16 rounded-lg border border-border bg-card px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/15 mb-2"
        />
        <div className="flex gap-1.5">
          {[
            { canal: "TELEFONO", icon: Phone, label: "Llamada", color: "bg-blue-500" },
            { canal: "WHATSAPP", icon: MessageCircle, label: "WhatsApp", color: "bg-emerald-500" },
            { canal: "EMAIL", icon: Mail, label: "Email", color: "bg-violet-500" },
            { canal: "PRESENCIAL", icon: Users, label: "Presencial", color: "bg-amber-500" },
          ].map((c) => (
            <Button
              key={c.canal}
              size="sm"
              variant="ghost"
              disabled={sending}
              onClick={() => sendInteraction(c.canal)}
              className="flex-1 text-sm gap-1 h-7"
            >
              <c.icon className="h-3 w-3" />
              {c.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
