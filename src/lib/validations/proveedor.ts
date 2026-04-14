import { z } from "zod";

const categorias = [
  "FONTANERIA", "ELECTRICIDAD", "PINTURA", "ALBANILERIA", "CARPINTERIA",
  "CERRAJERIA", "CLIMATIZACION", "LIMPIEZA", "MUDANZAS", "CRISTALERIA",
  "REFORMAS_INTEGRALES", "JARDINERIA", "OTRO",
] as const;

const estadosTrabajo = [
  "BORRADOR", "ENVIADO", "EN_CURSO", "ADJUDICADO", "COMPLETADO", "CANCELADO",
] as const;

export const createProveedorSchema = z.object({
  nombre: z.string().min(1, "Nombre obligatorio"),
  contacto: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  categorias: z.array(z.enum(categorias)).min(1, "Al menos una categoría"),
  notas: z.string().optional(),
});

export const updateProveedorSchema = createProveedorSchema.partial().extend({
  activo: z.boolean().optional(),
});

export const createTrabajoSchema = z.object({
  titulo: z.string().min(1, "Título obligatorio"),
  descripcion: z.string().optional(),
  categoria: z.enum(categorias),
  inmuebleId: z.string().optional(),
  fechaLimite: z.string().optional(),
  notas: z.string().optional(),
});

export const updateTrabajoSchema = createTrabajoSchema.partial().extend({
  estado: z.enum(estadosTrabajo).optional(),
  adjudicadoId: z.string().optional(),
  importeAdjudicado: z.number().optional(),
});

export const enviarSolicitudesSchema = z.object({
  proveedorIds: z.array(z.string()).min(1, "Selecciona al menos un proveedor"),
  enviar: z.boolean().default(true),
  via: z.enum(["whatsapp", "email", "manual"]).default("whatsapp"),
});

export const registrarPresupuestoSchema = z.object({
  importe: z.number().positive("El importe debe ser positivo"),
  detallePresupuesto: z.string().optional(),
  documentoUrl: z.string().optional(),
});

export const valorarSchema = z.object({
  valoracion: z.number().int().min(1).max(5),
  comentarioValoracion: z.string().optional(),
});

export type CreateProveedorInput = z.infer<typeof createProveedorSchema>;
export type UpdateProveedorInput = z.infer<typeof updateProveedorSchema>;
export type CreateTrabajoInput = z.infer<typeof createTrabajoSchema>;
export type UpdateTrabajoInput = z.infer<typeof updateTrabajoSchema>;
