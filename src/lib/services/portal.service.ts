import { prisma } from "@/lib/prisma";
import { TIPO_INMUEBLE_LABELS, TIPO_OPERACION_LABELS } from "@/lib/utils/constants";

// Genera feed XML compatible con Idealista
export async function generarFeedIdealista(): Promise<string> {
  const inmuebles = await prisma.inmueble.findMany({
    where: {
      estado: "ACTIVO",
      publicaciones: { some: { portal: "IDEALISTA", estado: "PUBLICADO" } },
    },
    include: { fotos: { orderBy: { orden: "asc" } }, propietario: true },
  });

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<idealista>\n`;
  xml += `  <customer>\n`;
  xml += `    <name>InmoFlow CRM</name>\n`;
  xml += `    <date>${new Date().toISOString().split("T")[0]}</date>\n`;
  xml += `  </customer>\n`;

  for (const inm of inmuebles) {
    xml += `  <property>\n`;
    xml += `    <reference>${escapeXml(inm.referencia)}</reference>\n`;
    xml += `    <operation>${inm.operacion === "VENTA" ? "sale" : "rent"}</operation>\n`;
    xml += `    <type>${mapTipoIdealista(inm.tipo)}</type>\n`;
    xml += `    <price>${Number(inm.precio)}</price>\n`;
    xml += `    <address>${escapeXml(inm.direccion)}</address>\n`;
    xml += `    <city>${escapeXml(inm.localidad)}</city>\n`;
    xml += `    <province>${escapeXml(inm.provincia)}</province>\n`;
    if (inm.codigoPostal) xml += `    <zipcode>${inm.codigoPostal}</zipcode>\n`;
    xml += `    <title>${escapeXml(inm.titulo)}</title>\n`;
    if (inm.descripcion) xml += `    <description>${escapeXml(inm.descripcion)}</description>\n`;
    if (inm.metrosConstruidos) xml += `    <area>${inm.metrosConstruidos}</area>\n`;
    if (inm.habitaciones) xml += `    <rooms>${inm.habitaciones}</rooms>\n`;
    if (inm.banos) xml += `    <bathrooms>${inm.banos}</bathrooms>\n`;
    if (inm.planta !== null) xml += `    <floor>${inm.planta}</floor>\n`;
    if (inm.ascensor) xml += `    <elevator>true</elevator>\n`;
    if (inm.garaje) xml += `    <garage>true</garage>\n`;
    if (inm.piscina) xml += `    <pool>true</pool>\n`;
    if (inm.terraza) xml += `    <terrace>true</terrace>\n`;
    if (inm.aireAcondicionado) xml += `    <air_conditioning>true</air_conditioning>\n`;
    if (inm.certEnergetico) xml += `    <energy_certificate>${inm.certEnergetico}</energy_certificate>\n`;
    if (inm.latitud && inm.longitud) {
      xml += `    <latitude>${inm.latitud}</latitude>\n`;
      xml += `    <longitude>${inm.longitud}</longitude>\n`;
    }

    if (inm.fotos.length > 0) {
      xml += `    <images>\n`;
      for (const foto of inm.fotos) {
        xml += `      <image>${escapeXml(foto.url)}</image>\n`;
      }
      xml += `    </images>\n`;
    }

    xml += `  </property>\n`;
  }

  xml += `</idealista>`;
  return xml;
}

// Genera feed JSON compatible con Fotocasa/genérico
export async function generarFeedJSON() {
  const inmuebles = await prisma.inmueble.findMany({
    where: { estado: "ACTIVO" },
    include: { fotos: { orderBy: { orden: "asc" } } },
  });

  return inmuebles.map((inm) => ({
    reference: inm.referencia,
    operation: TIPO_OPERACION_LABELS[inm.operacion],
    type: TIPO_INMUEBLE_LABELS[inm.tipo],
    price: Number(inm.precio),
    title: inm.titulo,
    description: inm.descripcion,
    area: inm.metrosConstruidos,
    rooms: inm.habitaciones,
    bathrooms: inm.banos,
    floor: inm.planta,
    address: inm.direccion,
    city: inm.localidad,
    province: inm.provincia,
    zipcode: inm.codigoPostal,
    latitude: inm.latitud,
    longitude: inm.longitud,
    features: {
      elevator: inm.ascensor ?? false,
      garage: inm.garaje ?? false,
      pool: inm.piscina ?? false,
      terrace: inm.terraza ?? false,
      air_conditioning: inm.aireAcondicionado ?? false,
      heating: inm.calefaccion ?? false,
    },
    energy_certificate: inm.certEnergetico,
    images: inm.fotos.map((f) => f.url),
  }));
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function mapTipoIdealista(tipo: string): string {
  const map: Record<string, string> = {
    PISO: "flat", CASA: "house", CHALET: "chalet", ADOSADO: "semiDetached",
    ATICO: "penthouse", DUPLEX: "duplex", ESTUDIO: "studio",
    LOCAL: "premises", OFICINA: "office", NAVE: "warehouse",
    SOLAR: "land", GARAJE: "garage", TRASTERO: "storageRoom", OTRO: "other",
  };
  return map[tipo] ?? "other";
}
