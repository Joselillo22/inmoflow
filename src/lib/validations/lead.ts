import { z } from "zod";

export const createLeadSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellidos: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email no válido").optional().or(z.literal("")),
  fuente: z.enum([
    "IDEALISTA", "FOTOCASA", "HABITACLIA", "MILANUNCIOS",
    "WEB_PROPIA", "GOOGLE_ADS", "META_ADS", "REFERIDO",
    "PUERTA_FRIA", "TELEFONO", "OTRO",
  ]),
  comercialId: z.string().optional(),
  nacionalidad: z.string().optional(),
  idioma: z.string().default("es"),
  notas: z.string().optional(),
});

export const updateLeadSchema = createLeadSchema.partial().extend({
  faseFunnel: z.enum([
    "NUEVO", "CONTACTADO", "CUALIFICADO", "VISITA_PROGRAMADA",
    "VISITA_REALIZADA", "OFERTA", "RESERVA", "CIERRE", "PERDIDO",
  ]).optional(),
  score: z.number().min(0).max(100).optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
