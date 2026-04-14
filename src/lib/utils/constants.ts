export const FASE_FUNNEL_LABELS: Record<string, string> = {
  NUEVO: "Nuevo",
  CONTACTADO: "Contactado",
  CUALIFICADO: "Cualificado",
  VISITA_PROGRAMADA: "Visita programada",
  VISITA_REALIZADA: "Visita realizada",
  OFERTA: "Oferta",
  RESERVA: "Reserva",
  CIERRE: "Cierre",
  PERDIDO: "Perdido",
};

export const ESTADO_INMUEBLE_LABELS: Record<string, string> = {
  EN_CAPTACION: "En captación",
  ACTIVO: "Activo",
  RESERVADO: "Reservado",
  VENDIDO: "Vendido",
  ALQUILADO: "Alquilado",
  RETIRADO: "Retirado",
};

export const TIPO_INMUEBLE_LABELS: Record<string, string> = {
  PISO: "Piso",
  CASA: "Casa",
  CHALET: "Chalet",
  ADOSADO: "Adosado",
  ATICO: "Ático",
  DUPLEX: "Dúplex",
  ESTUDIO: "Estudio",
  LOCAL: "Local",
  OFICINA: "Oficina",
  NAVE: "Nave",
  SOLAR: "Solar",
  GARAJE: "Garaje",
  TRASTERO: "Trastero",
  OTRO: "Otro",
};

export const FUENTE_LEAD_LABELS: Record<string, string> = {
  IDEALISTA: "Idealista",
  FOTOCASA: "Fotocasa",
  HABITACLIA: "Habitaclia",
  MILANUNCIOS: "Milanuncios",
  WEB_PROPIA: "Web propia",
  GOOGLE_ADS: "Google Ads",
  META_ADS: "Meta Ads",
  REFERIDO: "Referido",
  PUERTA_FRIA: "Puerta fría",
  TELEFONO: "Teléfono",
  OTRO: "Otro",
};

export const TIPO_OPERACION_LABELS: Record<string, string> = {
  VENTA: "Venta",
  ALQUILER: "Alquiler",
  ALQUILER_OPCION_COMPRA: "Alquiler con opción a compra",
  TRASPASO: "Traspaso",
};

export const RESULTADO_VISITA_LABELS: Record<string, string> = {
  PENDIENTE: "Pendiente",
  REALIZADA_INTERESADO: "Realizada - Interesado",
  REALIZADA_NO_INTERESADO: "Realizada - No interesado",
  CANCELADA: "Cancelada",
  NO_SHOW: "No se presentó",
};

export const ESTADO_OPERACION_LABELS: Record<string, string> = {
  EN_NEGOCIACION: "En negociación",
  OFERTA_ACEPTADA: "Oferta aceptada",
  ARRAS_FIRMADAS: "Arras firmadas",
  PENDIENTE_NOTARIA: "Pendiente de notaría",
  CERRADA: "Cerrada",
  CAIDA: "Caída",
};

export const COMISION_PCT_EMPRESA = 70;
export const COMISION_PCT_COMERCIAL = 30;


// ─── Proveedores ────────────────────────────────────────

export const CATEGORIA_PROVEEDOR_LABELS: Record<string, string> = {
  FONTANERIA: "Fontanería",
  ELECTRICIDAD: "Electricidad",
  PINTURA: "Pintura",
  ALBANILERIA: "Albañilería",
  CARPINTERIA: "Carpintería",
  CERRAJERIA: "Cerrajería",
  CLIMATIZACION: "Climatización",
  LIMPIEZA: "Limpieza",
  MUDANZAS: "Mudanzas",
  CRISTALERIA: "Cristalería",
  REFORMAS_INTEGRALES: "Reformas integrales",
  JARDINERIA: "Jardinería",
  OTRO: "Otro",
};

export const CATEGORIA_PROVEEDOR_COLORS: Record<string, string> = {
  FONTANERIA: "bg-blue-100 text-blue-700",
  ELECTRICIDAD: "bg-amber-100 text-amber-700",
  PINTURA: "bg-pink-100 text-pink-700",
  ALBANILERIA: "bg-orange-100 text-orange-700",
  CARPINTERIA: "bg-yellow-100 text-yellow-800",
  CERRAJERIA: "bg-slate-100 text-slate-700",
  CLIMATIZACION: "bg-cyan-100 text-cyan-700",
  LIMPIEZA: "bg-emerald-100 text-emerald-700",
  MUDANZAS: "bg-indigo-100 text-indigo-700",
  CRISTALERIA: "bg-sky-100 text-sky-700",
  REFORMAS_INTEGRALES: "bg-violet-100 text-violet-700",
  JARDINERIA: "bg-green-100 text-green-700",
  OTRO: "bg-gray-100 text-gray-700",
};

export const ESTADO_TRABAJO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  ENVIADO: "Enviado",
  EN_CURSO: "En curso",
  ADJUDICADO: "Adjudicado",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

export const ESTADO_TRABAJO_COLORS: Record<string, string> = {
  BORRADOR: "bg-slate-100 text-slate-600",
  ENVIADO: "bg-blue-100 text-blue-700",
  EN_CURSO: "bg-amber-100 text-amber-700",
  ADJUDICADO: "bg-emerald-100 text-emerald-700",
  COMPLETADO: "bg-green-100 text-green-700",
  CANCELADO: "bg-red-100 text-red-700",
};
