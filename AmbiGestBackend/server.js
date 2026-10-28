import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { db } from './db.js';  // pool de conexiones a MySQL (definido en db.js)

import authRoutes from './routes/auth.js';
import agendaRoutes from './routes/agenda.js';
import ambientesRoutes from './routes/ambientes.js';
import catalogosRoutes from './routes/catalogos.js';
import fichasRoutes from './routes/fichas.js';
import instructoresRoutes from './routes/instructores.js';
import novedadesRoutes from './routes/novedades.js';





const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/ambientes', ambientesRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/fichas', fichasRoutes);
app.use('/api/instructores', instructoresRoutes);
app.use('/api/novedades', novedadesRoutes);

app.get('/', (req, res) => {
  res.send('¡Backend de Ambigest funcionando correctamente!');
});

// Prueba 1: ¿el servidor está vivo?
app.get('/api/test', (req, res) => {
  res.json({ mensaje: 'El backend funciona' });
});

// Prueba 2: ¿se conecta a MySQL? Lista tus tablas
// Ruta de PRUEBA DE CONEXIÓN: si responde con la lista de tablas, el backend sí está conectado a MySQL
app.get('/api/tablas', async (req, res) => {
  try {
    // SHOW TABLES = comando de MySQL que lista las tablas de la base de datos configurada en .env
    const [filas] = await db.query('SHOW TABLES');
    res.json(filas);
  } catch (error) {
    res.status(500).json({ error: error.message });  // si MySQL rechaza la conexión (usuario, contraseña o base incorrectos) el mensaje sale aquí
  }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});