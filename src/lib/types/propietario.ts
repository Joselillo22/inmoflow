export interface PropietarioListItem {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  dniNie: string | null;
  nacionalidad: string | null;
  kycVerificado: boolean;
  kycFecha: string | null;
  origenFondos: string | null;
  actividadPro: string | null;
  createdAt: string;
  _count: { inmuebles: number };
}

export interface PropietarioInmueble {
  id: string;
  referencia: string;
  titulo: string;
  estado: string;
  tipo: string;
  operacion: string;
  precio: number;
  localidad: string;
  operaciones: PropietarioOperacion[];
}

export interface PropietarioOperacion {
  id: string;
  tipo: string;
  estado: string;
  precioFinal: number;
  createdAt: string;
  lead: { nombre: string; apellidos: string | null };
  comercial: { usuario: { nombre: string; apellidos: string } };
}

export interface PropietarioDetail {
  id: string;
  nombre: string;
  apellidos: string | null;
  telefono: string | null;
  email: string | null;
  dniNie: string | null;
  tipoDocumento: string | null;
  nacionalidad: string | null;
  actividadPro: string | null;
  origenFondos: string | null;
  kycVerificado: boolean;
  kycFecha: string | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
  inmuebles: PropietarioInmueble[];
  _count: { inmuebles: number };
}
