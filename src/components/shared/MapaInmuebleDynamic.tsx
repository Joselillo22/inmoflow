"use client";

import dynamic from "next/dynamic";
import type { MapaInmuebleProps } from "./MapaInmueble";

// Must be loaded client-side only (Leaflet requires window)
export const MapaInmueble = dynamic(
  () => import("./MapaInmueble").then((m) => ({ default: m.MapaInmueble })),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-xl border border-slate-200 bg-slate-100 animate-pulse"
        style={{ height: 300 }}
      />
    ),
  }
) as React.ComponentType<MapaInmuebleProps>;
