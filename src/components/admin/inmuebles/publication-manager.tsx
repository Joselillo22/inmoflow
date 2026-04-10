"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Globe, Plus, Trash2, RefreshCw } from "lucide-react";
import { formatDateTime } from "@/lib/utils/formatters";
import { useTranslation } from "react-i18next";
import type { PublicacionItem } from "@/lib/types/inmueble";

const PORTALES = ["IDEALISTA", "FOTOCASA", "HABITACLIA", "MILANUNCIOS", "KYERO", "THINKSPAIN", "WEB_PROPIA"];

const estadoVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  PENDIENTE: "warning",
  PUBLICADO: "success",
  ERROR: "danger",
  RETIRADO: "default",
};

interface PublicationManagerProps {
  inmuebleId: string;
  publicaciones: PublicacionItem[];
  onUpdate: () => void;
}

export function PublicationManager({ inmuebleId, publicaciones, onUpdate }: PublicationManagerProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);

  const publishedPortals = new Set(publicaciones.map((p) => p.portal));
  const availablePortals = PORTALES.filter((p) => !publishedPortals.has(p));

  async function addPublication(portal: string) {
    setAdding(true);
    const res = await fetch(`/api/inmuebles/${inmuebleId}/publicaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portal }),
    });
    if (res.ok) {
      toast(t("inmuebles.publications.publishedIn", { portal }), "success");
      onUpdate();
    }
    setAdding(false);
  }

  async function deletePublication(pubId: string) {
    await fetch(`/api/inmuebles/${inmuebleId}/publicaciones?pubId=${pubId}`, { method: "DELETE" });
    toast(t("inmuebles.publications.deleted"), "success");
    onUpdate();
  }

  return (
    <div className="p-4 space-y-4">
      {/* Current publications */}
      {publicaciones.length > 0 ? (
        <div className="space-y-2">
          {publicaciones.map((pub) => (
            <div
              key={pub.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/60 border border-border/50"
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Globe className="h-4 w-4 text-secondary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{pub.portal.replace(/_/g, " ")}</p>
                {pub.ultimaSync && (
                  <p className="text-[10px] text-secondary">Sync: {formatDateTime(pub.ultimaSync)}</p>
                )}
                {pub.errorMsg && (
                  <p className="text-[10px] text-danger">{pub.errorMsg}</p>
                )}
              </div>
              <Badge variant={estadoVariant[pub.estado] ?? "default"} dot size="sm">
                {pub.estado}
              </Badge>
              <button
                onClick={() => deletePublication(pub.id)}
                className="p-1.5 rounded-lg text-secondary hover:text-danger hover:bg-danger-light transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <Globe className="h-8 w-8 text-secondary/30 mx-auto mb-2" />
          <p className="text-xs text-secondary">{t("inmuebles.publications.noPublished")}</p>
        </div>
      )}

      {/* Add portal */}
      {availablePortals.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-2">{t("inmuebles.publications.publishIn")}</p>
          <div className="flex flex-wrap gap-1.5">
            {availablePortals.map((portal) => (
              <Button
                key={portal}
                size="sm"
                variant="outline"
                disabled={adding}
                onClick={() => addPublication(portal)}
                className="text-[10px] gap-1"
              >
                <Plus className="h-3 w-3" />
                {portal.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
