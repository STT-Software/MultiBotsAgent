import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { io } from 'socket.io-client';

// Cargar variables de entorno
dotenv.config({ path: 'apps/services/api-multi-bots/.env' });

const mongoUri = process.env.MONGODB_URI;
const jwtSecrets = process.env.JWT_SECRETS;

if (!mongoUri) {
  console.error('❌ MONGODB_URI no está definido en las variables de entorno.');
  process.exit(1);
}

if (!jwtSecrets) {
  console.error('❌ JWT_SECRETS no está definido en las variables de entorno.');
  process.exit(1);
}

const secret = jwtSecrets.split(',').filter(Boolean)[0];

async function run() {
  console.log('⚡ Iniciando Prueba E2E de Notificaciones Internas...');
  console.log('⚙️  Conectando a MongoDB Atlas...');
  const client = new MongoClient(mongoUri!);
  await client.connect();
  const db = client.db();

  console.log('🧹 Limpiando registros previos de prueba en base de datos...');
  await db.collection('companies').deleteMany({ name: 'Empresa Test Notificaciones' });
  await db.collection('users').deleteMany({ email: 'operador-test@empresa.com' });
  await db.collection('agents').deleteMany({ nombre: 'Agente Agendador Test' });

  console.log('🔍 Buscando o creando Empresa de Prueba activa...');
  let company = await db.collection('companies').findOne({ name: 'Empresa Test Notificaciones', status: 'active' });
  let companyId: ObjectId;

  if (!company) {
    const companyDoc = {
      name: 'Empresa Test Notificaciones',
      country: 'CO',
      category: 'technology',
      size: '1-5',
      phone: '+573001234567',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection('companies').insertOne(companyDoc as any);
    companyId = result.insertedId;
    console.log(`✅ Empresa de prueba creada con ID: ${companyId.toHexString()}`);
  } else {
    companyId = company._id;
    console.log(`✅ Empresa de prueba encontrada con ID: ${companyId.toHexString()}`);
  }

  console.log('🔍 Buscando o creando Operador de prueba...');
  let user = await db.collection('users').findOne({ companyId: companyId, role: 'operator' });
  let userId: ObjectId;

  if (!user) {
    const userDoc = {
      companyId: companyId,
      name: 'Operador Test',
      email: 'operador-test@empresa.com',
      passwordHash: '$2a$10$xyz', // Dummy hash
      role: 'operator',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection('users').insertOne(userDoc as any);
    userId = result.insertedId;
    console.log(`✅ Operador de prueba creado con ID: ${userId.toHexString()}`);
  } else {
    userId = user._id;
    console.log(`✅ Operador de prueba encontrado con ID: ${userId.toHexString()}`);
  }

  console.log('🔍 Buscando o creando Agente de agendamiento activo...');
  let agent = await db.collection('agents').findOne({ companyId: companyId, tipo: 'agendamiento', estado: 'activo' });
  let agentId: ObjectId;

  if (!agent) {
    const agentDoc = {
      companyId: companyId,
      nombre: 'Agente Agendador Test',
      tipo: 'agendamiento',
      estado: 'activo',
      personality: {
        name: 'Calendario',
        tone: 'profesional',
        restrictions: [],
        instructions: 'Gestiona reservas de citas.',
      },
      welcomeMessage: 'Hola, agendemos.',
      noInfoMessage: 'No sé.',
      errorMessage: 'Error.',
      relevanceThreshold: 0.5,
      topK: 3,
      memoryWindow: 5,
      maxResponseLength: 500,
      language: 'es',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await db.collection('agents').insertOne(agentDoc as any);
    agentId = result.insertedId;
    console.log(`✅ Agente de agendamiento creado con ID: ${agentId.toHexString()}`);
  } else {
    agentId = agent._id;
    console.log(`✅ Agente de agendamiento encontrado con ID: ${agentId.toHexString()}`);
  }

  console.log('🔑 Generando token JWT...');
  const token = jwt.sign(
    {
      userId: userId.toHexString(),
      companyId: companyId.toHexString(),
      email: 'operador-test@empresa.com',
      emailVerified: true,
    },
    secret,
    { algorithm: 'HS256', expiresIn: '30m' }
  );
  console.log(`✅ Token JWT generado: ${token.substring(0, 25)}...`);

  console.log('🔌 Conectando cliente WebSocket al Namespace /notifications...');
  const socket = io('http://localhost:3001/notifications', {
    transports: ['websocket'],
    query: { token },
  });

  socket.on('connect', () => {
    console.log('🟢 WebSocket conectado exitosamente!');
    console.log('📤 Suscribiéndose al canal de la empresa...');
    socket.emit('subscribe');
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Error de conexión WebSocket:', error.message);
    cleanupAndExit(client, socket, 1);
  });

  socket.on('error', (error) => {
    console.error('❌ Error recibido en WebSocket:', error);
    cleanupAndExit(client, socket, 1);
  });

  // Escuchar el evento de nueva notificación
  socket.on('notification.new', async (payload) => {
    console.log('\n📥 ¡NOTIFICACIÓN WebSocket RECIBIDA EN TIEMPO REAL!');
    console.log('----------------------------------------------------');
    console.log(JSON.stringify(payload, null, 2));
    console.log('----------------------------------------------------');

    console.log('\n🔍 Verificando encolado de correo en MongoDB (emailQueue)...');
    // Esperar un segundo para asegurar que la inserción se complete en la BD
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const queuedEmails = await db.collection('emailQueue')
      .find({ to: 'operador-test@empresa.com' })
      .sort({ createdAt: -1 })
      .toArray();

    if (queuedEmails.length > 0) {
      console.log(`✅ ¡Se encontró un email encolado para operador-test@empresa.com!`);
      console.log('Detalles del correo encolado:');
      console.log(JSON.stringify({
        to: queuedEmails[0].to,
        template: queuedEmails[0].template,
        payload: queuedEmails[0].payload,
        createdAt: queuedEmails[0].createdAt
      }, null, 2));
    } else {
      console.warn('⚠️ No se encontraron emails encolados en la base de datos para este operador.');
    }

    console.log('\n🎉 ¡Prueba de Notificaciones completada con éxito!');
    await cleanupAndExit(client, socket, 0);
  });

  // Esperar 2 segundos y hacer la petición HTTP para crear la reserva y disparar la notificación
  setTimeout(async () => {
    console.log('\n🚀 Disparando evento: Creando una reserva vía POST /bookings...');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const bookingPayload = {
        agentId: agentId.toHexString(),
        customerName: 'Cliente E2E Test',
        customerPhone: '+573000000000',
        customerEmail: 'cliente-e2e@correo.com',
        dateTime: tomorrow.toISOString(),
        durationMinutes: 30,
        notes: 'Cita de prueba para notificaciones en tiempo real.',
      };

      const response = await fetch('http://localhost:3001/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(bookingPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const createdBooking = await response.json();
      console.log(`✅ Reserva creada exitosamente. ID: ${createdBooking.id}`);
      console.log('⏳ Esperando evento de notificación por WebSocket...');
    } catch (error: any) {
      console.error('❌ Error al crear la reserva vía HTTP:', error.message);
      await cleanupAndExit(client, socket, 1);
    }
  }, 3000);
}

async function cleanupAndExit(client: MongoClient, socket: any, code: number) {
  console.log('🧹 Limpiando conexiones...');
  if (socket) socket.close();
  if (client) await client.close();
  process.exit(code);
}

run().catch(async (err) => {
  console.error('❌ Error inesperado ejecutando la prueba:', err);
  process.exit(1);
});
