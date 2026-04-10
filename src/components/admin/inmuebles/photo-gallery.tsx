"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Upload, Star, Trash2, Image as ImageIcon, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FotoItem } from "@/lib/types/inmueble";

interface PhotoGalleryProps {
  inmuebleId: string;
  fotos: FotoItem[];
  onUpdate: () => void;
}

export function PhotoGallery({ inmuebleId, fotos, onUpdate }: PhotoGalleryProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="p-4 space-y-4">
      {/* Upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-border/60 rounded-xl p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all"
      >
        <Upload className="h-6 w-6 text-secondary mx-auto mb-2" />
        <p className="text-xs font-medium text-foreground">
          {uploading ? t("inmuebles.photos.uploading") : t("inmuebles.photos.upload")}
        </p>
        <p className="text-[10px] text-secondary mt-1">{t("inmuebles.photos.maxSize")}</p>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
      </div>

      {/* Photo grid */}
      {fotos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {fotos.map((foto) => (
            <div
              key={foto.id}
              className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-muted cursor-pointer"
              onClick={() => setPreview(foto.url)}
            >
              <img
                src={foto.url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {foto.esPrincipal && (
                <div className="absolute top-1.5 left-1.5 bg-amber-500 text-white rounded-md p-1">
                  <Star className="h-3 w-3" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
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
      ) : (
        <div className="text-center py-8">
          <ImageIcon className="h-8 w-8 text-secondary/30 mx-auto mb-2" />
          <p className="text-xs text-secondary">{t("inmuebles.photos.noPhotos")}</p>
        </div>
      )}

      {/* Lightbox preview */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8"
          onClick={() => setPreview(null)}
        >
          <button
            onClick={() => setPreview(null)}
            className="absolute top-4 right-4 text-white/70 hover:text-white cursor-pointer"
          >
            <X className="h-6 w-6" />
          </button>
          <img src={preview} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}
