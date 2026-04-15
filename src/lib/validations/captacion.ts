import { z } from "zod";

export const createCaptacionSchema = z.object({
  urlAnuncio: z.string().url().optional(),
  portal: z.enum([
    "IDEALISTA", "FOTOCASA", "MILANUNCIOS", "WALLAPOP",
    "CARTEL_CALLE", "REFERIDO", "WEB_PROPIA", "PUERTA_FRIA", "OTRO",
  ]),
  operacion: z.enum(["VENTA", "ALQUILER"]),
  titulo: z.string().optional(),
  descripcionOriginal: z.string().optional(),
  precio: z.number().positive().optional(),
  direccionAproximada: z.string().optional(),
  localidad: z.string().optional(),
  codigoPostal: z.string().optional(),
  tipoInmueble: z.string().optional(),
  habitaciones: z.number().int().min(0).optional(),
  banos: z.number().int().min(0).optional(),
  metrosConstruidos: z.number().int().positive().optional(),
  planta: z.number().int().optional(),
  extras: z.record(z.string(), z.any()).optional(),
  fotos: z.array(z.string()).optional(),
  nombrePropietario: z.string().optional(),
  telefonoPropietario: z.string().optional(),
  emailPropietario: z.string().email().optional().or(z.literal("")),
  comercialId: z.string().optional(),
  notas: z.string().optional(),
});

export const updateCaptacionSchema = createCaptacionSchema.partial().extend({
  estado: z.enum([
    "NUEVA", "CONTACTADA", "VISITA_PROGRAMADA", "VISITADA",
    "VALORACION_PRESENTADA", "PROPUESTA_MANDATO", "MANDATO_FIRMADO", "DESCARTADA",
  ]).optional(),
  motivoDescarte: z.string().optional(),
  fechaPrimerContacto: z.string().datetime().nullable().optional(),
  fechaVisita: z.string().datetime().nullable().optional(),
  fechaValoracion: z.string().datetime().nullable().optional(),
  fechaPropuesta: z.string().datetime().nullable().optional(),
  fechaMandato: z.string().datetime().nullable().optional(),
});

export const asignarCaptacionSchema = z.object({
  comercialId: z.string().min(1),
});

export const descartarCaptacionSchema = z.object({
  motivo: z.string().min(1),
});

export const configuracionCaptacionSchema = z.object({
  scraperActivo: z.boolean().optional(),
  idealista: z.boolean().optional(),
  fotocasa: z.boolean().optional(),
  milanuncios: z.boolean().optional(),
  operacionVenta: z.boolean().optional(),
  operacionAlquiler: z.boolean().optional(),
  nombreInmo: z.string().optional(),
  telefonoAgente: z.string().optional(),
  plantillaWhatsApp: z.string().optional(),
});

export type CreateCaptacionInput = z.infer<typeof createCaptacionSchema>;
export type UpdateCaptacionInput = z.infer<typeof updateCaptacionSchema>;
