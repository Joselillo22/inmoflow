"use client";

import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { FileText, Download, Trash2, Upload, Loader2, X } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
import type { DocumentoItem } from "@/lib/types/inmueble";

const TIPOS_DOC = [
  { value: "nota_simple", label: "Nota simple" },
  { value: "cert_energetico", label: "Cert. energético" },
  { value: "ibi", label: "IBI" },
  { value: "habitabilidad", label: "Cédula habitabilidad" },
  { value: "hoja_encargo", label: "Hoja de encargo" },
  { value: "contrato_arras", label: "Contrato arras" },
  { value: "escritura", label: "Escritura" },
  { value: "planos", label: "Planos" },
  { value: "licencia", label: "Licencia" },
  { value: "otro", label: "Otro" },
];

const tipoLabels: Record<string, string> = {};
TIPOS_DOC.forEach((t) => { tipoLabels[t.value] = t.label; });

interface DocumentManagerProps {
  inmuebleId: string;
  documentos: DocumentoItem[];
  onUpdate: () => void;
}

export function DocumentManager({ inmuebleId, documentos, onUpdate }: DocumentManagerProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tipoDoc, setTipoDoc] = useState("otro");
  const [nombreDoc, setNombreDoc] = useState("");

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("tipo", tipoDoc);
    formData.append("nombre", nombreDoc || selectedFile.name);
    formData.append("inmuebleId", inmuebleId);

    try {
      const res = await fetch("/api/documentos", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        toast("Documento subido", "success");
        setShowForm(false);
        setSelectedFile(null);
        setNombreDoc("");
        setTipoDoc("otro");
        onUpdate();
      } else {
        const err = await res.json();
        toast(err.error ?? "Error al subir", "error");
      }
    } catch {
      toast("Error de conexión", "error");
    }
    setUploading(false);
  }

  async function handleDelete(docId: string) {
    const res = await fetch(`/api/documentos?id=${docId}`, { method: "DELETE" });
    if (res.ok) {
      toast("Documento eliminado", "success");
      onUpdate();
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Upload button / form */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-dashed border-border/60 rounded-xl p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all"
        >
          <Upload className="h-5 w-5 text-secondary mx-auto mb-1.5" />
          <p className="text-xs font-medium text-foreground">Subir documento</p>
          <p className="text-[10px] text-secondary mt-0.5">PDF, Word, imágenes. Max 10MB</p>
        </button>
      ) : (
        <div className="border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">Subir documento</p>
            <button onClick={() => { setShowForm(false); setSelectedFile(null); }} className="text-secondary hover:text-foreground cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* File selector */}
          {!selectedFile ? (
            <label className="flex items-center justify-center gap-2 h-12 border border-dashed border-border rounded-xl text-sm text-secondary cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all">
              <Upload className="h-4 w-4" /> Seleccionar archivo
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setSelectedFile(e.target.files[0]);
                    setNombreDoc(e.target.files[0].name.replace(/\.[^.]+$/, ""));
                  }
                }}
              />
            </label>
          ) : (
            <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
              <FileText className="h-4 w-4 text-blue-600 shrink-0" />
              <span className="text-xs text-blue-700 font-medium flex-1 truncate">{selectedFile.name}</span>
              <button onClick={() => setSelectedFile(null)} className="text-xs text-red-500 cursor-pointer">Quitar</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-foreground block mb-1">Tipo</label>
              <select
                value={tipoDoc}
                onChange={(e) => setTipoDoc(e.target.value)}
                className="w-full h-9 border border-border rounded-lg px-2 text-xs bg-background cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {TIPOS_DOC.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-foreground block mb-1">Nombre</label>
              <input
                value={nombreDoc}
                onChange={(e) => setNombreDoc(e.target.value)}
                className="w-full h-9 border border-border rounded-lg px-2 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Nota simple..."
              />
            </div>
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full h-9 bg-primary text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Subiendo..." : "Subir documento"}
          </button>
        </div>
      )}

      {/* Document list */}
      {documentos.length > 0 ? (
        <div className="space-y-2">
          {documentos.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-border/50"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" size="sm">{tipoLabels[doc.tipo] ?? doc.tipo}</Badge>
                  <span className="text-[10px] text-secondary">{formatDate(doc.createdAt)}</span>
                </div>
              </div>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
              <button
                onClick={() => handleDelete(doc.id)}
                className="p-1.5 rounded-lg text-secondary hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : !showForm ? (
        <div className="text-center py-4">
          <FileText className="h-8 w-8 text-secondary/30 mx-auto mb-2" />
          <p className="text-xs text-secondary">Sin documentos</p>
        </div>
      ) : null}
    </div>
  );
}
