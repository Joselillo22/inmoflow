"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft, Phone, MessageCircle, Mail, User, MapPin,
  Clock, ChevronDown, Check, Mic, Send,
} from "lucide-react";
import { formatDate, formatDateTime, formatCurrency, formatPhone } from "@/lib/utils/formatters";
import { FASE_FUNNEL_LABELS, RESULTADO_VISITA_LABELS } from "@/lib/utils/constants";
import { VoiceNote } from "@/components/comercial/voice-note";

const faseOptions = Object.entries(FASE_FUNNEL_LABELS).map(([value, label]) => ({ value, label }));
const faseColors: Record<string, string> = {
  NUEVO: "bg-blue-50 text-blue-700", CONTACTADO: "bg-slate-100 text-slate-600",
  CUALIFICADO: "bg-emerald-50 text-emerald-700", VISITA_PROGRAMADA: "bg-amber-50 text-amber-700",
  VISITA_REALIZADA: "bg-orange-50 text-orange-700", OFERTA: "bg-violet-50 text-violet-700",
  RESERVA: "bg-cyan-50 text-cyan-700", CIERRE: "bg-emerald-50 text-emerald-800",
  PERDIDO: "bg-red-50 text-red-700",
};

const canalIcons: Record<string, typeof Phone> = {
  TELEFONO: Phone, WHATSAPP: MessageCircle, EMAIL: Mail, PRESENCIAL: User,
};
const canalColors: Record<string, string> = {
  TELEFONO: "bg-emerald-50 text-emerald-700", WHATSAPP: "bg-green-50 text-green-700",
  EMAIL: "bg-blue-50 text-blue-700", PRESENCIAL: "bg-violet-50 text-violet-700",
};

interface Lead {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  faseFunnel: string;
  score: number;
  notas: string | null;
  interacciones: { id: string; canal: string; contenido: string | null; fecha: string }[];
  visitas: { id: string; fecha: string; resultado: string; inmueble: { titulo: string; direccion: string; precio: number } }[];
}

export default function ContactoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [interaccionText, setInteraccionText] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  function fetchLead() {
    fetch(`/api/leads/${id}`)
      .then((r) => r.json())
      .then((res) => setLead(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchLead(); }, [id]);

  async function handleFaseChange(fase: string) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ faseFunnel: fase }),
    });
    setLead((prev) => prev ? { ...prev, faseFunnel: fase } : prev);
    toast("Estado actualizado", "success");
  }

  async function registrarInteraccion(canal: string) {
    if (!interaccionText.trim() && canal !== "PRESENCIAL") {
      // Allow empty for presencial, but require text for others
    }
    setSaving(true);
    const res = await fetch(`/api/leads/${id}/interaccion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canal, contenido: interaccionText || undefined }),
    });
    if (res.ok) {
      toast("Contacto registrado", "success");
      setInteraccionText("");
      fetchLead();
    }
    setSaving(false);
  }

  async function handleVoiceNote(blob: Blob) {
    const formData = new FormData();
    formData.append("audio", blob, "nota-voz.webm");
    formData.append("leadId", id);

    // Find the latest pending visit for this lead
    const pendingVisit = lead?.visitas.find((v) => v.resultado === "PENDIENTE");
    if (pendingVisit) {
      const res = await fetch(`/api/visitas/${pendingVisit.id}/voice-note`, { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        const transcripcion = data.data?.transcripcion;
        if (transcripcion) {
          toast("Nota transcrita y guardada en el historial", "success");
        } else {
          toast("Audio guardado (transcripcion pendiente)", "success");
        }
        fetchLead();
      } else {
        toast("Error al guardar nota de voz", "error");
      }
    } else {
      // Sin visita pendiente: subir audio para transcribir y registrar
      const res = await fetch(`/api/leads/${id}/voice-note`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data?.transcripcion) {
          toast("Nota transcrita y guardada en el historial", "success");
        } else {
          toast("Audio guardado en el historial", "success");
        }
        fetchLead();
      } else {
        toast("Error al procesar nota de voz", "error");
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!lead) return <p className="text-center text-secondary py-8 text-lg">Contacto no encontrado</p>;

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-2 text-base text-secondary hover:text-foreground cursor-pointer">
        <ArrowLeft className="h-5 w-5" /> Volver
      </button>

      {/* Header card */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-start justify-between mb-3">
          <h1 className="text-2xl font-bold text-foreground">{lead.nombre} {lead.apellidos ?? ""}</h1>
          <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${faseColors[lead.faseFunnel] ?? "bg-slate-100 text-slate-600"}`}>
            {FASE_FUNNEL_LABELS[lead.faseFunnel]}
          </span>
        </div>
        {lead.telefono && (
          <p className="text-lg text-secondary flex items-center gap-2 mb-1">
            <Phone className="h-4 w-4" /> {formatPhone(lead.telefono)}
          </p>
        )}
        {lead.email && (
          <p className="text-base text-secondary flex items-center gap-2">
            <Mail className="h-4 w-4" /> {lead.email}
          </p>
        )}

        {/* Big action buttons */}
        {lead.telefono && (
          <div className="flex gap-3 mt-4">
            <a href={`tel:${lead.telefono}`} className="flex-1">
              <Button size="lg" className="w-full gap-2 h-14 text-lg">
                <Phone className="h-6 w-6" /> Llamar
              </Button>
            </a>
            <a href={`https://wa.me/34${lead.telefono.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button size="lg" variant="success" className="w-full gap-2 h-14 text-lg">
                <MessageCircle className="h-6 w-6" /> WhatsApp
              </Button>
            </a>
          </div>
        )}
      </div>

      {/* Estado */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-base font-bold text-foreground mb-2">Estado del contacto</p>
        <select
          value={lead.faseFunnel}
          onChange={(e) => handleFaseChange(e.target.value)}
          className="h-14 w-full rounded-xl border border-border bg-card px-4 text-lg font-semibold text-foreground focus:border-primary focus:outline-none appearance-none cursor-pointer"
        >
          {faseOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Registrar interaccion */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-base font-bold text-foreground mb-3">Registrar contacto</p>
        <textarea
          value={interaccionText}
          onChange={(e) => setInteraccionText(e.target.value)}
          placeholder="Escribe aqui lo que hablaste con el cliente..."
          rows={3}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-foreground placeholder:text-secondary/40 focus:border-primary focus:outline-none resize-none mb-3"
        />
        <div className="grid grid-cols-2 gap-2">
          {[
            { canal: "TELEFONO", label: "Llamada", icon: Phone, variant: "primary" as const },
            { canal: "WHATSAPP", label: "WhatsApp", icon: MessageCircle, variant: "success" as const },
            { canal: "EMAIL", label: "Email", icon: Mail, variant: "secondary" as const },
            { canal: "PRESENCIAL", label: "Presencial", icon: User, variant: "outline" as const },
          ].map((btn) => (
            <Button
              key={btn.canal}
              size="lg"
              variant={btn.variant}
              onClick={() => registrarInteraccion(btn.canal)}
              loading={saving}
              className="gap-2 h-14 text-base"
            >
              <btn.icon className="h-5 w-5" /> {btn.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Nota de voz */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <p className="text-base font-bold text-foreground mb-3">Nota de voz post-visita</p>
        <VoiceNote onRecorded={(blob) => handleVoiceNote(blob)} />
      </div>

      {/* Notas */}
      {lead.notas && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-base font-bold text-foreground mb-2">Notas</p>
          <p className="text-base text-secondary whitespace-pre-wrap">{lead.notas}</p>
        </div>
      )}

      {/* Historial */}
      {lead.interacciones.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-base font-bold text-foreground mb-3">Historial de contacto</p>
          <div className="space-y-1">
            {lead.interacciones.slice(0, 20).map((inter) => {
              const Icon = canalIcons[inter.canal] ?? Clock;
              const color = canalColors[inter.canal] ?? "bg-slate-100 text-slate-600";
              return (
                <div key={inter.id} className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-medium text-foreground">{inter.canal.replace(/_/g, " ")}</span>
                      <span className="text-sm text-secondary">{formatDateTime(inter.fecha)}</span>
                    </div>
                    {inter.contenido && <p className="text-sm text-secondary mt-0.5">{inter.contenido}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Visitas */}
      {lead.visitas.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-base font-bold text-foreground mb-3">Visitas</p>
          <div className="space-y-2">
            {lead.visitas.map((v) => (
              <div key={v.id} className="rounded-xl bg-muted/50 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base font-bold text-foreground">{formatDate(v.fecha)}</span>
                  <Badge variant={v.resultado.includes("INTERESADO") ? "success" : v.resultado === "PENDIENTE" ? "info" : "danger"} size="sm">
                    {RESULTADO_VISITA_LABELS[v.resultado] ?? v.resultado.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-base text-foreground">{v.inmueble.titulo}</p>
                <p className="text-sm text-secondary flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {v.inmueble.direccion}
                </p>
                <p className="text-base font-bold text-primary mt-1">{formatCurrency(Number(v.inmueble.precio))}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
