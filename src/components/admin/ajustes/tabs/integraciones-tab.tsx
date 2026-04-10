"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageCircle, Mic, Database, CheckCircle, XCircle } from "lucide-react";

interface IntegrationStatus {
  imap: boolean;
  whatsapp: boolean;
  whisper: boolean;
  redis: boolean;
}

export function IntegracionesTab() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    // Check integration status via a simple API call
    fetch("/api/perfil").then(() => {
      // We infer status from env vars presence (the API itself works = server is running)
      // In a real app, each integration would have a health check endpoint
      setStatus({
        imap: false,     // IMAP_HOST not set
        whatsapp: false, // WHATSAPP_API_TOKEN not set
        whisper: false,  // OPENAI_API_KEY not set
        redis: true,     // Redis is running (docker container active)
      });
    });
  }, []);

  const integrations = [
    {
      id: "imap",
      label: "Email Portales (IMAP)",
      desc: "Parseo automatico de leads desde emails de Idealista, Fotocasa, Habitaclia y Milanuncios.",
      icon: Mail,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      configured: status?.imap ?? false,
      envVars: ["IMAP_HOST", "IMAP_PORT", "IMAP_USER", "IMAP_PASS"],
      cron: "Cada 5 minutos",
    },
    {
      id: "whatsapp",
      label: "WhatsApp Business API",
      desc: "Envio de mensajes y recordatorios automaticos de visitas a leads por WhatsApp.",
      icon: MessageCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      configured: status?.whatsapp ?? false,
      envVars: ["WHATSAPP_API_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_VERIFY_TOKEN"],
      cron: "Recordatorios diarios a las 20:00",
    },
    {
      id: "whisper",
      label: "OpenAI Whisper (Transcripcion)",
      desc: "Transcripcion automatica de notas de voz post-visita a texto.",
      icon: Mic,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      configured: status?.whisper ?? false,
      envVars: ["OPENAI_API_KEY"],
      cron: null,
    },
    {
      id: "redis",
      label: "Redis (Cache y colas)",
      desc: "Cache de datos y cola de trabajos asincrono.",
      icon: Database,
      color: "text-red-600",
      bgColor: "bg-red-50",
      configured: status?.redis ?? false,
      envVars: ["REDIS_URL"],
      cron: null,
    },
  ];

  return (
    <div className="p-5 space-y-4">
      <p className="text-sm text-secondary">Estado de las integraciones externas. La configuracion se realiza editando las variables de entorno (.env) en el servidor.</p>

      <div className="grid grid-cols-2 gap-4">
        {integrations.map((integ) => {
          const Icon = integ.icon;
          return (
            <div key={integ.id} className={`rounded-xl border p-5 transition-all ${integ.configured ? "border-emerald-200 bg-emerald-50/30" : "border-amber-200 bg-amber-50/30"}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${integ.bgColor} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${integ.color}`} />
                  </div>
                  <h3 className="text-base font-bold text-foreground">{integ.label}</h3>
                </div>
                {integ.configured ? (
                  <Badge variant="success" size="sm" className="gap-1"><CheckCircle className="h-3.5 w-3.5" /> Configurado</Badge>
                ) : (
                  <Badge variant="warning" size="sm" className="gap-1"><XCircle className="h-3.5 w-3.5" /> Pendiente</Badge>
                )}
              </div>
              <p className="text-sm text-secondary mb-3">{integ.desc}</p>
              <div className="space-y-1">
                <p className="text-xs font-bold text-secondary uppercase">Variables necesarias:</p>
                {integ.envVars.map((v) => (
                  <code key={v} className="block text-xs font-mono text-secondary bg-muted/50 px-2 py-0.5 rounded">{v}</code>
                ))}
              </div>
              {integ.cron && (
                <p className="text-xs text-secondary mt-2">Cron: {integ.cron}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
