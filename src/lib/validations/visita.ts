import { z } from "zod";

export const createVisitaSchema = z.object({
  leadId: z.string().min(1, "El contacto es obligatorio"),
  inmuebleId: z.string().min(1, "El inmueble es obligatorio"),
  comercialId: z.string().min(1, "El comercial es obligatorio"),
  fecha: z.string().min(1, "La fecha es obligatoria"),
  notasAntes: z.string().optional(),
});

export const updateVisitaSchema = z.object({
  resultado: z.enum([
    "PENDIENTE", "REALIZADA_INTERESADO", "REALIZADA_NO_INTERESADO",
    "CANCELADA", "NO_SHOW",
  ]).optional(),
  notasDespues: z.string().optional(),
});

export type CreateVisitaInput = z.infer<typeof createVisitaSchema>;
export type UpdateVisitaInput = z.infer<typeof updateVisitaSchema>;
