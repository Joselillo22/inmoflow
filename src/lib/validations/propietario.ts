import { z } from "zod";

export const createPropietarioSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  apellidos: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email("Email no valido").optional().or(z.literal("")),
  dniNie: z.string().optional(),
  tipoDocumento: z.string().optional(),
  nacionalidad: z.string().optional(),
  notas: z.string().optional(),
});

export const updatePropietarioSchema = z.object({
  nombre: z.string().min(1).optional(),
  apellidos: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  dniNie: z.string().optional(),
  tipoDocumento: z.string().optional(),
  nacionalidad: z.string().optional(),
  actividadPro: z.string().optional(),
  origenFondos: z.string().optional(),
  notas: z.string().optional(),
  kycVerificado: z.boolean().optional(),
});

export const verificarKYCSchema = z.object({
  dniNie: z.string().min(1, "DNI/NIE es obligatorio"),
  tipoDocumento: z.string().min(1, "Tipo de documento es obligatorio"),
  nacionalidad: z.string().min(1, "Nacionalidad es obligatoria"),
  actividadPro: z.string().min(1, "Actividad profesional es obligatoria"),
  origenFondos: z.string().min(1, "Origen de fondos es obligatorio"),
});

export type CreatePropietarioInput = z.infer<typeof createPropietarioSchema>;
export type UpdatePropietarioInput = z.infer<typeof updatePropietarioSchema>;
export type VerificarKYCInput = z.infer<typeof verificarKYCSchema>;
