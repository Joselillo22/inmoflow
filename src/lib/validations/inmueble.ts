import { z } from "zod";

export const createInmuebleSchema = z.object({
  referencia: z.string().min(1, "La referencia es obligatoria"),
  tipo: z.enum([
    "PISO", "CASA", "CHALET", "ADOSADO", "ATICO", "DUPLEX",
    "ESTUDIO", "LOCAL", "OFICINA", "NAVE", "SOLAR", "GARAJE", "TRASTERO", "OTRO",
  ]),
  operacion: z.enum(["VENTA", "ALQUILER", "ALQUILER_OPCION_COMPRA", "TRASPASO"]),
  titulo: z.string().min(1, "El título es obligatorio"),
  descripcion: z.string().optional(),
  precio: z.number().positive("El precio debe ser positivo"),
  metrosConstruidos: z.number().int().positive().optional(),
  metrosUtiles: z.number().int().positive().optional(),
  habitaciones: z.number().int().min(0).optional(),
  banos: z.number().int().min(0).optional(),
  planta: z.number().int().optional(),
  ascensor: z.boolean().optional(),
  garaje: z.boolean().optional(),
  trastero: z.boolean().optional(),
  piscina: z.boolean().optional(),
  terraza: z.boolean().optional(),
  aireAcondicionado: z.boolean().optional(),
  calefaccion: z.boolean().optional(),
  direccion: z.string().min(1, "La dirección es obligatoria"),
  codigoPostal: z.string().optional(),
  localidad: z.string().min(1, "La localidad es obligatoria"),
  provincia: z.string().default("Alicante"),
  comercialId: z.string().optional(),
  propietarioId: z.string().optional(),
  refCatastral: z.string().optional(),
  certEnergetico: z.string().optional(),
  anoConst: z.number().int().optional(),
  licenciaTuristica: z.string().optional(),
  descripcionEn: z.string().optional(),
  descripcionDe: z.string().optional(),
  descripcionNl: z.string().optional(),
  descripcionFr: z.string().optional(),
  descripcionSv: z.string().optional(),
  descripcionNo: z.string().optional(),
  descripcionGeneradaPorIA: z.boolean().optional(),
});

export const updateInmuebleSchema = createInmuebleSchema.partial().extend({
  estado: z.enum([
    "EN_CAPTACION", "ACTIVO", "RESERVADO", "VENDIDO", "ALQUILADO", "RETIRADO",
  ]).optional(),
});

export type CreateInmuebleInput = z.infer<typeof createInmuebleSchema>;
export type UpdateInmuebleInput = z.infer<typeof updateInmuebleSchema>;
