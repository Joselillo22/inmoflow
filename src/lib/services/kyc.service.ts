import { prisma } from "@/lib/prisma";

interface KYCData {
  propietarioId: string;
  dniNie: string;
  tipoDocumento: string;
  nacionalidad?: string;
  actividadPro?: string;
  origenFondos?: string;
}

// Umbral PBC: operaciones >10.000€ requieren KYC completo
const PBC_THRESHOLD = 10000;

export async function verificarKYC(data: KYCData) {
  const propietario = await prisma.propietario.update({
    where: { id: data.propietarioId },
    data: {
      dniNie: data.dniNie,
      tipoDocumento: data.tipoDocumento,
      nacionalidad: data.nacionalidad,
      actividadPro: data.actividadPro,
      origenFondos: data.origenFondos,
      kycVerificado: true,
      kycFecha: new Date(),
    },
  });

  return propietario;
}

export async function requiereKYC(operacionId: string): Promise<{
  requerido: boolean;
  motivo: string;
  propietarioVerificado: boolean;
}> {
  const operacion = await prisma.operacion.findUnique({
    where: { id: operacionId },
    include: {
      inmueble: {
        include: { propietario: true },
      },
    },
  });

  if (!operacion) {
    return { requerido: false, motivo: "Operación no encontrada", propietarioVerificado: false };
  }

  const precioFinal = Number(operacion.precioFinal);
  const propietario = operacion.inmueble.propietario;

  if (precioFinal <= PBC_THRESHOLD) {
    return { requerido: false, motivo: "Operación bajo umbral PBC", propietarioVerificado: propietario?.kycVerificado ?? false };
  }

  if (!propietario) {
    return { requerido: true, motivo: "Sin propietario asignado al inmueble", propietarioVerificado: false };
  }

  if (!propietario.kycVerificado) {
    return {
      requerido: true,
      motivo: `Operación de ${precioFinal.toLocaleString("es-ES")}€ requiere verificación KYC del propietario`,
      propietarioVerificado: false,
    };
  }

  // Verificar campos obligatorios PBC
  const camposFaltantes: string[] = [];
  if (!propietario.dniNie) camposFaltantes.push("DNI/NIE");
  if (!propietario.actividadPro) camposFaltantes.push("Actividad profesional");
  if (!propietario.origenFondos) camposFaltantes.push("Origen de fondos");

  if (camposFaltantes.length > 0) {
    return {
      requerido: true,
      motivo: `Faltan datos PBC: ${camposFaltantes.join(", ")}`,
      propietarioVerificado: false,
    };
  }

  return { requerido: false, motivo: "KYC completo", propietarioVerificado: true };
}

export async function getEstadoKYCGlobal() {
  const [totalPropietarios, verificados, sinVerificar, operacionesPendientesKYC] =
    await Promise.all([
      prisma.propietario.count(),
      prisma.propietario.count({ where: { kycVerificado: true } }),
      prisma.propietario.count({ where: { kycVerificado: false } }),
      prisma.operacion.count({
        where: {
          estado: { notIn: ["CAIDA", "CERRADA"] },
          precioFinal: { gte: PBC_THRESHOLD },
          inmueble: {
            propietario: { kycVerificado: false },
          },
        },
      }),
    ]);

  return { totalPropietarios, verificados, sinVerificar, operacionesPendientesKYC };
}
