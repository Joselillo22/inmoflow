import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import puppeteer from "puppeteer";
import { mkdir } from "fs/promises";
import { join } from "path";

interface InformeData {
  propietarioId: string;
  propietario: { nombre: string; apellidos: string | null };
  inmueble: {
    referencia: string;
    titulo: string;
    precio: number;
    localidad: string;
  };
  periodo: string;
  visitasCount: number;
  contactosCount: number;
  consultasPortal: number;
  visitas: Array<{
    fecha: string;
    resultado: string;
    leadNombre: string;
  }>;
  resumen: string;
}

export async function generarInformePropietario(
  propietarioId: string,
  inmuebleId: string,
  periodo: string
): Promise<InformeData> {
  const [propietario, inmueble] = await Promise.all([
    prisma.propietario.findUniqueOrThrow({ where: { id: propietarioId } }),
    prisma.inmueble.findUniqueOrThrow({ where: { id: inmuebleId } }),
  ]);

  const [year, month] = periodo.split("-").map(Number);
  const desde = new Date(year, month - 1, 1);
  const hasta = new Date(year, month, 0, 23, 59, 59);

  const [visitas, interacciones, publicaciones] = await Promise.all([
    prisma.visita.findMany({
      where: { inmuebleId, fecha: { gte: desde, lte: hasta } },
      include: { lead: { select: { nombre: true, apellidos: true } } },
      orderBy: { fecha: "desc" },
    }),
    prisma.interaccion.count({
      where: {
        lead: { visitas: { some: { inmuebleId } } },
        fecha: { gte: desde, lte: hasta },
      },
    }),
    prisma.publicacion.findMany({
      where: { inmuebleId, estado: "PUBLICADO" },
    }),
  ]);

  const visitasCount = visitas.length;
  const contactosCount = interacciones;
  const consultasPortal = publicaciones.length;

  let resumen = `Informe de actividad para "${inmueble.titulo}" (${inmueble.referencia}).\n`;
  resumen += `Periodo: ${periodo}.\n\n`;
  resumen += `Durante este periodo se han realizado ${visitasCount} visitas al inmueble`;
  resumen += ` y se han registrado ${contactosCount} interacciones con posibles compradores.\n`;
  resumen += `El inmueble est\u00e1 publicado en ${consultasPortal} portales.\n`;
  resumen += `Precio actual: ${formatCurrency(Number(inmueble.precio))}.\n`;

  if (visitasCount === 0) {
    resumen += "\nRecomendaci\u00f3n: Considerar ajuste de precio o mejora de fotos para incrementar visitas.";
  } else if (visitasCount > 5) {
    resumen += "\nBuen nivel de actividad. Las visitas est\u00e1n generando inter\u00e9s en el inmueble.";
  }

  const informeId = `${propietarioId}-${inmuebleId}-${periodo}`;
  await prisma.informePropietario.upsert({
    where: { id: informeId },
    create: {
      id: informeId,
      propietarioId,
      inmuebleId,
      periodo,
      visitasCount,
      contactosCount,
      consultasPortal,
      resumen,
    },
    update: {
      visitasCount,
      contactosCount,
      consultasPortal,
      resumen,
    },
  });

  return {
    propietarioId,
    propietario: { nombre: propietario.nombre, apellidos: propietario.apellidos },
    inmueble: {
      referencia: inmueble.referencia,
      titulo: inmueble.titulo,
      precio: Number(inmueble.precio),
      localidad: inmueble.localidad,
    },
    periodo,
    visitasCount,
    contactosCount,
    consultasPortal,
    visitas: visitas.map((v) => ({
      fecha: formatDate(v.fecha),
      resultado: v.resultado.replace(/_/g, " "),
      leadNombre: `${v.lead.nombre} ${v.lead.apellidos ?? ""}`.trim(),
    })),
    resumen,
  };
}

function e(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function generarInformeHTML(data: InformeData): string {
  const visitasRows = data.visitas
    .map((v) => `<tr><td>${e(v.fecha)}</td><td>${e(v.leadNombre)}</td><td>${e(v.resultado)}</td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #0f172a; line-height: 1.6; }
  .header { border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { color: #2563eb; margin: 0; font-size: 24px; }
  .header p { color: #64748b; margin: 5px 0 0; }
  .section { margin-bottom: 25px; }
  .section h2 { color: #0f172a; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
  .stats { display: flex; gap: 20px; margin: 20px 0; }
  .stat { background: #f8fafc; border-radius: 8px; padding: 15px 20px; flex: 1; text-align: center; }
  .stat .value { font-size: 28px; font-weight: bold; color: #2563eb; }
  .stat .label { font-size: 12px; color: #64748b; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  th { background: #f8fafc; font-weight: 600; font-size: 13px; color: #64748b; }
  td { font-size: 14px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px; }
  .resumen { background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px 20px; border-radius: 0 8px 8px 0; }
</style>
</head>
<body>
  <div class="header">
    <h1>InmoFlow \u2014 Informe para propietario</h1>
    <p>Periodo: ${e(data.periodo)} | ${e(data.inmueble.referencia)}</p>
  </div>
  <div class="section">
    <h2>Datos del inmueble</h2>
    <p><strong>${e(data.inmueble.titulo)}</strong></p>
    <p>Precio: <strong>${formatCurrency(data.inmueble.precio)}</strong> \u00b7 Localidad: ${e(data.inmueble.localidad)}</p>
    <p>Propietario: ${e(data.propietario.nombre)} ${e(data.propietario.apellidos ?? "")}</p>
  </div>
  <div class="stats">
    <div class="stat"><div class="value">${data.visitasCount}</div><div class="label">Visitas realizadas</div></div>
    <div class="stat"><div class="value">${data.contactosCount}</div><div class="label">Contactos registrados</div></div>
    <div class="stat"><div class="value">${data.consultasPortal}</div><div class="label">Portales publicados</div></div>
  </div>
  ${data.visitas.length > 0 ? `
  <div class="section">
    <h2>Detalle de visitas</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Visitante</th><th>Resultado</th></tr></thead>
      <tbody>${visitasRows}</tbody>
    </table>
  </div>` : ""}
  <div class="section">
    <h2>Resumen</h2>
    <div class="resumen">${e(data.resumen).replace(/\n/g, "<br>")}</div>
  </div>
  <div class="footer">
    <p>Informe generado autom\u00e1ticamente por InmoFlow CRM \u00b7 ${new Date().toLocaleDateString("es-ES")}</p>
  </div>
</body>
</html>`;
}

export async function generarInformePDF(data: InformeData): Promise<string> {
  const html = generarInformeHTML(data);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfDir = join(process.cwd(), "public", "informes");
    await mkdir(pdfDir, { recursive: true });

    const filename = `informe-${data.inmueble.referencia}-${data.periodo}.pdf`;
    const filepath = join(pdfDir, filename);

    await page.pdf({
      path: filepath,
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });

    const pdfUrl = `/informes/${filename}`;

    // Actualizar URL del PDF en BD
    const informeId = `${data.propietarioId}-${data.inmueble.referencia}-${data.periodo}`;
    await prisma.informePropietario.updateMany({
      where: {
        propietarioId: data.propietarioId,
        periodo: data.periodo,
      },
      data: { pdfUrl },
    });

    return pdfUrl;
  } finally {
    await browser.close();
  }
}

// Generar todos los informes del mes anterior
export async function generarInformesMensuales(): Promise<{
  generados: number;
  errores: string[];
}> {
  const now = new Date();
  const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodo = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, "0")}`;

  const inmuebles = await prisma.inmueble.findMany({
    where: {
      estado: { in: ["ACTIVO", "EN_CAPTACION", "RESERVADO"] },
      propietarioId: { not: null },
    },
    select: { id: true, propietarioId: true, referencia: true },
  });

  let generados = 0;
  const errores: string[] = [];

  for (const inm of inmuebles) {
    if (!inm.propietarioId) continue;
    try {
      const data = await generarInformePropietario(inm.propietarioId, inm.id, periodo);
      await generarInformePDF(data);
      generados++;
    } catch (err) {
      errores.push(`Error generando informe ${inm.referencia}: ${(err as Error).message}`);
    }
  }

  return { generados, errores };
}
