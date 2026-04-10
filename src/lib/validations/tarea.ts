import { z } from "zod";

export const createTareaSchema = z.object({
  comercialId: z.string().min(1),
  tipo: z.enum([
    "LLAMAR", "WHATSAPP", "EMAIL", "SUBIR_FOTOS", "ENVIAR_INFORME",
    "DOCUMENTACION", "VISITA_CAPTACION", "SEGUIMIENTO", "OTRO",
  ]),
  descripcion: z.string().min(1, "La descripción es obligatoria"),
  fechaLimite: z.string().optional(),
  prioridad: z.number().int().min(0).max(2).default(0),
  leadId: z.string().optional(),
  inmuebleId: z.string().optional(),
});

export const updateTareaSchema = z.object({
  completada: z.boolean().optional(),
  descripcion: z.string().optional(),
  prioridad: z.number().int().min(0).max(2).optional(),
});

export type CreateTareaInput = z.infer<typeof createTareaSchema>;
export type UpdateTareaInput = z.infer<typeof updateTareaSchema>;
