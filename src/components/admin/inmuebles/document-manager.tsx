"use client";

import { Badge } from "@/components/ui/badge";
import { FileText, Download, Trash2, Upload } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
import type { DocumentoItem } from "@/lib/types/inmueble";

const tipoLabels: Record<string, string> = {
  nota_simple: "Nota simple",
  cert_energetico: "Cert. energetico",
  ibi: "IBI",
  habitabilidad: "Cedula habitabilidad",
  hoja_encargo: "Hoja de encargo",
};

interface DocumentManagerProps {
  inmuebleId: string;
  documentos: DocumentoItem[];
  onUpdate: () => void;
}

export function DocumentManager({ inmuebleId, documentos, onUpdate }: DocumentManagerProps) {
  return (
    <div className="p-4 space-y-4">
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
                className="p-1.5 rounded-lg text-secondary hover:text-primary hover:bg-primary-light transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <FileText className="h-8 w-8 text-secondary/30 mx-auto mb-2" />
          <p className="text-xs text-secondary">Sin documentos</p>
        </div>
      )}
    </div>
  );
}
