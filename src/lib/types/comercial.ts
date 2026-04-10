export interface ComercialLead {
  id: string;
  nombre: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  faseFunnel: string;
  score: number;
  fuente: string;
  updatedAt: string;
}

export interface ComercialInmueble {
  id: string;
  referencia: string;
  titulo: string;
  estado: string;
  tipo: string;
  operacion: string;
  precio: number;
  localidad: string;
  habitaciones: number | null;
  metrosConstruidos: number | null;
  fotos: { url: string }[];
}

export interface ComercialVisita {
  id: string;
  fecha: string;
  resultado: string;
  notasAntes: string | null;
  notasDespues: string | null;
  lead: { id: string; nombre: string; apellidos: string | null };
  inmueble: { id: string; titulo: string; direccion: string };
}

export interface ComercialTarea {
  id: string;
  tipo: string;
  descripcion: string;
  fechaLimite: string | null;
  completada: boolean;
  completadaAt: string | null;
  prioridad: number;
  leadId: string | null;
  inmuebleId: string | null;
  createdAt: string;
}

export interface ComercialComision {
  id: string;
  total: number;
  pctEmpresa: number;
  pctComercial: number;
  importeEmpresa: number;
  importeComercial: number;
  estadoPago: string;
  fechaPago: string | null;
  createdAt: string;
  operacion: {
    id: string;
    tipo: string;
    precioFinal: number;
    estado: string;
    inmueble: { titulo: string; referencia: string };
    lead: { nombre: string; apellidos: string | null };
  };
}

export interface ComercialDetail {
  id: string;
  usuarioId: string;
  telefono: string;
  zona: string;
  numRegistroCV: string | null;
  fechaAlta: string;
  activo: boolean;
  idiomas: string[];
  usuario: {
    id: string;
    email: string;
    nombre: string;
    apellidos: string;
    avatarUrl: string | null;
  };
  leads: ComercialLead[];
  inmuebles: ComercialInmueble[];
  visitas: ComercialVisita[];
  tareas: ComercialTarea[];
  comisiones: ComercialComision[];
  _count: {
    leads: number;
    inmuebles: number;
    visitas: number;
    tareas: number;
    operaciones: number;
    comisiones: number;
  };
}

export interface ComercialListItem {
  id: string;
  telefono: string;
  zona: string;
  activo: boolean;
  fechaAlta: string;
  idiomas: string[];
  usuario: {
    nombre: string;
    apellidos: string;
    email: string;
  };
  _count: {
    leads: number;
    inmuebles: number;
    visitas: number;
    operaciones: number;
  };
}
