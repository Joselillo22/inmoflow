"use client";

import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useTranslation } from "react-i18next";
import {
  Upload, Star, Trash2, Image as ImageIcon, X,
  Sofa, RefreshCw, ChevronLeft, ChevronRight,
} from "lucide-react";
import type { FotoItem } from "@/lib/types/inmueble";

interface PhotoGalleryProps {
  inmuebleId: string;
  fotos: FotoItem[];
  onUpdate: () => void;
}

const ESTILOS = [
  { value: "moderno", label: "Moderno", desc: "Líneas limpias, tonos neutros" },
  { value: "clasico", label: "Clásico", desc: "Madera cálida, elegancia tradicional" },
  { value: "mediterraneo", label: "Mediterráneo", desc: "Terracota, materiales naturales" },
  { value: "minimalista", label: "Minimalista", desc: "Blanco, simplicidad, luz natural" },
  { value: "nordico", label: "Nórdico", desc: "Hygge, madera clara, tejidos" },
] as const;

const HABITACIONES = [
  { value: "salon", label: "Salón" },
  { value: "dormitorio", label: "Dormitorio" },
  { value: "cocina", label: "Cocina" },
  { value: "comedor", label: "Comedor" },
  { value: "bano", label: "Baño" },
  { value: "terraza", label: "Terraza" },
  { value: "oficina", label: "Oficina" },
] as const;

export function PhotoGallery({ inmuebleId, fotos, onUpdate }: PhotoGalleryProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Staging modal
  const [stagingFoto, setStagingFoto] = useState<FotoItem | null>(null);
  const [estilo, setEstilo] = useState<string>("moderno");
  const [habitacion, setHabitacion] = useState<string>("salon");
  const [staging, setStaging] = useState(false);
  const [stagedResult, setStagedResult] = useState<{ url: string; id: string } | null>(null);
  const [compareMode, setCompareMode] = useState<"before" | "after">("after");

  async function handleUpload(files: FileList) {
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("fotos", f));

    const res = await fetch(`/api/inmuebles/${inmuebleId}/fotos`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      toast(t("inmuebles.photos.uploaded", { count: data.data.length }), "success");
      onUpdate();
    } else {
      const err = await res.json();
      toast(err.error ?? t("inmuebles.photos.uploadError"), "error");
    }
    setUploading(false);
  }

  async function handleDelete(fotoId: string) {
    const res = await fetch(`/api/inmuebles/${inmuebleId}/fotos?fotoId=${fotoId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast(t("inmuebles.photos.deleted"), "success");
      onUpdate();
    }
  }

  function openStagingModal(foto: FotoItem) {
    setStagingFoto(foto);
    setEstilo("moderno");
    setHabitacion("salon");
    setStagedResult(null);
    setStaging(false);
    setCompareMode("after");
  }

  function closeStagingModal() {
    setStagingFoto(null);
    setStagedResult(null);
    setStaging(false);
  }

  async function handleGenerateStaging() {
    if (!stagingFoto) return;
    setStaging(true);
    setStagedResult(null);
    try {
      const res = await fetch(`/api/inmuebles/${inmuebleId}/fotos/${stagingFoto.id}/staging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estilo, tipoHabitacion: habitacion }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "Error al generar staging", "error");
        return;
      }
      setStagedResult({ url: data.data.url, id: data.data.id });
    } catch {
      toast("Error al generar staging", "error");
    } finally {
      setStaging(false);
    }
  }

  function handleSaveStaging() {
    toast("Foto con staging guardada en la galería", "success");
    onUpdate();
    closeStagingModal();
  }

  const fotosOriginales = fotos.filter((f) => !f.staged);
  const fotosStaged = fotos.filter((f) => f.staged);

  return (
    <div className="p-4 space-y-4">
      {/* Upload area with drag & drop */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files);
          }
        }}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "border-border/60 hover:border-primary/40 hover:bg-primary/[0.02]"
        }`}
      >
        <Upload className={`h-6 w-6 mx-auto mb-2 ${dragActive ? "text-primary" : "text-secondary"}`} />
        <p className="text-xs font-medium text-foreground">
          {uploading ? t("inmuebles.photos.uploading") : dragActive ? "Suelta para subir" : t("inmuebles.photos.upload")}
        </p>
        <p className="text-[10px] text-secondary mt-1">{t("inmuebles.photos.maxSize")}</p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { if (e.target.files && e.target.files.length > 0) { handleUpload(e.target.files); e.target.value = ""; } }}
        />
      </div>

      {/* Fotos originales */}
      {fotosOriginales.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-foreground mb-2">Fotos ({fotosOriginales.length})</p>
          <div className="grid grid-cols-3 gap-2">
            {fotosOriginales.map((foto) => (
              <div
                key={foto.id}
                className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-muted cursor-pointer"
                onClick={() => setPreview(foto.url)}
              >
                <img src={foto.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                {foto.esPrincipal && (
                  <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white rounded-md p-1">
                    <Star className="h-3 w-3" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); openStagingModal(foto); }}
                    className="opacity-0 group-hover:opacity-100 bg-primary text-white rounded-lg p-1.5 transition-all hover:bg-primary/80 cursor-pointer"
                    title="Amueblar virtualmente"
                  >
                    <Sofa className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(foto.id); }}
                    className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-lg p-1.5 transition-all hover:bg-red-600 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <ImageIcon className="h-8 w-8 text-secondary/30 mx-auto mb-2" />
          <p className="text-xs text-secondary">{t("inmuebles.photos.noPhotos")}</p>
        </div>
      )}

      {/* Fotos staged */}
      {fotosStaged.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
            <Sofa className="h-3.5 w-3.5 text-primary" />
            Virtual Staging ({fotosStaged.length}/5)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {fotosStaged.map((foto) => (
              <div
                key={foto.id}
                className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-muted cursor-pointer"
                onClick={() => setPreview(foto.url)}
              >
                <img src={foto.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute top-1.5 left-1.5">
                  <Badge size="sm" variant="info" className="gap-1 text-[10px]">
                    <Sofa className="h-2.5 w-2.5" />
                    {foto.estiloStaging ?? "Staging"}
                  </Badge>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(foto.id); }}
                    className="opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-lg p-1.5 transition-all hover:bg-red-600 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {preview && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8" onClick={() => setPreview(null)}>
          <button onClick={() => setPreview(null)} className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer">
            <X className="h-6 w-6" />
          </button>
          <img src={preview} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}

      {/* Staging Modal */}
      {stagingFoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sofa className="h-4 w-4 text-primary" />
                Amueblar virtualmente
              </h3>
              <button onClick={closeStagingModal} className="text-secondary hover:text-foreground cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Preview / resultado */}
              {!stagedResult ? (
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                  <img src={stagingFoto.url} alt="Original" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-1 p-0.5 bg-muted rounded-lg w-fit mx-auto">
                    <button
                      onClick={() => setCompareMode("before")}
                      className={`text-xs px-3 py-1 rounded-md transition-colors cursor-pointer ${compareMode === "before" ? "bg-background shadow-sm font-medium" : "text-secondary"}`}
                    >
                      Antes
                    </button>
                    <button
                      onClick={() => setCompareMode("after")}
                      className={`text-xs px-3 py-1 rounded-md transition-colors cursor-pointer ${compareMode === "after" ? "bg-background shadow-sm font-medium" : "text-secondary"}`}
                    >
                      Después
                    </button>
                  </div>
                  <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
                    <img
                      src={compareMode === "after" ? stagedResult.url : stagingFoto.url}
                      alt={compareMode === "after" ? "Staged" : "Original"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Selectores (solo si no hay resultado) */}
              {!stagedResult && (
                <>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Estilo</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {ESTILOS.map((e) => (
                        <button
                          key={e.value}
                          type="button"
                          onClick={() => setEstilo(e.value)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                            estilo === e.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          }`}
                        >
                          <span className="text-sm font-medium">{e.label}</span>
                          <span className="text-[11px] text-secondary">{e.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Tipo de habitación</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {HABITACIONES.map((h) => (
                        <button
                          key={h.value}
                          type="button"
                          onClick={() => setHabitacion(h.value)}
                          className={`px-2 py-2 rounded-lg border text-xs text-center transition-colors cursor-pointer ${
                            habitacion === h.value ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-primary/40"
                          }`}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Loading */}
              {staging && (
                <div className="flex flex-col items-center justify-center py-6 gap-3">
                  <RefreshCw className="h-6 w-6 text-primary animate-spin" />
                  <p className="text-sm text-secondary">Amueblando habitación... (5-20 seg)</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-2 border-t border-border">
                <Button type="button" size="sm" variant="ghost" onClick={closeStagingModal}>
                  {stagedResult ? "Cerrar" : "Cancelar"}
                </Button>
                {stagedResult ? (
                  <>
                    <Button type="button" size="sm" variant="outline" onClick={() => setStagedResult(null)} className="gap-1">
                      <RefreshCw className="h-3.5 w-3.5" /> Cambiar opciones
                    </Button>
                    <Button type="button" size="sm" onClick={handleSaveStaging} className="gap-1">
                      Guardar en galería
                    </Button>
                  </>
                ) : (
                  <Button type="button" size="sm" onClick={handleGenerateStaging} disabled={staging} className="gap-1">
                    {staging ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sofa className="h-3.5 w-3.5" />}
                    {staging ? "Generando..." : "Generar staging"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
