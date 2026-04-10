import { z } from "zod";

export const createComercialSchema = z.object({
  email: z.string().email("Email no válido"),
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellidos: z.string().min(1, "Los apellidos son obligatorios"),
  password: z.string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[a-z]/, "Debe contener al menos una minúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
  telefono: z.string().min(1, "El teléfono es obligatorio"),
  zona: z.string().min(1, "La zona es obligatoria"),
  numRegistroCV: z.string().optional(),
});

export const updateComercialSchema = z.object({
  nombre: z.string().min(1).optional(),
  apellidos: z.string().min(1).optional(),
  telefono: z.string().min(1).optional(),
  zona: z.string().min(1).optional(),
  numRegistroCV: z.string().optional(),
  activo: z.boolean().optional(),
});

export type CreateComercialInput = z.infer<typeof createComercialSchema>;
export type UpdateComercialInput = z.infer<typeof updateComercialSchema>;
