import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// Genera documentos legales (hoja de encargo, arras) como HTML
// y los guarda como archivos firmables

interface HojaEncargoData {
  operacionId?: string;
  inmuebleId: string;
  propietarioId: string;
}

export async function generarHojaEncargo(data: HojaEncargoData): Promise<string> {
  const [inmueble, propietario] = await Promise.all([
    prisma.inmueble.findUniqueOrThrow({
      where: { id: data.inmuebleId },
      include: { comercial: { include: { usuario: true } } },
    }),
    prisma.propietario.findUniqueOrThrow({ where: { id: data.propietarioId } }),
  ]);

  const fecha = formatDate(new Date().toISOString());
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.8; font-size: 14px; }
  h1 { color: #1a56db; font-size: 22px; text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; }
  h2 { font-size: 16px; margin-top: 30px; color: #374151; }
  .field { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dotted #d1d5db; }
  .field-label { font-weight: bold; color: #4b5563; }
  .signature-area { margin-top: 60px; display: flex; justify-content: space-between; }
  .signature-box { width: 45%; text-align: center; }
  .signature-line { border-top: 1px solid #1a1a1a; margin-top: 80px; padding-top: 5px; }
  .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; text-align: center; }
</style></head><body>
  <h1>HOJA DE ENCARGO DE VENTA</h1>
  <p style="text-align:center;color:#6b7280;">Fecha: ${fecha} | Ref: ${inmueble.referencia}</p>

  <h2>DATOS DEL PROPIETARIO</h2>
  <div class="field"><span class="field-label">Nombre completo</span><span>${propietario.nombre} ${propietario.apellidos ?? ""}</span></div>
  <div class="field"><span class="field-label">DNI/NIE</span><span>${propietario.dniNie ?? "Pendiente"}</span></div>
  <div class="field"><span class="field-label">Telefono</span><span>${propietario.telefono ?? ""}</span></div>
  <div class="field"><span class="field-label">Email</span><span>${propietario.email ?? ""}</span></div>

  <h2>DATOS DEL INMUEBLE</h2>
  <div class="field"><span class="field-label">Referencia</span><span>${inmueble.referencia}</span></div>
  <div class="field"><span class="field-label">Direccion</span><span>${inmueble.direccion}, ${inmueble.localidad}</span></div>
  <div class="field"><span class="field-label">Tipo</span><span>${inmueble.tipo} - ${inmueble.operacion}</span></div>
  <div class="field"><span class="field-label">Precio encargo</span><span>${formatCurrency(Number(inmueble.precio))}</span></div>
  <div class="field"><span class="field-label">Ref. catastral</span><span>${inmueble.refCatastral ?? "No facilitada"}</span></div>

  <h2>CONDICIONES DEL ENCARGO</h2>
  <p>El propietario encarga en exclusiva la gestion de ${inmueble.operacion === "VENTA" ? "venta" : "alquiler"} del inmueble descrito al agente inmobiliario.</p>
  <p>Duracion del encargo: <strong>6 meses</strong> desde la fecha de firma.</p>
  <p>Honorarios: Segun acuerdo entre las partes.</p>

  ${inmueble.comercial ? `
  <h2>AGENTE INMOBILIARIO</h2>
  <div class="field"><span class="field-label">Nombre</span><span>${inmueble.comercial.usuario.nombre} ${inmueble.comercial.usuario.apellidos}</span></div>
  ` : ""}

  <div class="signature-area">
    <div class="signature-box">
      <div class="signature-line">El Propietario</div>
    </div>
    <div class="signature-box">
      <div class="signature-line">La Inmobiliaria</div>
    </div>
  </div>

  <div class="footer">
    <p>Documento generado por InmoFlow CRM | ${fecha}</p>
    <p>Este documento requiere firma de ambas partes para su validez legal.</p>
  </div>
</body></html>`;

  const docDir = join(process.cwd(), "public", "documentos", "encargos");
  await mkdir(docDir, { recursive: true });
  const filename = `encargo-${inmueble.referencia}-${randomUUID().slice(0, 8)}.html`;
  await writeFile(join(docDir, filename), html);

  const url = `/documentos/encargos/${filename}`;

  // Guardar como documento del inmueble
  await prisma.documento.create({
    data: {
      inmuebleId: data.inmuebleId,
      tipo: "hoja_encargo",
      nombre: `Hoja de encargo - ${propietario.nombre} ${propietario.apellidos ?? ""}`,
      url,
    },
  });

  return url;
}

export async function generarDocumentoArras(operacionId: string): Promise<string> {
  const op = await prisma.operacion.findUniqueOrThrow({
    where: { id: operacionId },
    include: {
      inmueble: { include: { propietario: true } },
      lead: true,
      comercial: { include: { usuario: true } },
    },
  });

  const fecha = formatDate(new Date().toISOString());
  const propietario = op.inmueble.propietario;

  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; line-height: 1.8; font-size: 14px; }
  h1 { color: #1a56db; font-size: 22px; text-align: center; border-bottom: 2px solid #1a56db; padding-bottom: 10px; }
  h2 { font-size: 16px; margin-top: 30px; color: #374151; }
  .field { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dotted #d1d5db; }
  .field-label { font-weight: bold; color: #4b5563; }
  .signature-area { margin-top: 60px; display: flex; justify-content: space-between; }
  .signature-box { width: 30%; text-align: center; }
  .signature-line { border-top: 1px solid #1a1a1a; margin-top: 80px; padding-top: 5px; }
  .footer { margin-top: 40px; font-size: 11px; color: #9ca3af; text-align: center; }
  .highlight { background: #eff6ff; border-left: 4px solid #1a56db; padding: 15px; border-radius: 0 8px 8px 0; margin: 15px 0; }
</style></head><body>
  <h1>CONTRATO DE ARRAS PENITENCIALES</h1>
  <p style="text-align:center;color:#6b7280;">Fecha: ${fecha} | Ref: ${op.inmueble.referencia}</p>

  <h2>PARTE VENDEDORA</h2>
  <div class="field"><span class="field-label">Nombre</span><span>${propietario?.nombre ?? "N/D"} ${propietario?.apellidos ?? ""}</span></div>
  <div class="field"><span class="field-label">DNI/NIE</span><span>${propietario?.dniNie ?? "Pendiente"}</span></div>

  <h2>PARTE COMPRADORA</h2>
  <div class="field"><span class="field-label">Nombre</span><span>${op.lead.nombre} ${op.lead.apellidos ?? ""}</span></div>
  <div class="field"><span class="field-label">Email</span><span>${op.lead.email ?? ""}</span></div>
  <div class="field"><span class="field-label">Telefono</span><span>${op.lead.telefono ?? ""}</span></div>

  <h2>INMUEBLE OBJETO DEL CONTRATO</h2>
  <div class="field"><span class="field-label">Direccion</span><span>${op.inmueble.direccion}, ${op.inmueble.localidad}</span></div>
  <div class="field"><span class="field-label">Ref. catastral</span><span>${op.inmueble.refCatastral ?? "No facilitada"}</span></div>

  <div class="highlight">
    <div class="field"><span class="field-label">Precio de venta acordado</span><span><strong>${formatCurrency(Number(op.precioFinal))}</strong></span></div>
    <div class="field"><span class="field-label">Cantidad entregada como arras</span><span><strong>${formatCurrency(Number(op.precioFinal) * 0.1)}</strong> (10%)</span></div>
    <div class="field"><span class="field-label">Resto a pagar en escritura</span><span>${formatCurrency(Number(op.precioFinal) * 0.9)}</span></div>
  </div>

  <h2>CONDICIONES</h2>
  <p>1. La parte compradora entrega la cantidad indicada como arras penitenciales.</p>
  <p>2. Si la parte compradora desiste, pierde la cantidad entregada.</p>
  <p>3. Si la parte vendedora desiste, devolvera el doble de la cantidad recibida.</p>
  <p>4. La escritura publica se realizara en un plazo maximo de 90 dias desde la firma de este documento.</p>

  <div class="signature-area">
    <div class="signature-box"><div class="signature-line">Vendedor/a</div></div>
    <div class="signature-box"><div class="signature-line">Comprador/a</div></div>
    <div class="signature-box"><div class="signature-line">Agente inmobiliario</div></div>
  </div>

  <div class="footer">
    <p>Documento generado por InmoFlow CRM | ${fecha}</p>
  </div>
</body></html>`;

  const docDir = join(process.cwd(), "public", "documentos", "arras");
  await mkdir(docDir, { recursive: true });
  const filename = `arras-${op.inmueble.referencia}-${randomUUID().slice(0, 8)}.html`;
  await writeFile(join(docDir, filename), html);

  return `/documentos/arras/${filename}`;
}
