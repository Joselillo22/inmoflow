"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { Target, Save, AlertTriangle } from "lucide-react";

interface Config {
  scraperActivo: boolean;
  idealista: boolean;
  fotocasa: boolean;
  milanuncios: boolean;
  operacionVenta: boolean;
  operacionAlquiler: boolean;
  nombreInmo: string;
  telefonoAgente: string | null;
  plantillaWhatsApp: string | null;
  zonasActivas: string[];
}

const ZONAS_DISPONIBLES = [
  { key: "alicante", label: "Alicante" },
  { key: "san-juan-de-alicante", label: "San Juan de Alicante" },
  { key: "el-campello", label: "El Campello" },
  { key: "mutxamel", label: "Mutxamel" },
  { key: "san-vicente-del-raspeig", label: "San Vicente del Raspeig" },
  { key: "santa-pola", label: "Santa Pola" },
  { key: "elche", label: "Elche (Elx)" },
  { key: "crevillente", label: "Crevillente" },
  { key: "aspe", label: "Aspe" },
  { key: "jijona", label: "Jijona (Xixona)" },
];

export function CaptacionTab() {
  const { toast } = useToast();
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/captacion/configuracion").then((r) => r.ok ? r.json() : { data: null })
      .then((d) => setConfig(d.data));
  }, []);

  function update<K extends keyof Config>(key: K, value: Config[K]) {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  }

  async function guardar() {
    if (!config) return;
    setSaving(true);
    const res = await fetch("/api/captacion/configuracion", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      toast("Configuración guardada", "success");
    } else {
      toast("Error al guardar", "error");
    }
    setSaving(false);
  }

  if (!config) return <div className="p-6 text-sm text-secondary">Cargando...</div>;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        <h2 className="text-base font-semibold text-foreground">Configuración de captación</h2>
      </div>

      {/* Scraper */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.scraperActivo}
            onChange={(e) => update("scraperActivo", e.target.checked)}
            className="w-4 h-4"
          />
          <div>
            <p className="text-sm font-medium text-foreground">Ejecutar scraper Apify automáticamente</p>
            <p className="text-xs text-secondary">Diario a las 06:00 · detecta FSBO nuevos en los portales activos</p>
          </div>
        </label>
      </div>

      {/* Portales */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Portales activos</p>
        <div className="space-y-2">
          {[
            { key: "idealista" as const, label: "Idealista", color: "text-violet-700" },
            { key: "fotocasa" as const, label: "Fotocasa", color: "text-blue-700" },
            { key: "milanuncios" as const, label: "Milanuncios", color: "text-emerald-700" },
          ].map(({ key, label, color }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={config[key]} onChange={(e) => update(key, e.target.checked)} className="w-4 h-4" />
              <span className={`text-sm font-medium ${color}`}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Zonas */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Zonas a escanear</p>
          <span className="text-xs text-secondary">{config.zonasActivas?.length ?? 0} seleccionadas</span>
        </div>
        <p className="text-xs text-secondary">Cada zona multiplica el número de runs Apify (N_zonas × operaciones × portales). Marca solo las que te interesen.</p>
        <div className="grid grid-cols-2 gap-2">
          {ZONAS_DISPONIBLES.map(({ key, label }) => {
            const active = (config.zonasActivas ?? []).includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  const zonas = config.zonasActivas ?? [];
                  if (active) update("zonasActivas", zonas.filter((z) => z !== key));
                  else update("zonasActivas", [...zonas, key]);
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left text-sm transition-colors cursor-pointer ${
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <span className={active ? "font-medium text-foreground" : "text-secondary"}>{label}</span>
                {active && <span className="text-primary">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Operaciones */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Operaciones a detectar</p>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.operacionVenta} onChange={(e) => update("operacionVenta", e.target.checked)} />
            <span className="text-sm">Venta</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={config.operacionAlquiler} onChange={(e) => update("operacionAlquiler", e.target.checked)} />
            <span className="text-sm">Alquiler</span>
          </label>
        </div>
      </div>

      {/* Inmo + agente */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Datos de la inmobiliaria</p>
        <div className="grid grid-cols-2 gap-3">
          <Input id="nombreInmo" label="Nombre comercial" value={config.nombreInmo} onChange={(e) => update("nombreInmo", e.target.value)} />
          <Input id="telefonoAgente" label="Teléfono de contacto" value={config.telefonoAgente ?? ""} onChange={(e) => update("telefonoAgente", e.target.value)} placeholder="+34 600 123 456" />
        </div>
      </div>

      {/* Plantilla WhatsApp */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Plantilla WhatsApp</p>
          <span className="text-[10px] text-secondary">Variables: {`{nombre} {tipo} {localidad} {portal} {agente} {inmo}`}</span>
        </div>
        <Textarea value={config.plantillaWhatsApp ?? ""} onChange={(e) => update("plantillaWhatsApp", e.target.value)} rows={8} />
        <p className="text-xs text-secondary">Usa esta plantilla como base. Cada comercial puede personalizarla antes de enviar desde la oportunidad.</p>
      </div>

      {/* Aviso RGPD */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Aviso legal (RGPD / LSSI-CE)</p>
            <p>El envío de comunicaciones comerciales a particulares requiere base legal. No se envía nada de forma automática: cada mensaje lo revisa y envía manualmente el comercial desde su WhatsApp personal. Los datos del propietario se conservan mientras la oportunidad esté activa.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={guardar} disabled={saving} className="gap-1.5">
          <Save className="h-4 w-4" /> {saving ? "Guardando..." : "Guardar configuración"}
        </Button>
      </div>
    </div>
  );
}
