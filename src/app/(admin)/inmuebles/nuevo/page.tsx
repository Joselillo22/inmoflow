"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PhotoGallery } from "@/components/admin/inmuebles/photo-gallery";
import { TIPO_INMUEBLE_LABELS, TIPO_OPERACION_LABELS } from "@/lib/utils/constants";
import type { FotoItem } from "@/lib/types/inmueble";
import {
  Building2, MapPin, Search, Navigation, Check, ChevronLeft, ChevronRight,
  Sparkles, RefreshCw, Languages, ChevronDown, ChevronUp, X, Euro, Ruler,
  BedDouble, Bath, Layers, Calendar, Zap, FileText, TreePine, Car, Archive,
  Waves, Wind, Flame, ArrowUpDown, Camera,
} from "lucide-react";

const tipoOptions = Object.entries(TIPO_INMUEBLE_LABELS).map(([value, label]) => ({ value, label }));
const operacionOptions = Object.entries(TIPO_OPERACION_LABELS).map(([value, label]) => ({ value, label }));
const certOptions = ["A", "B", "C", "D", "E", "F", "G", "EN_TRAMITE", "EXENTO"].map((v) => ({ value: v, label: v.replace("_", " ") }));

const IDIOMAS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "sv", label: "Svenska", flag: "🇸🇪" },
  { code: "no", label: "Norsk", flag: "🇳🇴" },
];

const EXTRAS = [
  { key: "ascensor", label: "Ascensor", Icon: ArrowUpDown },
  { key: "garaje", label: "Garaje", Icon: Car },
  { key: "trastero", label: "Trastero", Icon: Archive },
  { key: "piscina", label: "Piscina", Icon: Waves },
  { key: "terraza", label: "Terraza", Icon: TreePine },
  { key: "aireAcondicionado", label: "A/C", Icon: Wind },
  { key: "calefaccion", label: "Calefacción", Icon: Flame },
] as const;

type BoolKey = (typeof EXTRAS)[number]["key"];

interface PropietarioItem { id: string; nombre: string; apellidos: string | null; telefono: string | null }
interface ComercialItem { id: string; usuario: { nombre: string; apellidos: string } }

interface FormState {
  // identificación
  refCatastral?: string;
  tipo?: string;
  operacion?: string;
  propietarioId?: string;
  comercialId?: string;
  direccion?: string;
  localidad?: string;
  codigoPostal?: string;
  provincia?: string;
  latitud?: number;
  longitud?: number;
  // paso 2
  precio?: number;
  metrosConstruidos?: number;
  metrosUtiles?: number;
  habitaciones?: number;
  banos?: number;
  planta?: number;
  anoConst?: number;
  certEnergetico?: string;
  ibiAnual?: number;
  comunidadMes?: number;
  licenciaTuristica?: string;
  // paso 3
  ascensor?: boolean; garaje?: boolean; trastero?: boolean; piscina?: boolean;
  terraza?: boolean; aireAcondicionado?: boolean; calefaccion?: boolean;
  // paso 4
  titulo?: string;
  descripcion?: string;
  descripcionGeneradaPorIA?: boolean;
}

const STEP_LABELS = ["Identificación", "Características", "Extras", "Descripción", "Fotos"] as const;

export default function NuevoInmueblePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [inmuebleId, setInmuebleId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({});
  const [saving, setSaving] = useState(false);
  const [fotos, setFotos] = useState<FotoItem[]>([]);

  // Listados
  const [propietarios, setPropietarios] = useState<PropietarioItem[]>([]);
  const [comerciales, setComerciales] = useState<ComercialItem[]>([]);

  // Catastro
  const [catastroMode, setCatastroMode] = useState<"rc" | "coord">("rc");
  const [catastroLoading, setCatastroLoading] = useState(false);
  const [catastroError, setCatastroError] = useState<string | null>(null);

  // IA + traducciones
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiText, setAiText] = useState("");
  const [tradOpen, setTradOpen] = useState(false);
  const [translatingAll, setTranslatingAll] = useState(false);
  const [translatingLang, setTranslatingLang] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      try {
        const [rp, rc] = await Promise.all([
          fetch("/api/propietarios?limit=500").then((r) => r.ok ? r.json() : { data: [] }),
          fetch("/api/comerciales?activo=true").then((r) => r.ok ? r.json() : { data: [] }),
        ]);
        setPropietarios(rp.data ?? rp.items ?? []);
        setComerciales(rc.data ?? rc.items ?? []);
      } catch {
        // non-blocking
      }
    })();
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function consultarPorRC() {
    if (!form.refCatastral || form.refCatastral.length < 14) {
      setCatastroError("La referencia catastral debe tener al menos 14 caracteres");
      return;
    }
    setCatastroError(null);
    setCatastroLoading(true);
    try {
      const res = await fetch("/api/catastro/consulta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referenciaCatastral: form.refCatastral }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCatastroError(data.error ?? "No se pudo consultar Catastro");
        return;
      }
      if (data.multiple) {
        setCatastroError(`Se encontraron ${data.count} inmuebles. Introduce la RC completa de 20 caracteres.`);
        return;
      }
      const d = data.datos;
      setForm((prev) => ({
        ...prev,
        direccion: d.direccion ?? prev.direccion,
        codigoPostal: d.codigoPostal ?? prev.codigoPostal,
        localidad: d.localidad ?? prev.localidad,
        provincia: d.provincia ?? prev.provincia ?? "Alicante",
        metrosConstruidos: d.superficieConstruida ?? prev.metrosConstruidos,
        anoConst: d.anoConstruccion ?? prev.anoConst,
        planta: d.planta ? Number(d.planta) : prev.planta,
      }));
      toast("Datos del Catastro cargados", "success");
    } catch {
      setCatastroError("Error al consultar Catastro");
    } finally {
      setCatastroLoading(false);
    }
  }

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setCatastroError("El navegador no soporta geolocalización");
      return;
    }
    setCatastroLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((prev) => ({ ...prev, latitud: latitude, longitud: longitude }));
        await consultarPorCoord(latitude, longitude);
      },
      () => {
        setCatastroError("No se pudo obtener la ubicación");
        setCatastroLoading(false);
      }
    );
  }

  async function consultarPorCoord(lat?: number, lon?: number) {
    const latitud = lat ?? form.latitud;
    const longitud = lon ?? form.longitud;
    if (typeof latitud !== "number" || typeof longitud !== "number") {
      setCatastroError("Introduce latitud y longitud válidas");
      return;
    }
    setCatastroError(null);
    setCatastroLoading(true);
    try {
      const res = await fetch("/api/catastro/geocodificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitud, longitud }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCatastroError(data.error ?? "No se pudo geocodificar");
        return;
      }
      const d = data.datos;
      if (!d) {
        setCatastroError("Sin resultados en esas coordenadas");
        return;
      }
      setForm((prev) => ({
        ...prev,
        refCatastral: data.referenciaCatastral ?? prev.refCatastral,
        direccion: d.direccion ?? prev.direccion,
        codigoPostal: d.codigoPostal ?? prev.codigoPostal,
        localidad: d.localidad ?? prev.localidad,
        provincia: d.provincia ?? prev.provincia ?? "Alicante",
        metrosConstruidos: d.superficieConstruida ?? prev.metrosConstruidos,
        anoConst: d.anoConstruccion ?? prev.anoConst,
        latitud, longitud,
      }));
      toast("Datos del Catastro cargados", "success");
    } catch {
      setCatastroError("Error al geocodificar");
    } finally {
      setCatastroLoading(false);
    }
  }

  async function crearInmueble() {
    if (!form.tipo || !form.operacion || !form.direccion || !form.localidad) {
      toast("Completa tipo, operación, dirección y localidad", "error");
      return;
    }
    setSaving(true);
    try {
      const referencia = `INM-${Date.now().toString(36).slice(-7).toUpperCase()}`;
      const titulo = `${TIPO_INMUEBLE_LABELS[form.tipo] ?? form.tipo} en ${form.direccion}`;
      const body: Record<string, unknown> = {
        referencia,
        tipo: form.tipo,
        operacion: form.operacion,
        titulo,
        precio: 1,
        direccion: form.direccion,
        localidad: form.localidad,
        provincia: form.provincia ?? "Alicante",
      };
      if (form.codigoPostal) body.codigoPostal = form.codigoPostal;
      if (form.refCatastral) body.refCatastral = form.refCatastral;
      if (form.propietarioId) body.propietarioId = form.propietarioId;
      if (form.comercialId) body.comercialId = form.comercialId;

      const res = await fetch("/api/inmuebles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Error al crear inmueble", "error");
        return;
      }
      setInmuebleId(data.data.id);
      update("titulo", titulo);
      toast("Inmueble creado. Completa los siguientes pasos.", "success");
      setStep(2);
    } finally {
      setSaving(false);
    }
  }

  async function patchInmueble(partial: Record<string, unknown>) {
    if (!inmuebleId) return false;
    setSaving(true);
    try {
      const res = await fetch(`/api/inmuebles/${inmuebleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error ?? "No se pudo guardar", "error");
        return false;
      }
      return true;
    } finally {
      setSaving(false);
    }
  }

  async function siguienteDesde2() {
    if (!form.precio || form.precio <= 0) {
      toast("El precio es obligatorio", "error");
      return;
    }
    const ok = await patchInmueble({
      precio: Number(form.precio),
      metrosConstruidos: form.metrosConstruidos ? Number(form.metrosConstruidos) : undefined,
      metrosUtiles: form.metrosUtiles ? Number(form.metrosUtiles) : undefined,
      habitaciones: form.habitaciones ? Number(form.habitaciones) : undefined,
      banos: form.banos ? Number(form.banos) : undefined,
      planta: form.planta ? Number(form.planta) : undefined,
      anoConst: form.anoConst ? Number(form.anoConst) : undefined,
      certEnergetico: form.certEnergetico || undefined,
      ibiAnual: form.ibiAnual ? Number(form.ibiAnual) : undefined,
      comunidadMes: form.comunidadMes ? Number(form.comunidadMes) : undefined,
      licenciaTuristica: form.licenciaTuristica || undefined,
    });
    if (ok) setStep(3);
  }

  async function siguienteDesde3() {
    const ok = await patchInmueble({
      ascensor: !!form.ascensor,
      garaje: !!form.garaje,
      trastero: !!form.trastero,
      piscina: !!form.piscina,
      terraza: !!form.terraza,
      aireAcondicionado: !!form.aireAcondicionado,
      calefaccion: !!form.calefaccion,
    });
    if (ok) setStep(4);
  }

  async function siguienteDesde4() {
    if (!form.titulo || form.titulo.trim().length === 0) {
      toast("El título es obligatorio", "error");
      return;
    }
    const body: Record<string, unknown> = {
      titulo: form.titulo,
      descripcion: form.descripcion ?? "",
      descripcionGeneradaPorIA: !!form.descripcionGeneradaPorIA,
    };
    for (const { code } of IDIOMAS) {
      const key = `descripcion${code.charAt(0).toUpperCase() + code.slice(1)}`;
      if (translations[code]) body[key] = translations[code];
    }
    const ok = await patchInmueble(body);
    if (ok) {
      await fetchFotos();
      setStep(5);
    }
  }

  async function fetchFotos() {
    if (!inmuebleId) return;
    const res = await fetch(`/api/inmuebles/${inmuebleId}`);
    if (res.ok) {
      const data = await res.json();
      setFotos(data.data.fotos ?? []);
    }
  }

  async function generarIA() {
    if (!inmuebleId) return;
    setAiGenerating(true);
    setAiModalOpen(true);
    setAiText("");
    try {
      const res = await fetch(`/api/inmuebles/${inmuebleId}/descripcion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idioma: "es" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAiText(data.data.descripcion);
    } catch {
      toast("No se pudo generar la descripción", "error");
      setAiModalOpen(false);
    } finally {
      setAiGenerating(false);
    }
  }

  function usarIA() {
    update("descripcion", aiText);
    update("descripcionGeneradaPorIA", true);
    setAiModalOpen(false);
    setAiText("");
  }

  async function traducirUno(lang: string) {
    if (!inmuebleId || !form.descripcion) {
      toast("Primero escribe o genera la descripción en español", "error");
      return;
    }
    setTranslatingLang(lang);
    try {
      const res = await fetch(`/api/inmuebles/${inmuebleId}/descripcion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idioma: lang }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTranslations((prev) => ({ ...prev, [lang]: data.data.descripcion }));
    } catch {
      toast("No se pudo traducir", "error");
    } finally {
      setTranslatingLang(null);
    }
  }

  async function traducirTodos() {
    if (!inmuebleId || !form.descripcion) {
      toast("Primero escribe la descripción en español", "error");
      return;
    }
    setTranslatingAll(true);
    try {
      const res = await fetch(`/api/inmuebles/${inmuebleId}/descripcion/todas`, { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const { es: _es, ...rest } = data.data.descripciones;
      setTranslations(rest);
      toast("Traducciones generadas", "success");
    } catch {
      toast("No se pudieron generar las traducciones", "error");
    } finally {
      setTranslatingAll(false);
    }
  }

  async function finalizar(publicar: boolean) {
    if (publicar) {
      const ok = await patchInmueble({ estado: "ACTIVO" });
      if (!ok) return;
      toast("Inmueble publicado", "success");
    } else {
      toast("Inmueble guardado como borrador", "success");
    }
    router.push("/inmuebles");
  }

  const canGoBack = step > 1 && !!inmuebleId;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Nuevo inmueble</h1>
        <p className="text-sm text-secondary mt-0.5">Completa los pasos para dar de alta el inmueble</p>
      </div>

      {/* Progress bar */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-4">
        <div className="flex items-center justify-between">
          {STEP_LABELS.map((label, idx) => {
            const n = idx + 1;
            const done = step > n;
            const active = step === n;
            return (
              <div key={label} className="flex-1 flex items-center">
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    done ? "bg-emerald-500 text-white" : active ? "bg-primary text-white ring-4 ring-primary/20" : "bg-muted text-secondary"
                  }`}>
                    {done ? <Check className="h-4 w-4" /> : n}
                  </div>
                  <span className={`text-xs font-medium mt-1.5 ${active ? "text-foreground" : "text-secondary"}`}>{label}</span>
                </div>
                {idx < STEP_LABELS.length - 1 && (
                  <div className={`h-0.5 flex-1 -mt-5 mx-1 transition-colors ${done ? "bg-emerald-500" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Paso 1 */}
      {step === 1 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Identificación del inmueble</h2>
            <p className="text-xs text-secondary">Autocompleta los datos desde Catastro o introdúcelos manualmente</p>
          </div>

          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            <button type="button" onClick={() => setCatastroMode("rc")} className={`text-xs px-3 py-1.5 rounded-md transition-colors cursor-pointer ${catastroMode === "rc" ? "bg-background shadow-sm font-medium" : "text-secondary"}`}>
              Por referencia catastral
            </button>
            <button type="button" onClick={() => setCatastroMode("coord")} className={`text-xs px-3 py-1.5 rounded-md transition-colors cursor-pointer ${catastroMode === "coord" ? "bg-background shadow-sm font-medium" : "text-secondary"}`}>
              Por ubicación (GPS)
            </button>
          </div>

          {catastroMode === "rc" ? (
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  id="refCatastral"
                  label="Referencia catastral"
                  placeholder="20 caracteres — ej: 0123456AB1234C0001ZZ"
                  value={form.refCatastral ?? ""}
                  onChange={(e) => update("refCatastral", e.target.value.toUpperCase())}
                />
              </div>
              <Button type="button" onClick={consultarPorRC} disabled={catastroLoading} className="gap-2 shrink-0">
                {catastroLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Consultar Catastro
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button type="button" onClick={usarMiUbicacion} disabled={catastroLoading} variant="outline" className="gap-2">
                {catastroLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                Usar mi ubicación actual
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Input id="latitud" label="Latitud" type="number" step="0.000001" value={form.latitud ?? ""} onChange={(e) => update("latitud", e.target.value ? Number(e.target.value) : undefined)} />
                <Input id="longitud" label="Longitud" type="number" step="0.000001" value={form.longitud ?? ""} onChange={(e) => update("longitud", e.target.value ? Number(e.target.value) : undefined)} />
              </div>
              <Button type="button" onClick={() => consultarPorCoord()} disabled={catastroLoading} className="gap-2">
                <Search className="h-4 w-4" /> Buscar en Catastro
              </Button>
            </div>
          )}

          {catastroError && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
              {catastroError}
            </div>
          )}

          <div className="border-t border-border/60 pt-5 space-y-4">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Ubicación
            </p>
            <Input id="direccion" label="Dirección *" value={form.direccion ?? ""} onChange={(e) => update("direccion", e.target.value)} placeholder="Calle Mayor 15, 3ºA" />
            <div className="grid grid-cols-3 gap-3">
              <Input id="localidad" label="Localidad *" value={form.localidad ?? ""} onChange={(e) => update("localidad", e.target.value)} placeholder="Alicante" />
              <Input id="codigoPostal" label="Código postal" value={form.codigoPostal ?? ""} onChange={(e) => update("codigoPostal", e.target.value)} placeholder="03001" />
              <Input id="provincia" label="Provincia" value={form.provincia ?? "Alicante"} onChange={(e) => update("provincia", e.target.value)} />
            </div>
          </div>

          <div className="border-t border-border/60 pt-5 space-y-4">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> Tipo y operación
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Select id="tipo" label="Tipo *" options={tipoOptions} placeholder="Seleccionar..." value={form.tipo ?? ""} onChange={(e) => update("tipo", e.target.value)} />
              <Select id="operacion" label="Operación *" options={operacionOptions} placeholder="Seleccionar..." value={form.operacion ?? ""} onChange={(e) => update("operacion", e.target.value)} />
            </div>
          </div>

          <div className="border-t border-border/60 pt-5 space-y-4">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Asignación</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Propietario</label>
                <select
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.propietarioId ?? ""}
                  onChange={(e) => update("propietarioId", e.target.value || undefined)}
                >
                  <option value="">Sin asignar</option>
                  {propietarios.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} {p.apellidos ?? ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Comercial asignado</label>
                <select
                  className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={form.comercialId ?? ""}
                  onChange={(e) => update("comercialId", e.target.value || undefined)}
                >
                  <option value="">Sin asignar</option>
                  {comerciales.map((c) => (
                    <option key={c.id} value={c.id}>{c.usuario.nombre} {c.usuario.apellidos}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={() => router.back()}>Cancelar</Button>
            <Button type="button" onClick={crearInmueble} disabled={saving} className="gap-2">
              {saving ? "Creando..." : "Siguiente"} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Paso 2 */}
      {step === 2 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Características del inmueble</h2>
            <p className="text-xs text-secondary">Datos económicos y técnicos</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Euro className="h-3.5 w-3.5" /> Económicos
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Input id="precio" label="Precio (€) *" type="number" value={form.precio ?? ""} onChange={(e) => update("precio", e.target.value ? Number(e.target.value) : undefined)} placeholder="200000" />
              <Input id="ibiAnual" label="IBI anual (€)" type="number" value={form.ibiAnual ?? ""} onChange={(e) => update("ibiAnual", e.target.value ? Number(e.target.value) : undefined)} />
              <Input id="comunidadMes" label="Comunidad (€/mes)" type="number" value={form.comunidadMes ?? ""} onChange={(e) => update("comunidadMes", e.target.value ? Number(e.target.value) : undefined)} />
            </div>
          </div>

          <div className="space-y-3 border-t border-border/60 pt-5">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Ruler className="h-3.5 w-3.5" /> Medidas
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input id="metrosConstruidos" label="m² construidos" type="number" value={form.metrosConstruidos ?? ""} onChange={(e) => update("metrosConstruidos", e.target.value ? Number(e.target.value) : undefined)} />
              <Input id="metrosUtiles" label="m² útiles" type="number" value={form.metrosUtiles ?? ""} onChange={(e) => update("metrosUtiles", e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input id="habitaciones" label="Habitaciones" type="number" value={form.habitaciones ?? ""} onChange={(e) => update("habitaciones", e.target.value ? Number(e.target.value) : undefined)} />
              <Input id="banos" label="Baños" type="number" value={form.banos ?? ""} onChange={(e) => update("banos", e.target.value ? Number(e.target.value) : undefined)} />
              <Input id="planta" label="Planta" type="number" value={form.planta ?? ""} onChange={(e) => update("planta", e.target.value ? Number(e.target.value) : undefined)} />
            </div>
          </div>

          <div className="space-y-3 border-t border-border/60 pt-5">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Construcción y legal
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Input id="anoConst" label="Año construcción" type="number" value={form.anoConst ?? ""} onChange={(e) => update("anoConst", e.target.value ? Number(e.target.value) : undefined)} />
              <Select id="certEnergetico" label="Certificado energético" options={certOptions} placeholder="Seleccionar..." value={form.certEnergetico ?? ""} onChange={(e) => update("certEnergetico", e.target.value)} />
              <Input id="licenciaTuristica" label="Licencia turística" value={form.licenciaTuristica ?? ""} onChange={(e) => update("licenciaTuristica", e.target.value)} placeholder="VT-12345" />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={saving} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Atrás
            </Button>
            <Button type="button" onClick={siguienteDesde2} disabled={saving} className="gap-2">
              {saving ? "Guardando..." : "Siguiente"} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Paso 3 */}
      {step === 3 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Extras y equipamiento</h2>
            <p className="text-xs text-secondary">Marca las características disponibles</p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {EXTRAS.map(({ key, label, Icon }) => {
              const active = !!form[key as BoolKey];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => update(key as BoolKey, !active)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    active ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
                  }`}
                >
                  <Icon className={`h-6 w-6 ${active ? "text-primary" : "text-secondary"}`} />
                  <span className={`text-sm font-medium ${active ? "text-foreground" : "text-secondary"}`}>{label}</span>
                  {active && <Check className="h-3.5 w-3.5 text-primary absolute top-2 right-2" />}
                </button>
              );
            })}
          </div>

          <div className="flex justify-between pt-4 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={() => setStep(2)} disabled={saving} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Atrás
            </Button>
            <Button type="button" onClick={siguienteDesde3} disabled={saving} className="gap-2">
              {saving ? "Guardando..." : "Siguiente"} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Paso 4 */}
      {step === 4 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Título y descripción</h2>
            <p className="text-xs text-secondary">Usa la IA para generar y traducir a 6 idiomas</p>
          </div>

          <Input id="titulo" label="Título *" value={form.titulo ?? ""} onChange={(e) => update("titulo", e.target.value)} placeholder="Piso 3 habitaciones con vistas al mar" />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Descripción en español</label>
              <div className="flex items-center gap-1.5">
                {form.descripcionGeneradaPorIA && (
                  <Badge size="sm" variant="info" className="gap-1">
                    <Sparkles className="h-3 w-3" /> IA
                  </Badge>
                )}
                <button
                  type="button"
                  onClick={generarIA}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium cursor-pointer transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Generar con IA
                </button>
              </div>
            </div>
            <Textarea id="descripcion" value={form.descripcion ?? ""} onChange={(e) => { update("descripcion", e.target.value); update("descripcionGeneradaPorIA", false); }} rows={6} />
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setTradOpen(!tradOpen)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Languages className="h-4 w-4" />
                Traducciones
                <span className="text-xs text-secondary font-normal">
                  ({Object.keys(translations).length}/{IDIOMAS.length} idiomas)
                </span>
              </span>
              {tradOpen ? <ChevronUp className="h-4 w-4 text-secondary" /> : <ChevronDown className="h-4 w-4 text-secondary" />}
            </button>

            {tradOpen && (
              <div className="p-3 space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={traducirTodos}
                    disabled={translatingAll || !form.descripcion}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    {translatingAll ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
                    {translatingAll ? "Traduciendo..." : "Traducir todos"}
                  </button>
                </div>
                {IDIOMAS.map(({ code, label, flag }) => (
                  <div key={code} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground flex items-center gap-1">
                        <span>{flag}</span> {label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {translations[code] && (
                          <span className="flex items-center gap-0.5 text-xs text-green-600">
                            <Check className="h-3 w-3" /> Traducida
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => traducirUno(code)}
                          disabled={translatingLang === code || !form.descripcion}
                          className="text-xs text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          {translatingLang === code ? <RefreshCw className="h-3 w-3 animate-spin" /> : (translations[code] ? "Retraducir" : "Traducir")}
                        </button>
                      </div>
                    </div>
                    {translations[code] && (
                      <textarea
                        value={translations[code]}
                        onChange={(e) => setTranslations((prev) => ({ ...prev, [code]: e.target.value }))}
                        rows={3}
                        className="w-full text-xs border border-border rounded-md px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary bg-background text-foreground"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t border-border/60">
            <Button type="button" variant="ghost" onClick={() => setStep(3)} disabled={saving} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Atrás
            </Button>
            <Button type="button" onClick={siguienteDesde4} disabled={saving} className="gap-2">
              {saving ? "Guardando..." : "Siguiente"} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Paso 5 */}
      {step === 5 && inmuebleId && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden">
          <div className="p-6 pb-0">
            <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Fotos del inmueble
            </h2>
            <p className="text-xs text-secondary">Arrastra imágenes o haz click para subirlas. Puedes marcar una como principal.</p>
          </div>

          <PhotoGallery inmuebleId={inmuebleId} fotos={fotos} onUpdate={fetchFotos} />

          <div className="flex justify-between pt-4 border-t border-border/60 p-6 bg-muted/30">
            <Button type="button" variant="ghost" onClick={() => setStep(4)} disabled={saving} className="gap-2">
              <ChevronLeft className="h-4 w-4" /> Atrás
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => finalizar(false)} disabled={saving}>
                Guardar como borrador
              </Button>
              <Button type="button" onClick={() => finalizar(true)} disabled={saving} className="gap-2">
                <Check className="h-4 w-4" /> Publicar (Activo)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal IA */}
      {aiModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Descripción generada por IA
              </h3>
              <button type="button" onClick={() => setAiModalOpen(false)} className="text-secondary hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            {aiGenerating ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                <p className="text-sm text-secondary">Generando descripción...</p>
              </div>
            ) : (
              <>
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{aiText}</p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" size="sm" variant="ghost" onClick={() => setAiModalOpen(false)}>Cancelar</Button>
                  <Button type="button" size="sm" variant="outline" onClick={generarIA} className="gap-1">
                    <RefreshCw className="h-3.5 w-3.5" /> Regenerar
                  </Button>
                  <Button type="button" size="sm" onClick={usarIA} className="gap-1">
                    <Check className="h-3.5 w-3.5" /> Usar esta descripción
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
