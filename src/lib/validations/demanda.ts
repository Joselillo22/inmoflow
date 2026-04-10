import { z } from "zod";

export const createDemandaSchema = z.object({
  tipoInmueble: z.enum([
    "PISO", "CASA", "CHALET", "ADOSADO", "ATICO", "DUPLEX",
    "ESTUDIO", "LOCAL", "OFICINA", "NAVE", "SOLAR", "GARAJE", "TRASTERO", "OTRO",
  ]).optional(),
  tipoOperacion: z.enum(["VENTA", "ALQUILER", "ALQUILER_OPCION_COMPRA", "TRASPASO"]).optional(),
  precioMin: z.number().min(0).optional(),
  precioMax: z.number().min(0).optional(),
  zona: z.string().optional(),
  habitacionesMin: z.number().int().min(0).optional(),
  metrosMin: z.number().int().min(0).optional(),
  extras: z.record(z.string(), z.boolean()).optional(),
});

export const updateDemandaSchema = createDemandaSchema.partial();

export type CreateDemandaInput = z.infer<typeof createDemandaSchema>;
export type UpdateDemandaInput = z.infer<typeof updateDemandaSchema>;
