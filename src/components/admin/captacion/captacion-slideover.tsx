"use client";

import { useCallback, useEffect, useState } from "react";
import { SlideOver } from "@/components/ui/slide-over";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  ExternalLink, Phone, MessageCircle, UserPlus, XCircle, Handshake,
  MapPin, Euro, BedDouble, Ruler, Building2, Copy, Check, ChevronRight,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { ValoracionResultCard, type ValoracionInput } from "@/components/admin/valoracion/valoracion-card";

const FASES = [
  { value: "NUEVA", label: "Nueva" },
  { value: "CONTACTADA", label: "Contactada" },
  { value: "VISITA_PROGRAMADA", label: "Visita prog." },
  { value: "VISITADA", label: "Visitada" },
  { value: "VALORACION_PRESENTADA", label: "Valoración" },
  { value: "PROPUESTA_MANDATO", label: "Propuesta" },
  { value: "MANDATO_FIRMADO", label: "Mandato" },
];

const MOTIVOS_DESCARTE = [
  "Ya vendido/alquilado",
  "Precio irreal",
  "No quiere agencia",
  "Ya trabaja con otra agencia",
  "No contesta",
  "Inmueble no apto",
  "Otro",
];

interface CaptacionDetalle {
  id: string;
  urlAnuncio: string | null;
  portal: string;
  operacion: string;
  estado: string;
  titulo: string | null;
  descripcionOriginal: string | null;
  precio: string | null;
  direccionAproximada: string | null;
  localidad: string | null;
  codigoPostal: string | null;
  tipoInmueble: string | null;
  habitaciones: number | null;
  banos: number | null;
  metrosConstruidos: number | null;
  planta: number | null;
  extras: Record<string, unknown> | null;
  fotos: string[] | null;
  nombrePropietario: string | null;
  telefonoPropietario: string | null;
  emailPropietario: string | null;
  motivoDescarte: string | null;
  comercialId: string | null;
  inmuebleId: string | null;
  fechaDeteccion: string;
  fechaPrimerContacto: string | null;
  fechaVisita: string | null;
  fechaValoracion: string | null;
  fechaPropuesta: string | null;
  fechaMandato: string | null;
  notas: string | null;
  comercial: { id: string; usuario: { nombre: string; apellidos: string; email: string } } | null;
}

interface ComercialOption {
  id: string;
  usuario: { nombre: string; apellidos: string };
}

interface Configuracion {
  nombreInmo: string;
  telefonoAgente: string | null;
  plantillaWhatsApp: string | null;
}

interface Props {
  oportunidadId: string | null;
  onClose: () => void;
  onUpdated?: () => void;
}

export function CaptacionSlideOver({ oportunidadId, onClose, onUpdated }: Props) {
  const { toast } = useToast();
  const [opp, setOpp] = useState<CaptacionDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("datos");
  const [comerciales, setComerciales] = useState<ComercialOption[]>([]);
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [showDescartar, setShowDescartar] = useState(false);
  const [motivoDescarte, setMotivoDescarte] = useState("");
  const [motivoOtro, setMotivoOtro] = useState("");
  const [saving, setSaving] = useState(false);
  const [notasEdit, setNotasEdit] = useState("");
  const [copiado, setCopiado] = useState(false);

  const fetchOportunidad = useCallback(async () => {
    if (!oportunidadId) return;
    setLoading(true);
    const res = await fetch(`/api/captacion/${oportunidadId}`);
    if (res.ok) {
      const data = await res.json();
      setOpp(data.data);
      setNotasEdit(data.data.notas ?? "");
    }
    setLoading(false);
  }, [oportunidadId]);

  useEffect(() => {
    if (oportunidadId) {
      setActiveTab("datos");
      setShowDescartar(false);
      fetchOportunidad();
    }
  }, [oportunidadId, fetchOportunidad]);

  useEffect(() => {
    fetch("/api/comerciales?activo=true").then((r) => r.ok ? r.json() : { data: [] })
      .then((d) => setComerciales(d.data ?? []));
    fetch("/api/captacion/configuracion").then((r) => r.ok ? r.json() : { data: null })
      .then((d) => setConfig(d.data));
  }, []);

  async function cambiarEstado(nuevoEstado: string) {
    if (!oportunidadId) return;
    setSaving(true);
    const res = await fetch(`/api/captacion/${oportunidadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (res.ok) {
      toast("Estado actualizado", "success");
      fetchOportunidad();
      onUpdated?.();
    } else {
      toast("No se pudo actualizar", "error");
    }
    setSaving(false);
  }

  async function asignarComercial(comercialId: string) {
    if (!oportunidadId) return;
    setSaving(true);
    const res = await fetch(`/api/captacion/${oportunidadId}/asignar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comercialId }),
    });
    if (res.ok) {
      toast("Comercial asignado", "success");
      fetchOportunidad();
      onUpdated?.();
    } else {
      toast("Error al asignar", "error");
    }
    setSaving(false);
  }

  async function descartar() {
    if (!oportunidadId || !motivoDescarte) return;
    const motivo = motivoDescarte === "Otro" ? motivoOtro.trim() : motivoDescarte;
    if (!motivo) {
      toast("Introduce el motivo", "error");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/captacion/${oportunidadId}/descartar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });
    if (res.ok) {
      toast("Oportunidad descartada", "success");
      setShowDescartar(false);
      fetchOportunidad();
      onUpdated?.();
    } else {
      toast("Error al descartar", "error");
    }
    setSaving(false);
  }

  async function convertirAInmueble() {
    if (!oportunidadId) return;
    if (!confirm("Se creará un Inmueble con los datos de esta oportunidad. ¿Continuar?")) return;
    setSaving(true);
    const res = await fetch(`/api/captacion/${oportunidadId}/convertir`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      toast("Inmueble creado", "success");
      fetchOportunidad();
      onUpdated?.();
    } else {
      toast(data.error ?? "Error al convertir", "error");
    }
    setSaving(false);
  }

  async function guardarNotas() {
    if (!oportunidadId) return;
    setSaving(true);
    const res = await fetch(`/api/captacion/${oportunidadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notas: notasEdit }),
    });
    if (res.ok) {
      toast("Notas guardadas", "success");
      fetchOportunidad();
    }
    setSaving(false);
  }

  function construirMensaje(): string {
    const template = config?.plantillaWhatsApp ?? "";
    const agente = config?.telefonoAgente ? `el equipo` : "el equipo";
    return template
      .replace(/\{nombre\}/g, opp?.nombrePropietario ?? "")
      .replace(/\{localidad\}/g, opp?.localidad ?? "")
      .replace(/\{tipo\}/g, opp?.tipoInmueble ?? "inmueble")
      .replace(/\{portal\}/g, opp?.portal ?? "")
      .replace(/\{agente\}/g, agente)
      .replace(/\{inmo\}/g, config?.nombreInmo ?? "Entra y más");
  }

  function abrirWhatsApp() {
    if (!opp?.telefonoPropietario) {
      toast("No hay teléfono registrado", "error");
      return;
    }
    const tel = opp.telefonoPropietario.replace(/\D/g, "");
    const telFull = tel.startsWith("34") ? tel : `34${tel}`;
    const msg = encodeURIComponent(construirMensaje());
    window.open(`https://wa.me/${telFull}?text=${msg}`, "_blank");
  }

  async function copiarPlantilla() {
    const texto = construirMensaje();
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
    toast("Plantilla copiada", "success");
  }

  const tabs = [
    { id: "datos", label: "Datos" },
    { id: "pipeline", label: "Pipeline" },
    { id: "acciones", label: "Acciones" },
  ];

  return (
    <SlideOver open={!!oportunidadId} onClose={onClose} width="w-[640px]">
      {loading || !opp ? (
        <div className="p-5 space-y-4">
          <Skeleton className="w-full h-32 rounded-xl" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 border-b border-border shrink-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge size="sm" variant="info">{opp.portal}</Badge>
                  <Badge size="sm" variant={opp.operacion === "VENTA" ? "default" : "outline"}>{opp.operacion === "VENTA" ? "Venta" : "Alquiler"}</Badge>
                </div>
                <h2 className="text-base font-semibold text-foreground">{opp.titulo ?? opp.tipoInmueble ?? "Sin título"}</h2>
                <p className="text-sm text-secondary flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" /> {opp.direccionAproximada ?? opp.localidad ?? "—"}
                </p>
              </div>
              {opp.precio && (
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-primary">{formatCurrency(Number(opp.precio))}</p>
                  {opp.operacion === "ALQUILER" && <p className="text-[10px] text-secondary">/mes</p>}
                </div>
              )}
            </div>

            {opp.inmuebleId && (
              <div className="mt-2 p-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" /> Convertida a inmueble
                <a href={`/inmuebles?id=${opp.inmuebleId}`} className="underline ml-auto">Ver ficha</a>
              </div>
            )}
          </div>

          <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="px-4" />

          <div className="flex-1 overflow-y-auto">
            {activeTab === "datos" && (
              <div className="p-4 space-y-4">
                {/* Fotos */}
                {Array.isArray(opp.fotos) && opp.fotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {opp.fotos.slice(0, 6).map((url, i) => (
                      <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Datos inmueble */}
                <div className="bg-muted/30 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Inmueble</p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div><span className="text-secondary">Tipo:</span> <span className="font-medium">{opp.tipoInmueble ?? "—"}</span></div>
                    <div><span className="text-secondary">Localidad:</span> <span className="font-medium">{opp.localidad ?? "—"}</span></div>
                    <div><span className="text-secondary">Habitaciones:</span> <span className="font-medium">{opp.habitaciones ?? "—"}</span></div>
                    <div><span className="text-secondary">Baños:</span> <span className="font-medium">{opp.banos ?? "—"}</span></div>
                    <div><span className="text-secondary">m² construidos:</span> <span className="font-medium">{opp.metrosConstruidos ?? "—"}</span></div>
                    <div><span className="text-secondary">Planta:</span> <span className="font-medium">{opp.planta ?? "—"}</span></div>
                    <div><span className="text-secondary">CP:</span> <span className="font-medium">{opp.codigoPostal ?? "—"}</span></div>
                    <div><span className="text-secondary">Detectada:</span> <span className="font-medium">{formatDate(opp.fechaDeteccion)}</span></div>
                  </div>
                </div>

                {/* Propietario */}
                <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Propietario</p>
                  <p className="text-sm"><span className="text-secondary">Nombre:</span> <span className="font-medium">{opp.nombrePropietario ?? "—"}</span></p>
                  <p className="text-sm"><span className="text-secondary">Teléfono:</span> <span className="font-medium">{opp.telefonoPropietario ?? "—"}</span></p>
                  <p className="text-sm"><span className="text-secondary">Email:</span> <span className="font-medium">{opp.emailPropietario ?? "—"}</span></p>
                </div>

                {/* Anuncio original */}
                {opp.urlAnuncio && (
                  <a href={opp.urlAnuncio} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-border hover:bg-muted/50 transition-colors text-sm text-primary">
                    <span className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" /> Ver anuncio original
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </a>
                )}

                {opp.descripcionOriginal && (
                  <div className="bg-white/50 rounded-xl p-3 border border-border/40">
                    <p className="text-xs font-semibold text-foreground mb-1.5">Descripción del anuncio</p>
                    <p className="text-sm text-secondary whitespace-pre-wrap">{opp.descripcionOriginal}</p>
                  </div>
                )}

                {/* Notas */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Notas internas</label>
                  <Textarea value={notasEdit} onChange={(e) => setNotasEdit(e.target.value)} rows={3} />
                  <div className="flex justify-end mt-1.5">
                    <Button size="sm" onClick={guardarNotas} disabled={saving}>Guardar notas</Button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "pipeline" && (
              <div className="p-4 space-y-4">
                {/* Timeline */}
                <div className="relative">
                  <div className="flex items-center justify-between">
                    {FASES.map((f, idx) => {
                      const currentIdx = FASES.findIndex((x) => x.value === opp.estado);
                      const done = idx < currentIdx;
                      const active = idx === currentIdx;
                      return (
                        <div key={f.value} className="flex flex-col items-center flex-1">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            done ? "bg-emerald-500 text-white" : active ? "bg-primary text-white ring-4 ring-primary/20" : "bg-muted text-secondary"
                          }`}>
                            {done ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                          </div>
                          <span className={`text-[9px] mt-1 text-center ${active ? "text-foreground font-semibold" : "text-secondary"}`}>{f.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cambiar estado */}
                {opp.estado !== "DESCARTADA" && opp.estado !== "MANDATO_FIRMADO" && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Cambiar a:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {FASES.filter((f) => f.value !== opp.estado).map((f) => (
                        <button
                          key={f.value}
                          onClick={() => cambiarEstado(f.value)}
                          disabled={saving}
                          className="px-3 py-2 rounded-lg border border-border hover:border-primary hover:bg-primary/5 text-xs text-left cursor-pointer transition-colors"
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fechas del pipeline */}
                <div className="bg-muted/30 rounded-xl p-3 space-y-1.5 text-xs">
                  <p className="font-semibold uppercase tracking-wider mb-2">Historial</p>
                  <p><span className="text-secondary">Detectada:</span> {formatDate(opp.fechaDeteccion)}</p>
                  {opp.fechaPrimerContacto && <p><span className="text-secondary">Contactada:</span> {formatDate(opp.fechaPrimerContacto)}</p>}
                  {opp.fechaVisita && <p><span className="text-secondary">Visitada:</span> {formatDate(opp.fechaVisita)}</p>}
                  {opp.fechaValoracion && <p><span className="text-secondary">Valoración:</span> {formatDate(opp.fechaValoracion)}</p>}
                  {opp.fechaPropuesta && <p><span className="text-secondary">Propuesta:</span> {formatDate(opp.fechaPropuesta)}</p>}
                  {opp.fechaMandato && <p><span className="text-secondary">Mandato firmado:</span> {formatDate(opp.fechaMandato)}</p>}
                  {opp.motivoDescarte && <p className="text-red-600"><span className="text-secondary">Descartada por:</span> {opp.motivoDescarte}</p>}
                </div>
              </div>
            )}

            {activeTab === "acciones" && (
              <div className="p-4 space-y-3">
                {/* Comercial asignado */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Comercial asignado</label>
                  <select
                    className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={opp.comercialId ?? ""}
                    onChange={(e) => { if (e.target.value) asignarComercial(e.target.value); }}
                  >
                    <option value="">Sin asignar</option>
                    {comerciales.map((c) => (
                      <option key={c.id} value={c.id}>{c.usuario.nombre} {c.usuario.apellidos}</option>
                    ))}
                  </select>
                </div>

                {/* Contacto */}
                {opp.telefonoPropietario && (
                  <div className="grid grid-cols-2 gap-2">
                    <a href={`tel:${opp.telefonoPropietario}`}>
                      <Button size="md" variant="outline" className="w-full gap-1.5">
                        <Phone className="h-4 w-4" /> Llamar
                      </Button>
                    </a>
                    <Button size="md" variant="outline" onClick={abrirWhatsApp} className="w-full gap-1.5">
                      <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
                    </Button>
                  </div>
                )}

                {/* Plantilla */}
                <div className="rounded-xl border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Plantilla WhatsApp</p>
                    <button onClick={copiarPlantilla} className="text-xs text-primary hover:text-primary/80 cursor-pointer flex items-center gap-1">
                      {copiado ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copiado ? "Copiado" : "Copiar"}
                    </button>
                  </div>
                  <pre className="text-xs text-secondary whitespace-pre-wrap bg-muted/30 p-2 rounded-md max-h-32 overflow-y-auto">{construirMensaje()}</pre>
                </div>

                {/* Valoración AVM */}
                {opp.metrosConstruidos && opp.localidad && opp.tipoInmueble && (
                  <div className="pt-3 border-t border-border">
                    <ValoracionResultCard
                      input={{
                        tipoInmueble: opp.tipoInmueble,
                        operacion: opp.operacion === "VENTA" ? "venta" : "alquiler",
                        localidad: opp.localidad,
                        codigoPostal: opp.codigoPostal ?? undefined,
                        metrosConstruidos: opp.metrosConstruidos,
                        habitaciones: opp.habitaciones ?? undefined,
                        banos: opp.banos ?? undefined,
                        planta: opp.planta ?? undefined,
                        garaje: !!(opp.extras as { garaje?: boolean } | null)?.garaje,
                        piscina: !!(opp.extras as { piscina?: boolean } | null)?.piscina,
                        terraza: !!(opp.extras as { terraza?: boolean } | null)?.terraza,
                        ascensor: !!(opp.extras as { ascensor?: boolean } | null)?.ascensor,
                      } as ValoracionInput}
                      precioReferencia={opp.precio ? Number(opp.precio) : undefined}
                    />
                  </div>
                )}

                <div className="border-t border-border pt-3 space-y-2">
                  {/* Convertir a inmueble */}
                  {!opp.inmuebleId && opp.estado !== "DESCARTADA" && (
                    <Button size="md" onClick={convertirAInmueble} disabled={saving} className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700">
                      <Handshake className="h-4 w-4" /> Convertir a inmueble (mandato firmado)
                    </Button>
                  )}

                  {/* Descartar */}
                  {opp.estado !== "DESCARTADA" && (
                    <Button size="md" variant="outline" onClick={() => setShowDescartar(true)} disabled={saving} className="w-full gap-2 text-red-600 border-red-200 hover:bg-red-50">
                      <XCircle className="h-4 w-4" /> Descartar oportunidad
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal descartar */}
      {showDescartar && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setShowDescartar(false)}>
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3">Descartar oportunidad</h3>
            <p className="text-xs text-secondary mb-3">Selecciona el motivo:</p>
            <div className="space-y-1.5 mb-3">
              {MOTIVOS_DESCARTE.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="radio" name="motivo" value={m} checked={motivoDescarte === m} onChange={(e) => setMotivoDescarte(e.target.value)} />
                  {m}
                </label>
              ))}
            </div>
            {motivoDescarte === "Otro" && (
              <Input label="Describe el motivo" value={motivoOtro} onChange={(e) => setMotivoOtro(e.target.value)} placeholder="Motivo personalizado..." />
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button size="sm" variant="ghost" onClick={() => setShowDescartar(false)}>Cancelar</Button>
              <Button size="sm" onClick={descartar} disabled={saving || !motivoDescarte} className="bg-red-600 hover:bg-red-700">
                Descartar
              </Button>
            </div>
          </div>
        </div>
      )}
    </SlideOver>
  );
}
