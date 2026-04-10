export interface OperacionListItem {
  id: string;
  tipo: string;
  estado: string;
  precioFinal: number;
  comisionPctPropietario: number | null;
  comisionTotal: number | null;
  fechaOferta: string | null;
  fechaArras: string | null;
  fechaCierre: string | null;
  notas: string | null;
  createdAt: string;
  updatedAt: string;
  inmueble: { id: string; titulo: string; referencia: string };
  lead: { id: string; nombre: string; apellidos: string | null };
  comercial: {
    id: string;
    usuario: { nombre: string; apellidos: string };
  };
  comision: {
    id: string;
    total: number;
    importeEmpresa: number;
    importeComercial: number;
    estadoPago: string;
    fechaPago: string | null;
  } | null;
}

export interface OperacionDetail extends OperacionListItem {
  inmueble: {
    id: string;
    titulo: string;
    referencia: string;
    direccion: string;
    localidad: string;
    precio: number;
    tipo: string;
    operacion: string;
    estado: string;
  };
  lead: {
    id: string;
    nombre: string;
    apellidos: string | null;
    telefono: string | null;
    email: string | null;
    faseFunnel: string;
  };
}
