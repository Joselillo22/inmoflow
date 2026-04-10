import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("ERROR: El seed no se puede ejecutar en producción");
    process.exit(1);
  }

  console.log("Seeding database...");

  // Limpiar datos existentes
  await prisma.comision.deleteMany();
  await prisma.operacion.deleteMany();
  await prisma.matching.deleteMany();
  await prisma.publicacion.deleteMany();
  await prisma.interaccion.deleteMany();
  await prisma.tarea.deleteMany();
  await prisma.visita.deleteMany();
  await prisma.demanda.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.foto.deleteMany();
  await prisma.informePropietario.deleteMany();
  await prisma.inmueble.deleteMany();
  await prisma.propietario.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.comercial.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.usuario.deleteMany();

  const passwordHash = await hash("password123", 12);

  // Admin
  const admin = await prisma.usuario.create({
    data: {
      email: "admin@inmoflow.es",
      nombre: "Carlos",
      apellidos: "García López",
      passwordHash,
      rol: "ADMIN",
    },
  });
  console.log(`Admin creado: ${admin.email}`);

  // Comerciales
  const com1User = await prisma.usuario.create({
    data: {
      email: "pedro@inmoflow.es",
      nombre: "Pedro",
      apellidos: "Martínez Ruiz",
      passwordHash,
      rol: "COMERCIAL",
    },
  });
  const comercial1 = await prisma.comercial.create({
    data: {
      usuarioId: com1User.id,
      telefono: "666111222",
      zona: "Alicante Centro",
    },
  });

  const com2User = await prisma.usuario.create({
    data: {
      email: "maria@inmoflow.es",
      nombre: "María",
      apellidos: "Fernández Torres",
      passwordHash,
      rol: "COMERCIAL",
    },
  });
  const comercial2 = await prisma.comercial.create({
    data: {
      usuarioId: com2User.id,
      telefono: "666333444",
      zona: "Playa de San Juan",
    },
  });
  console.log("Comerciales creados");

  // Propietarios
  const prop1 = await prisma.propietario.create({
    data: {
      nombre: "Antonio",
      apellidos: "López Sánchez",
      telefono: "965111222",
      email: "antonio@email.com",
      dniNie: "12345678A",
      tipoDocumento: "DNI",
    },
  });

  const prop2 = await prisma.propietario.create({
    data: {
      nombre: "Hans",
      apellidos: "Müller",
      telefono: "965333444",
      email: "hans@email.de",
      dniNie: "X1234567B",
      tipoDocumento: "NIE",
      nacionalidad: "Alemania",
    },
  });

  // Inmuebles
  const inmuebles = await Promise.all([
    prisma.inmueble.create({
      data: {
        comercialId: comercial1.id,
        propietarioId: prop1.id,
        referencia: "INM-001",
        tipo: "PISO",
        operacion: "VENTA",
        estado: "ACTIVO",
        titulo: "Piso 3 hab reformado en centro",
        descripcion: "Piso completamente reformado con materiales de primera calidad",
        precio: 185000,
        metrosConstruidos: 95,
        metrosUtiles: 82,
        habitaciones: 3,
        banos: 2,
        planta: 4,
        ascensor: true,
        terraza: true,
        aireAcondicionado: true,
        direccion: "Calle Mayor 15, 4ºA",
        codigoPostal: "03001",
        localidad: "Alicante",
        latitud: 38.3452,
        longitud: -0.4815,
      },
    }),
    prisma.inmueble.create({
      data: {
        comercialId: comercial1.id,
        propietarioId: prop2.id,
        referencia: "INM-002",
        tipo: "ATICO",
        operacion: "VENTA",
        estado: "ACTIVO",
        titulo: "Ático con vistas al mar en Playa",
        descripcion: "Espectacular ático con terraza panorámica y vistas al Mediterráneo",
        precio: 320000,
        metrosConstruidos: 120,
        metrosUtiles: 105,
        habitaciones: 4,
        banos: 2,
        planta: 8,
        ascensor: true,
        piscina: true,
        terraza: true,
        aireAcondicionado: true,
        garaje: true,
        direccion: "Av. Costa Blanca 45, 8º",
        codigoPostal: "03540",
        localidad: "Playa de San Juan",
        latitud: 38.3745,
        longitud: -0.4105,
      },
    }),
    prisma.inmueble.create({
      data: {
        comercialId: comercial2.id,
        propietarioId: prop1.id,
        referencia: "INM-003",
        tipo: "CASA",
        operacion: "VENTA",
        estado: "EN_CAPTACION",
        titulo: "Casa adosada con jardín",
        precio: 245000,
        metrosConstruidos: 150,
        habitaciones: 4,
        banos: 3,
        garaje: true,
        piscina: true,
        direccion: "Urb. Las Palmeras 12",
        codigoPostal: "03110",
        localidad: "Mutxamel",
      },
    }),
    prisma.inmueble.create({
      data: {
        comercialId: comercial2.id,
        referencia: "INM-004",
        tipo: "ESTUDIO",
        operacion: "ALQUILER",
        estado: "ACTIVO",
        titulo: "Estudio amueblado cerca de la universidad",
        precio: 550,
        metrosConstruidos: 35,
        habitaciones: 1,
        banos: 1,
        ascensor: true,
        aireAcondicionado: true,
        direccion: "Calle San Vicente 88, 2ºB",
        codigoPostal: "03690",
        localidad: "San Vicente del Raspeig",
      },
    }),
    prisma.inmueble.create({
      data: {
        comercialId: comercial1.id,
        referencia: "INM-005",
        tipo: "LOCAL",
        operacion: "ALQUILER",
        estado: "ACTIVO",
        titulo: "Local comercial en zona peatonal",
        precio: 1200,
        metrosConstruidos: 80,
        direccion: "Calle Castaños 22",
        codigoPostal: "03001",
        localidad: "Alicante",
      },
    }),
  ]);
  console.log(`${inmuebles.length} inmuebles creados`);

  // Leads
  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        comercialId: comercial1.id,
        nombre: "Juan",
        apellidos: "Pérez García",
        telefono: "666555111",
        email: "juan.perez@gmail.com",
        fuente: "IDEALISTA",
        faseFunnel: "VISITA_PROGRAMADA",
        score: 75,
        idioma: "es",
      },
    }),
    prisma.lead.create({
      data: {
        comercialId: comercial1.id,
        nombre: "Sarah",
        apellidos: "Williams",
        telefono: "666555222",
        email: "sarah.w@gmail.com",
        fuente: "GOOGLE_ADS",
        faseFunnel: "CUALIFICADO",
        score: 60,
        nacionalidad: "Reino Unido",
        idioma: "en",
      },
    }),
    prisma.lead.create({
      data: {
        comercialId: comercial2.id,
        nombre: "Elena",
        apellidos: "Romero",
        telefono: "666555333",
        email: "elena.r@hotmail.com",
        fuente: "REFERIDO",
        faseFunnel: "CONTACTADO",
        score: 50,
      },
    }),
    prisma.lead.create({
      data: {
        comercialId: comercial2.id,
        nombre: "Thomas",
        apellidos: "Schmidt",
        telefono: "666555444",
        fuente: "FOTOCASA",
        faseFunnel: "NUEVO",
        score: 30,
        nacionalidad: "Alemania",
        idioma: "de",
      },
    }),
    prisma.lead.create({
      data: {
        nombre: "Laura",
        apellidos: "Martín",
        telefono: "666555555",
        email: "laura.martin@gmail.com",
        fuente: "WEB_PROPIA",
        faseFunnel: "NUEVO",
        notas: "Busca piso de 2-3 hab en centro, presupuesto hasta 170.000€",
      },
    }),
    prisma.lead.create({
      data: {
        comercialId: comercial1.id,
        nombre: "Ahmed",
        apellidos: "Ben Ali",
        telefono: "666555666",
        fuente: "META_ADS",
        faseFunnel: "OFERTA",
        score: 90,
        nacionalidad: "Marruecos",
      },
    }),
    prisma.lead.create({
      data: {
        comercialId: comercial2.id,
        nombre: "Isabel",
        apellidos: "Navarro Díaz",
        telefono: "666555777",
        email: "isabel.nd@yahoo.es",
        fuente: "PUERTA_FRIA",
        faseFunnel: "VISITA_REALIZADA",
        score: 65,
      },
    }),
    prisma.lead.create({
      data: {
        comercialId: comercial1.id,
        nombre: "Robert",
        apellidos: "Johnson",
        email: "r.johnson@outlook.com",
        fuente: "HABITACLIA",
        faseFunnel: "CONTACTADO",
        score: 40,
        nacionalidad: "Estados Unidos",
        idioma: "en",
      },
    }),
    prisma.lead.create({
      data: {
        nombre: "Pilar",
        apellidos: "Gómez Ruiz",
        telefono: "666555888",
        fuente: "TELEFONO",
        faseFunnel: "NUEVO",
      },
    }),
    prisma.lead.create({
      data: {
        comercialId: comercial2.id,
        nombre: "Klaus",
        apellidos: "Weber",
        telefono: "666555999",
        email: "k.weber@gmail.com",
        fuente: "MILANUNCIOS",
        faseFunnel: "RESERVA",
        score: 95,
        nacionalidad: "Alemania",
        idioma: "de",
      },
    }),
  ]);
  console.log(`${leads.length} leads creados`);

  // Visitas para hoy y mañana
  const today = new Date();
  const visita1Date = new Date(today);
  visita1Date.setHours(10, 0, 0, 0);
  const visita2Date = new Date(today);
  visita2Date.setHours(12, 30, 0, 0);
  const visita3Date = new Date(today);
  visita3Date.setHours(17, 0, 0, 0);

  await Promise.all([
    prisma.visita.create({
      data: {
        leadId: leads[0].id,
        inmuebleId: inmuebles[0].id,
        comercialId: comercial1.id,
        fecha: visita1Date,
        notasAntes: "Cliente muy interesado, viene con su pareja",
      },
    }),
    prisma.visita.create({
      data: {
        leadId: leads[1].id,
        inmuebleId: inmuebles[1].id,
        comercialId: comercial1.id,
        fecha: visita2Date,
        notasAntes: "Cliente inglesa, hablar despacio",
      },
    }),
    prisma.visita.create({
      data: {
        leadId: leads[2].id,
        inmuebleId: inmuebles[2].id,
        comercialId: comercial2.id,
        fecha: visita3Date,
      },
    }),
  ]);
  console.log("Visitas creadas");

  // Tareas
  await Promise.all([
    prisma.tarea.create({
      data: {
        comercialId: comercial1.id,
        tipo: "LLAMAR",
        descripcion: "Llamar a Juan Pérez para confirmar visita de mañana",
        prioridad: 2,
        leadId: leads[0].id,
      },
    }),
    prisma.tarea.create({
      data: {
        comercialId: comercial1.id,
        tipo: "WHATSAPP",
        descripcion: "Enviar fotos del ático a Sarah Williams",
        prioridad: 1,
        leadId: leads[1].id,
        inmuebleId: inmuebles[1].id,
      },
    }),
    prisma.tarea.create({
      data: {
        comercialId: comercial1.id,
        tipo: "DOCUMENTACION",
        descripcion: "Pedir nota simple del piso de Calle Mayor",
        prioridad: 0,
        inmuebleId: inmuebles[0].id,
      },
    }),
    prisma.tarea.create({
      data: {
        comercialId: comercial2.id,
        tipo: "LLAMAR",
        descripcion: "Contactar nuevo lead: Thomas Schmidt",
        prioridad: 1,
        leadId: leads[3].id,
      },
    }),
    prisma.tarea.create({
      data: {
        comercialId: comercial2.id,
        tipo: "SUBIR_FOTOS",
        descripcion: "Subir fotos profesionales de casa en Mutxamel",
        prioridad: 0,
        inmuebleId: inmuebles[2].id,
      },
    }),
  ]);
  console.log("Tareas creadas");

  console.log("\n✅ Seed completado!");
  console.log("\nCredenciales de acceso:");
  console.log("  Admin:      admin@inmoflow.es / password123");
  console.log("  Comercial:  pedro@inmoflow.es / password123");
  console.log("  Comercial:  maria@inmoflow.es / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
