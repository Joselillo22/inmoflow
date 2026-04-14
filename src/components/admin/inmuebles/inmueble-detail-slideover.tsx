"use client";

import { useEffect, useState, useCallback } from "react";
import { SlideOver } from "@/components/ui/slide-over";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { EstadoSelector } from "./estado-selector";
import { PhotoGallery } from "./photo-gallery";
import { PublicationManager } from "./publication-manager";
import { DocumentManager } from "./document-manager";
import { MapPin, BedDouble, Bath, Ruler, Building2, Calculator, Search, Loader2, Sparkles, RefreshCw, Languages, ChevronDown, ChevronUp, X, Check } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { TIPO_INMUEBLE_LABELS, TIPO_OPERACION_LABELS, RESULTADO_VISITA_LABELS } from "@/lib/utils/constants";
import type { InmuebleDetail } from "@/lib/types/inmueble";
import { MapaInmueble } from "@/components/shared/MapaInmuebleDynamic";
import { CalculadoraFiscalModal } from "./calculadora-fiscal-modal";

interface InmuebleDetailSlideOverProps {
  inmuebleId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

const tipoOptions = Object.entries(TIPO_INMUEBLE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const opOptions = Object.entries(TIPO_OPERACION_LABELS).map(([v, l]) => ({ value: v, label: l }));

const extrasFields = [
  { key: "ascensor", label: "Ascensor" },
  { key: "garaje", label: "Garaje" },
  { key: "trastero", label: "Trastero" },
  { key: "piscina", label: "Piscina" },
  { key: "terraza", label: "Terraza" },
  { key: "aireAcondicionado", label: "A/C" },
  { key: "calefaccion", label: "Calefaccion" },
];

const IDIOMAS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "no", label: "Norsk", flag: "🇳🇴" },
];

export function InmuebleDetailSlideOver({ inmuebleId, onClose, onUpdated }: InmuebleDetailSlideOverProps) {
  const [inm, setInm] = useState<InmuebleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ficha");
  const [showCalculadora, setShowCalculadora] = useState(false);
  const [consultandoCatastro, setConsultandoCatastro] = useState(false);
  const { toast } = useToast();

  // Descripcion controlada para IA
  const [descripcion, setDescripcion] = useState("");
  const [generadaPorIA, setGeneradaPorIA] = useState(false);

  // Modal IA
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiText, setAiText] = useState("");

  // Traducciones
  const [tradOpen, setTradOpen] = useState(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingAll, setTranslatingAll] = useState(false);
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);

  const fetchInmueble = useCallback(async () => {
    if (!inmuebleId) return;
    setLoading(true);
    const res = await fetch(`/api/inmuebles/${inmuebleId}`);
    if (res.ok) {
      const data = await res.json();
      setInm(data.data);
      setDescripcion(data.data.descripcion ?? "");
      setGeneradaPorIA(data.data.descripcionGeneradaPorIA ?? false);
      const t: Record<string, string> = {};
      for (const { code } of IDIOMAS) {
        const key = `descripcion${code.charAt(0).toUpperCase() + code.slice(1)}` as keyof typeof data.data;
        if (data.data[key]) t[code] = data.data[key] as string;
      }
      setTranslations(t);
    }
    setLoading(false);
  }, [inmuebleId]);

  useEffect(() => {
    if (inmuebleId) {
      setActiveTab("ficha");
      fetchInmueble();
    }
  }, [inmuebleId, fetchInmueble]);

  async function handleEstadoChange(estado: string) {
    if (!inmuebleId) return;
    const res = await fetch(`/api/inmuebles/${inmuebleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    if (res.ok) { fetchInmueble(); onUpdated?.(); toast("Estado actualizado", "success"); }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!inmuebleId) return;
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {};
    for (const [key, value] of fd.entries()) {
      if (key === "precio" || key === "metrosConstruidos" || key === "metrosUtiles" || key === "habitaciones" || key === "banos" || key === "planta" || key === "anoConst") {
        if (value) body[key] = Number(value);
      } else if (value) {
        body[key] = value;
      }
    }
    // Extras checkboxes
    extrasFields.forEach(({ key }) => {
      body[key] = fd.get(key) === "on";
    });
    // Descripción controlada + traducciones
    body.descripcion = descripcion;
    body.descripcionGeneradaPorIA = generadaPorIA;
    for (const { code } of IDIOMAS) {
      const key = `descripcion${code.charAt(0).toUpperCase() + code.slice(1)}`;
      if (translations[code]) body[key] = translations[code];
    }

    const res = await fetch(`/api/inmuebles/${inmuebleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { fetchInmueble(); onUpdated?.(); toast("Datos guardados", "success"); }
  }

  async function generateAI() {
    if (!inmuebleId) return;
    setAiGenerating(true);
    setAiText("");
    setAiModalOpen(true);
    try {
      const res = await fetch(`/api/inmuebles/${inmuebleId}/descripcion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idioma: "es" }),
      });
      const data = await res.json();
      if (res.ok) {
        setAiText(data.descripcion);
      } else {
        toast(data.error ?? "Error al generar", "error");
        setAiModalOpen(false);
      }
    } catch {
      toast("Error de conexión", "error");
      setAiModalOpen(false);
    } finally {
      setAiGenerating(false);
    }
  }

  function useAIText() {
    setDescripcion(aiText);
    setGeneradaPorIA(true);
    setAiModalOpen(false);
    toast("Descripción aplicada. Pulsa Guardar.", "success");
  }

  async function translateLang(code: string) {
    if (!inmuebleId || !descripcion) return;
    setTranslatingLang(code);
    try {
      const res = await fetch(`/api/inmuebles/${inmuebleId}/descripcion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idioma: code }),
      });
      const data = await res.json();
      if (res.ok) setTranslations((prev) => ({ ...prev, [code]: data.descripcion }));
    } catch { /* ignore */ }
    setTranslatingLang(null);
  }

  async function translateAll() {
    if (!inmuebleId || !descripcion) { toast("Primero escribe o genera la descripción en español", "error"); return; }
    setTranslatingAll(true);
    try {
      const res = await fetch(`/api/inmuebles/${inmuebleId}/descripcion/todas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok && data.descripciones) {
        const newT: Record<string, string> = {};
        for (const { code } of IDIOMAS) {
          if (data.descripciones[code]) newT[code] = data.descripciones[code];
        }
        setTranslations(newT);
        toast("Traducciones generadas", "success");
      }
    } catch { /* ignore */ }
    setTranslatingAll(false);
  }

  async function consultarCatastro() {
    if (!inm?.refCatastral) { toast("Introduce la referencia catastral primero", "error"); return; }
    setConsultandoCatastro(true);
    try {
      const res = await fetch("/api/catastro/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenciaCatastral: inm.refCatastral }),
      });
      const data = await res.json();
      if (!res.ok) { toast(data.error ?? "Error al consultar Catastro", "error"); return; }
      if (data.datos) {
        const d = data.datos;
        const updates: Record<string, unknown> = {};
        if (d.superficie && !inm.metrosConstruidos) updates.metrosConstruidos = d.superficie;
        if (d.anoConst && !inm.anoConst) updates.anoConst = d.anoConst;
        if (d.latitud && d.longitud) { updates.latitud = d.latitud; updates.longitud = d.longitud; }
        if (Object.keys(updates).length > 0) {
          await fetch(`/api/inmuebles/${inmuebleId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates),
          });
          fetchInmueble();
          toast("Datos actualizados desde Catastro", "success");
        } else {
          toast("Catastro consultado — no hay datos nuevos para rellenar", "success");
        }
      }
    } catch {
      toast("Error de conexión con Catastro", "error");
    } finally {
      setConsultandoCatastro(false);
    }
  }

  const tabs = [
    { id: "ficha", label: "Ficha" },
    { id: "fotos", label: "Fotos", count: inm?._count.fotos },
    { id: "docs", label: "Docs", count: inm?._count.documentos },
    { id: "portales", label: "Portales", count: inm?._count.publicaciones },
    { id: "visitas", label: "Visitas", count: inm?._count.visitas },
  ];

  const principalFoto = inm?.fotos.find((f) => f.esPrincipal) ?? inm?.fotos[0];

  return (
    <SlideOver open={!!inmuebleId} onClose={onClose} width="w-[600px]">
      {loading || !inm ? (
        <div className="p-5 space-y-4">
          <Skeleton className="w-full h-40 rounded-xl" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Banner */}
          <div className="relative h-44 bg-gradient-to-br from-slate-200 to-slate-100 shrink-0">
            {principalFoto ? (
              <img src={principalFoto.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="h-12 w-12 text-secondary/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-4 right-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white/70 text-[10px] font-mono">{inm.referencia}</span>
                <EstadoSelector value={inm.estado} onChange={handleEstadoChange} />
              </div>
              <p className="text-white text-lg font-bold leading-tight">{formatCurrency(Number(inm.precio))}</p>
              {inm.operacion === "ALQUILER" && <span className="text-white/60 text-xs">/mes</span>}
            </div>
          </div>

          {/* Quick info */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold text-foreground mb-1">{inm.titulo}</p>
            <p className="text-xs text-secondary flex items-center gap-1 mb-2">
              <MapPin className="h-3 w-3" /> {inm.direccion}, {inm.localidad}
            </p>
            <div className="flex gap-3">
              {[
                { icon: Ruler, value: inm.metrosConstruidos ? `${inm.metrosConstruidos}m²` : null },
                { icon: BedDouble, value: inm.habitaciones ? `${inm.habitaciones} hab` : null },
                { icon: Bath, value: inm.banos ? `${inm.banos} ban` : null },
              ].filter((i) => i.value).map((item, idx) => (
                <span key={idx} className="flex items-center gap-1 text-xs text-secondary">
                  <item.icon className="h-3 w-3" /> {item.value}
                </span>
              ))}
              <Badge variant="outline" size="sm">{TIPO_INMUEBLE_LABELS[inm.tipo]}</Badge>
              <Badge variant="outline" size="sm">{TIPO_OPERACION_LABELS[inm.operacion]}</Badge>
            </div>
          </div>

          {/* Tabs */}
          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="px-4" />

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "ficha" && (
              <form onSubmit={handleSave} className="p-4 space-y-4">
                <Input id="titulo" name="titulo" label="Titulo" defaultValue={inm.titulo} compact />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      Descripción
                      {generadaPorIA && <Badge size="sm" variant="info" className="text-[9px]">IA</Badge>}
                    </label>
                    <button
                      type="button"
                      onClick={generateAI}
                      className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3" /> Generar con IA
                    </button>
                  </div>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={4}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground resize-none"
                  />
                </div>

                {/* Traducciones */}
                <div className="border border-border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setTradOpen(!tradOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-muted cursor-pointer"
                  >
                    <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <Languages className="h-3.5 w-3.5" /> Traducciones ({Object.keys(translations).length}/6)
                    </span>
                    {tradOpen ? <ChevronUp className="h-3.5 w-3.5 text-secondary" /> : <ChevronDown className="h-3.5 w-3.5 text-secondary" />}
                  </button>
                  {tradOpen && (
                    <div className="p-3 space-y-2">
                      <button
                        type="button"
                        onClick={translateAll}
                        disabled={translatingAll || !descripcion}
                        className="text-[11px] font-semibold text-primary hover:text-primary/80 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {translatingAll ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                        {translatingAll ? "Traduciendo..." : "Traducir todos"}
                      </button>
                      {IDIOMAS.map(({ code, label, flag }) => (
                        <div key={code}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium">{flag} {label}</span>
                            {!translations[code] && (
                              <button
                                type="button"
                                onClick={() => translateLang(code)}
                                disabled={translatingLang === code || !descripcion}
                                className="text-[10px] text-primary cursor-pointer disabled:opacity-50"
                              >
                                {translatingLang === code ? "..." : "Traducir"}
                              </button>
                            )}
                            {translations[code] && <Check className="h-3 w-3 text-emerald-500" />}
                          </div>
                          {translations[code] && (
                            <textarea
                              value={translations[code]}
                              onChange={(e) => setTranslations((prev) => ({ ...prev, [code]: e.target.value }))}
                              rows={2}
                              className="w-full border border-border/50 rounded px-2 py-1 text-[11px] bg-muted/30 resize-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select id="tipo" name="tipo" label="Tipo" options={tipoOptions} defaultValue={inm.tipo} compact />
                  <Select id="operacion" name="operacion" label="Operacion" options={opOptions} defaultValue={inm.operacion} compact />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input id="precio" name="precio" label="Precio" type="number" defaultValue={Number(inm.precio)} compact />
                  <Input id="metrosConstruidos" name="metrosConstruidos" label="m² construidos" type="number" defaultValue={inm.metrosConstruidos ?? ""} compact />
                  <Input id="metrosUtiles" name="metrosUtiles" label="m² utiles" type="number" defaultValue={inm.metrosUtiles ?? ""} compact />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Input id="habitaciones" name="habitaciones" label="Habitaciones" type="number" defaultValue={inm.habitaciones ?? ""} compact />
                  <Input id="banos" name="banos" label="Banos" type="number" defaultValue={inm.banos ?? ""} compact />
                  <Input id="planta" name="planta" label="Planta" type="number" defaultValue={inm.planta ?? ""} compact />
                </div>
                <Input id="direccion" name="direccion" label="Direccion" defaultValue={inm.direccion} compact />
                <div className="grid grid-cols-2 gap-3">
                  <Input id="localidad" name="localidad" label="Localidad" defaultValue={inm.localidad} compact />
                  <Input id="codigoPostal" name="codigoPostal" label="CP" defaultValue={inm.codigoPostal ?? ""} compact />
                </div>

                {/* Extras */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-2 block">Extras</label>
                  <div className="grid grid-cols-4 gap-2">
                    {extrasFields.map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer">
                        <input type="checkbox" name={key} defaultChecked={!!(inm as unknown as Record<string, unknown>)[key]} className="rounded" />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Datos legales */}
                <div className="border-t border-border pt-4 mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-foreground">Datos legales</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCalculadora(true)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-semibold transition-colors cursor-pointer"
                      >
                        <Calculator className="h-3 w-3" />
                        Calculadora fiscal
                      </button>
                      <button
                        type="button"
                        onClick={consultarCatastro}
                        disabled={consultandoCatastro}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {consultandoCatastro ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
                        Consultar Catastro
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input id="refCatastral" name="refCatastral" label="Ref. catastral" defaultValue={inm.refCatastral ?? ""} compact />
                    <Input id="certEnergetico" name="certEnergetico" label="Cert. energetico" defaultValue={inm.certEnergetico ?? ""} compact />
                    <Input id="anoConst" name="anoConst" label="Ano construccion" type="number" defaultValue={inm.anoConst ?? ""} compact />
                    <Input id="licenciaTuristica" name="licenciaTuristica" label="Lic. turistica" defaultValue={inm.licenciaTuristica ?? ""} compact />
                  </div>
                </div>

                {/* Propietario & Comercial */}
                <div className="border-t border-border pt-4 mt-4 space-y-3">
                  {inm.propietario && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted">
                      <Avatar name={`${inm.propietario.nombre} ${inm.propietario.apellidos ?? ""}`} size="sm" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">{inm.propietario.nombre} {inm.propietario.apellidos ?? ""}</p>
                        {inm.propietario.telefono && <p className="text-[10px] text-secondary">{inm.propietario.telefono}</p>}
                      </div>
                      <Badge size="sm" variant="default">Propietario</Badge>
                    </div>
                  )}
                  {inm.comercial && (
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted">
                      <Avatar name={`${inm.comercial.usuario.nombre} ${inm.comercial.usuario.apellidos}`} size="sm" />
                      <p className="text-xs font-medium flex-1">{inm.comercial.usuario.nombre} {inm.comercial.usuario.apellidos}</p>
                      <Badge size="sm" variant="info">Comercial</Badge>
                    </div>
                  )}
                </div>

                {/* Mapa */}
                <div className="border-t border-border pt-4 mt-4">
                  <p className="text-xs font-semibold text-foreground mb-3">Mapa</p>
                  <MapaInmueble
                    latitud={inm.latitud}
                    longitud={inm.longitud}
                    direccion={`${inm.direccion}, ${inm.localidad}`}
                    titulo={inm.titulo}
                    precio={Number(inm.precio)}
                    altura={300}
                    modo="full"
                  />
                </div>

                <Button type="submit" size="sm" className="mt-4">Guardar cambios</Button>
              </form>
            )}

            {activeTab === "fotos" && (
              <PhotoGallery inmuebleId={inm.id} fotos={inm.fotos} onUpdate={fetchInmueble} />
            )}

            {activeTab === "docs" && (
              <DocumentManager inmuebleId={inm.id} documentos={inm.documentos} onUpdate={fetchInmueble} />
            )}

            {activeTab === "portales" && (
              <PublicationManager inmuebleId={inm.id} publicaciones={inm.publicaciones} onUpdate={fetchInmueble} />
            )}

            {activeTab === "visitas" && (
              <div className="p-4 space-y-3">
                {inm.visitas.map((v) => (
                  <div key={v.id} className="rounded-xl border border-border/50 bg-white/60 p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">{formatDate(v.fecha)}</span>
                      <Badge size="sm" variant={v.resultado.includes("INTERESADO") ? "success" : v.resultado === "CANCELADA" || v.resultado === "NO_SHOW" ? "danger" : "default"}>
                        {RESULTADO_VISITA_LABELS[v.resultado] ?? v.resultado}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">{v.lead.nombre} {v.lead.apellidos ?? ""}</p>
                    {v.lead.telefono && <p className="text-[10px] text-secondary">{v.lead.telefono}</p>}
                  </div>
                ))}
                {inm.visitas.length === 0 && (
                  <p className="text-xs text-secondary text-center py-8">Sin visitas registradas</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal IA Preview */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Descripción generada
              </h3>
              <button onClick={() => setAiModalOpen(false)} className="text-secondary hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {aiGenerating ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                  <p className="text-sm text-secondary">Generando descripción...</p>
                </div>
              ) : (
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{aiText}</p>
              )}
            </div>
            {!aiGenerating && aiText && (
              <div className="flex gap-2 p-4 border-t border-border">
                <Button type="button" size="sm" variant="ghost" onClick={() => setAiModalOpen(false)}>Cancelar</Button>
                <Button type="button" size="sm" variant="outline" onClick={generateAI} className="gap-1">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerar
                </Button>
                <Button type="button" size="sm" onClick={useAIText} className="gap-1">
                  <Check className="h-3.5 w-3.5" /> Usar esta
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <CalculadoraFiscalModal
        open={showCalculadora}
        onClose={() => setShowCalculadora(false)}
        precioInicial={inm ? Number(inm.precio) : undefined}
      />
    </SlideOver>
  );
}
