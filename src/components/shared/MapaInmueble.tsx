"use client";

import { useEffect, useRef, useState } from "react";
import { Layers, Satellite, Map as MapIcon, Loader2 } from "lucide-react";
import "leaflet/dist/leaflet.css";

export interface MapaInmuebleProps {
  latitud?: number | null;
  longitud?: number | null;
  direccion?: string;
  titulo?: string;
  precio?: number;
  mostrarCatastro?: boolean;
  mostrarOrtofoto?: boolean;
  altura?: number;
  modo?: "full" | "simple"; // full = todas las capas; simple = solo OSM + marker
}

// Fix Leaflet icon paths (known Next.js issue)
function fixLeafletIcons(L: typeof import("leaflet")) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

async function geocode(direccion: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(direccion)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { "Accept-Language": "es" } });
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch {
    // ignore
  }
  return null;
}

export function MapaInmueble({
  latitud,
  longitud,
  direccion = "",
  titulo = "",
  precio,
  mostrarCatastro = true,
  mostrarOrtofoto = false,
  altura = 400,
  modo = "full",
}: MapaInmuebleProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [catastroVisible, setCatastroVisible] = useState(mostrarCatastro);
  const [ortofotoVisible, setOrtofotoVisible] = useState(mostrarOrtofoto);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const catastroLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ortofotoLayerRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function initMap() {
      setLoading(true);

      // Resolve coordinates
      let lat = latitud ?? null;
      let lng = longitud ?? null;

      if ((!lat || !lng) && direccion) {
        const coords = await geocode(direccion);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
        }
      }

      if (!lat || !lng) {
        if (mounted) { setLoading(false); setError(true); }
        return;
      }

      if (!mounted || !mapRef.current) return;

      // Destroy previous instance
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const L = (await import("leaflet")).default;
      fixLeafletIcons(L);

      if (!mounted || !mapRef.current) return;

      const map = L.map(mapRef.current, { zoomControl: true, scrollWheelZoom: false }).setView([lat, lng], 16);
      mapInstanceRef.current = map;

      // Base OSM layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Marker with popup
      const popupContent = `
        <div style="font-family:sans-serif;min-width:180px">
          <p style="font-weight:700;margin:0 0 4px">${titulo || direccion}</p>
          ${precio ? `<p style="color:#1d4ed8;font-weight:700;margin:0 0 4px">${new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(precio)}</p>` : ""}
          ${direccion ? `<p style="color:#64748b;font-size:12px;margin:0">${direccion}</p>` : ""}
        </div>
      `;
      L.marker([lat, lng]).addTo(map).bindPopup(popupContent).openPopup();

      if (modo === "full") {
        // WMS Catastro layer
        const catastroLayer = L.tileLayer.wms(
          "https://ovc.catastro.meh.es/Cartografia/WMS/ServidorWMS.aspx",
          {
            layers: "Catastro",
            format: "image/png",
            transparent: true,
            opacity: 0.7,
            attribution: "© Catastro",
          }
        );
        catastroLayerRef.current = catastroLayer;
        if (catastroVisible) catastroLayer.addTo(map);

        // WMS PNOA ortofoto
        const ortofotoLayer = L.tileLayer.wms(
          "https://www.ign.es/wms-inspire/pnoa-ma",
          {
            layers: "OI.OrthoimageCoverage",
            format: "image/png",
            transparent: true,
            opacity: 0.85,
            attribution: "© IGN PNOA",
          }
        );
        ortofotoLayerRef.current = ortofotoLayer;
        if (ortofotoVisible) ortofotoLayer.addTo(map);
      }

      if (mounted) setLoading(false);
    }

    initMap();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitud, longitud, direccion]);

  // Toggle catastro layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = catastroLayerRef.current;
    if (!map || !layer) return;
    if (catastroVisible) layer.addTo(map);
    else map.removeLayer(layer);
  }, [catastroVisible]);

  // Toggle ortofoto layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = ortofotoLayerRef.current;
    if (!map || !layer) return;
    if (ortofotoVisible) layer.addTo(map);
    else map.removeLayer(layer);
  }, [ortofotoVisible]);

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 relative" style={{ height: altura }}>
      {/* Map container */}
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10 gap-2">
          <MapIcon className="h-8 w-8 text-slate-300" />
          <p className="text-xs text-slate-400 text-center px-4">
            No se pudo localizar la dirección en el mapa
          </p>
        </div>
      )}

      {/* Layer controls (full mode only) */}
      {!loading && !error && modo === "full" && (
        <div className="absolute top-2 right-2 z-[1000] flex flex-col gap-1">
          <button
            onClick={() => setCatastroVisible((v) => !v)}
            title="Parcelas catastrales"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold shadow-md transition-colors cursor-pointer ${
              catastroVisible
                ? "bg-amber-500 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Layers className="h-3 w-3" />
            Catastro
          </button>
          <button
            onClick={() => setOrtofotoVisible((v) => !v)}
            title="Ortofoto PNOA"
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold shadow-md transition-colors cursor-pointer ${
              ortofotoVisible
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Satellite className="h-3 w-3" />
            Satélite
          </button>
        </div>
      )}
    </div>
  );
}
