export interface InmuebleListItem {
  id: string;
  referencia: string;
  tipo: string;
  operacion: string;
  estado: string;
  titulo: string;
  precio: number;
  metrosConstruidos: number | null;
  habitaciones: number | null;
  banos: number | null;
  localidad: string;
  createdAt: string;
  comercial: { id: string; usuario: { nombre: string; apellidos: string } } | null;
  fotos: { url: string }[];
  _count: { fotos: number; visitas: number; publicaciones: number; documentos: number };
}

export interface InmuebleDetail extends InmuebleListItem {
  descripcion: string | null;
  metrosUtiles: number | null;
  planta: number | null;
  ascensor: boolean | null;
  garaje: boolean | null;
  trastero: boolean | null;
  piscina: boolean | null;
  terraza: boolean | null;
  aireAcondicionado: boolean | null;
  calefaccion: boolean | null;
  direccion: string;
  codigoPostal: string | null;
  provincia: string;
  latitud: number | null;
  longitud: number | null;
  refCatastral: string | null;
  certEnergetico: string | null;
  anoConst: number | null;
  ibiAnual: number | null;
  comunidadMes: number | null;
  licenciaTuristica: string | null;
  descripcionEn: string | null;
  descripcionDe: string | null;
  descripcionNl: string | null;
  descripcionFr: string | null;
  descripcionSv: string | null;
  descripcionNo: string | null;
  descripcionGeneradaPorIA: boolean;
  propietario: { id: string; nombre: string; apellidos: string | null; telefono: string | null; email: string | null } | null;
  fotos: FotoItem[];
  documentos: DocumentoItem[];
  publicaciones: PublicacionItem[];
  visitas: VisitaInmuebleItem[];
}

export interface FotoItem {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  orden: number;
  esPrincipal: boolean;
  staged: boolean;
  estiloStaging: string | null;
  tipoHabitacion: string | null;
  originalFotoId: string | null;
}

export interface DocumentoItem {
  id: string;
  tipo: string;
  nombre: string;
  url: string;
  createdAt: string;
}

export interface PublicacionItem {
  id: string;
  portal: string;
  refExterna: string | null;
  estado: string;
  ultimaSync: string | null;
  errorMsg: string | null;
}

export interface VisitaInmuebleItem {
  id: string;
  fecha: string;
  resultado: string;
  lead: { nombre: string; apellidos: string | null; telefono: string | null };
}
