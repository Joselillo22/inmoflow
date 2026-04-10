import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { prisma } from "@/lib/prisma";
import { asignarLeadAutomatico } from "./asignacion.service";

interface ParsedLead {
  nombre: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
  fuente: string;
  referencia?: string;
  mensaje?: string;
}

const PORTAL_PATTERNS: Record<string, {
  fromPattern: RegExp;
  fuente: string;
  parser: (text: string, html: string) => ParsedLead | null;
}> = {
  idealista: {
    fromPattern: /idealista/i,
    fuente: "IDEALISTA",
    parser: (text) => {
      const nombre = text.match(/Nombre:\s*(.+)/i)?.[1]?.trim();
      const telefono = text.match(/Tel[eé]fono:\s*([\d\s+]+)/i)?.[1]?.trim();
      const email = text.match(/Email:\s*([\w.+-]+@[\w.-]+)/i)?.[1]?.trim();
      const referencia = text.match(/Referencia:\s*(\S+)/i)?.[1]?.trim();
      const mensaje = text.match(/Mensaje:\s*([\s\S]*?)(?=\n\s*\n|$)/i)?.[1]?.trim();
      if (!nombre) return null;
      const [first, ...rest] = nombre.split(" ");
      return { nombre: first, apellidos: rest.join(" ") || undefined, telefono: telefono?.replace(/\s/g, ""), email, fuente: "IDEALISTA", referencia, mensaje };
    },
  },
  fotocasa: {
    fromPattern: /fotocasa/i,
    fuente: "FOTOCASA",
    parser: (text) => {
      const nombre = text.match(/(?:Nombre|Name):\s*(.+)/i)?.[1]?.trim();
      const telefono = text.match(/Tel[eé]fono:\s*([\d\s+]+)/i)?.[1]?.trim();
      const email = text.match(/(?:Email|Correo):\s*([\w.+-]+@[\w.-]+)/i)?.[1]?.trim();
      const referencia = text.match(/(?:Ref|Referencia):\s*(\S+)/i)?.[1]?.trim();
      if (!nombre) return null;
      const [first, ...rest] = nombre.split(" ");
      return { nombre: first, apellidos: rest.join(" ") || undefined, telefono: telefono?.replace(/\s/g, ""), email, fuente: "FOTOCASA", referencia };
    },
  },
  habitaclia: {
    fromPattern: /habitaclia/i,
    fuente: "HABITACLIA",
    parser: (text) => {
      const nombre = text.match(/(?:Nombre|Contacto):\s*(.+)/i)?.[1]?.trim();
      const telefono = text.match(/Tel[eé]fono:\s*([\d\s+]+)/i)?.[1]?.trim();
      const email = text.match(/Email:\s*([\w.+-]+@[\w.-]+)/i)?.[1]?.trim();
      const referencia = text.match(/Ref(?:erencia)?[.:]?\s*(\S+)/i)?.[1]?.trim();
      if (!nombre) return null;
      const [first, ...rest] = nombre.split(" ");
      return { nombre: first, apellidos: rest.join(" ") || undefined, telefono: telefono?.replace(/\s/g, ""), email, fuente: "HABITACLIA", referencia };
    },
  },
  milanuncios: {
    fromPattern: /milanuncios/i,
    fuente: "MILANUNCIOS",
    parser: (text) => {
      const nombre = text.match(/(?:De|Nombre|Remitente):\s*(.+)/i)?.[1]?.trim();
      const telefono = text.match(/Tel[eé]fono:\s*([\d\s+]+)/i)?.[1]?.trim();
      const email = text.match(/(?:Email|Responder a):\s*([\w.+-]+@[\w.-]+)/i)?.[1]?.trim();
      if (!nombre) return null;
      const [first, ...rest] = nombre.split(" ");
      return { nombre: first, apellidos: rest.join(" ") || undefined, telefono: telefono?.replace(/\s/g, ""), email, fuente: "MILANUNCIOS" };
    },
  },
};

function detectPortal(from: string, subject: string): string | null {
  for (const [key, config] of Object.entries(PORTAL_PATTERNS)) {
    if (config.fromPattern.test(from) || config.fromPattern.test(subject)) {
      return key;
    }
  }
  return null;
}

export async function procesarEmailsPortales(): Promise<{
  procesados: number;
  leadsCreados: number;
  errores: string[];
}> {
  const host = process.env.IMAP_HOST;
  const port = Number(process.env.IMAP_PORT ?? "993");
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;

  if (!host || !user || !pass) {
    return { procesados: 0, leadsCreados: 0, errores: ["IMAP no configurado"] };
  }

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  const result = { procesados: 0, leadsCreados: 0, errores: [] as string[] };

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const messages = client.fetch({ seen: false }, {
        source: true,
        envelope: true,
        uid: true,
      });

      for await (const msg of messages) {
        result.procesados++;
        try {
          if (!msg.source) continue;
          const parsed = await simpleParser(msg.source);
          const from = parsed.from?.text ?? "";
          const subject = parsed.subject ?? "";
          const text = parsed.text ?? "";
          const html = parsed.html ?? "";

          const portalKey = detectPortal(from, subject);
          if (!portalKey) continue;

          const config = PORTAL_PATTERNS[portalKey];
          const leadData = config.parser(text, html as string);
          if (!leadData) {
            result.errores.push("No se pudo parsear email de " + portalKey + ": " + subject);
            continue;
          }

          // Verificar duplicados por email o telefono
          const orConditions = [];
          if (leadData.email) orConditions.push({ email: leadData.email });
          if (leadData.telefono) orConditions.push({ telefono: leadData.telefono });

          if (orConditions.length > 0) {
            const existing = await prisma.lead.findFirst({
              where: { OR: orConditions },
            });
            if (existing) {
              await client.messageFlagsAdd({ uid: msg.uid }, ["\Seen"], { uid: true });
              continue;
            }
          }

          // Buscar inmueble por referencia
          let comercialIdFromInmueble: string | null = null;
          if (leadData.referencia) {
            const inmueble = await prisma.inmueble.findUnique({
              where: { referencia: leadData.referencia },
              select: { comercialId: true },
            });
            if (inmueble?.comercialId) {
              comercialIdFromInmueble = inmueble.comercialId;
            }
          }

          // Crear lead
          const lead = await prisma.lead.create({
            data: {
              nombre: leadData.nombre,
              apellidos: leadData.apellidos,
              telefono: leadData.telefono,
              email: leadData.email,
              fuente: leadData.fuente as "IDEALISTA" | "FOTOCASA" | "HABITACLIA" | "MILANUNCIOS",
              notas: leadData.mensaje ?? "Lead automatico desde " + portalKey,
              comercialId: comercialIdFromInmueble,
            },
          });

          // Asignar automaticamente si no tiene comercial
          if (!comercialIdFromInmueble) {
            await asignarLeadAutomatico(lead.id);
          } else {
            await prisma.tarea.create({
              data: {
                comercialId: comercialIdFromInmueble,
                tipo: "LLAMAR",
                descripcion: "Nuevo lead de " + portalKey + ": " + leadData.nombre + " " + (leadData.apellidos ?? ""),
                prioridad: 1,
                leadId: lead.id,
              },
            });
          }

          result.leadsCreados++;
          await client.messageFlagsAdd({ uid: msg.uid }, ["\Seen"], { uid: true });
        } catch (err) {
          result.errores.push("Error procesando email: " + (err as Error).message);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    result.errores.push("Error IMAP: " + (err as Error).message);
  }

  return result;
}
