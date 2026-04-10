import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

const PCT_EMPRESA = 70;
const PCT_COMERCIAL = 30;

interface CrearComisionInput {
  operacionId: string;
  comercialId: string;
  precioFinal: number;
  comisionPctPropietario: number; // ej: 4 = 4%
}

export async function calcularComision(input: CrearComisionInput) {
  const total = input.precioFinal * (input.comisionPctPropietario / 100);
  const importeEmpresa = total * (PCT_EMPRESA / 100);
  const importeComercial = total * (PCT_COMERCIAL / 100);

  const comision = await prisma.comision.create({
    data: {
      operacionId: input.operacionId,
      comercialId: input.comercialId,
      total: new Decimal(total.toFixed(2)),
      pctEmpresa: PCT_EMPRESA,
      pctComercial: PCT_COMERCIAL,
      importeEmpresa: new Decimal(importeEmpresa.toFixed(2)),
      importeComercial: new Decimal(importeComercial.toFixed(2)),
    },
  });

  // Actualizar la operación con la comisión total
  await prisma.operacion.update({
    where: { id: input.operacionId },
    data: {
      comisionPctPropietario: new Decimal(input.comisionPctPropietario.toFixed(2)),
      comisionTotal: new Decimal(total.toFixed(2)),
    },
  });

  return comision;
}

export async function getComisionesComercial(comercialId: string) {
  return prisma.comision.findMany({
    where: { comercialId },
    include: {
      operacion: {
        include: {
          inmueble: { select: { titulo: true, referencia: true } },
          lead: { select: { nombre: true, apellidos: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getResumenComisiones() {
  const [totalPendiente, totalPagado, comisionesMes] = await Promise.all([
    prisma.comision.aggregate({
      where: { estadoPago: "PENDIENTE" },
      _sum: { total: true, importeEmpresa: true, importeComercial: true },
      _count: true,
    }),
    prisma.comision.aggregate({
      where: { estadoPago: "PAGADO" },
      _sum: { total: true, importeEmpresa: true, importeComercial: true },
      _count: true,
    }),
    prisma.comision.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      include: {
        comercial: { include: { usuario: { select: { nombre: true, apellidos: true } } } },
        operacion: {
          include: { inmueble: { select: { titulo: true, referencia: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return { totalPendiente, totalPagado, comisionesMes };
}
