export interface LeadListItem {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  fuente: string;
  faseFunnel: string;
  score: number;
  nacionalidad: string | null;
  idioma: string;
  createdAt: string;
  comercial: {
    id: string;
    usuario: { nombre: string; apellidos: string };
  } | null;
  _count: { visitas: number; interacciones: number; demandas: number };
}

export interface LeadDetail extends LeadListItem {
  notas: string | null;
  demandas: DemandaWithMatchings[];
  visitas: VisitaItem[];
  interacciones: InteraccionItem[];
  _count: { visitas: number; interacciones: number; operaciones: number; demandas: number };
}

export interface DemandaWithMatchings {
  id: string;
  tipoInmueble: string | null;
  tipoOperacion: string | null;
  precioMin: number | null;
  precioMax: number | null;
  zona: string | null;
  habitacionesMin: number | null;
  metrosMin: number | null;
  extras: Record<string, boolean> | null;
  _count: { matchings: number };
}

export interface MatchingWithInmueble {
  id: string;
  score: number;
  visto: boolean;
  descartado: boolean;
  inmueble: {
    id: string;
    titulo: string;
    referencia: string;
    precio: number;
    localidad: string;
    tipo: string;
    operacion: string;
    habitaciones: number | null;
    metrosConstruidos: number | null;
  };
}

export interface InteraccionItem {
  id: string;
  canal: string;
  contenido: string | null;
  fecha: string;
}

export interface VisitaItem {
  id: string;
  fecha: string;
  resultado: string;
  notasDespues: string | null;
  inmueble: {
    titulo: string;
    referencia: string;
    direccion: string;
    precio: number;
  };
}
