import { Router } from 'express';
import { db } from '../db.js';        // pool de conexiones a MySQL
import { ruta } from '../helpers.js'; // manejo de errores de las rutas

const router = Router();

// Los catálogos son listas pequeñas que llenan los selectores (listas desplegables) de los formularios.
// "AS id" / "AS nombre" renombran las columnas para que el front siempre reciba { id, nombre }.

// GET /api/catalogos/tipos-novedad -> tabla tipos_novedad
router.get('/tipos-novedad', ruta(async (req, res) => {
  const [f] = await db.query('SELECT id_tipo AS id, nombre_tipo AS nombre FROM tipos_novedad ORDER BY id_tipo');
  res.json(f);
}));

// GET /api/catalogos/jornadas -> tabla jornadas (Mañana, Tarde, Noche, FDS)
router.get('/jornadas', ruta(async (req, res) => {
  const [f] = await db.query('SELECT id_jornada AS id, nombre_jornada AS nombre FROM jornadas ORDER BY id_jornada');
  res.json(f);
}));

// GET /api/catalogos/categorias -> tabla categoria_ambiente
router.get('/categorias', ruta(async (req, res) => {
  const [f] = await db.query(
    'SELECT id_categoria AS id, nombre_categoria AS nombre FROM categoria_ambiente ORDER BY nombre_categoria'
  );
  res.json(f);
}));

// GET /api/catalogos/edificios -> tabla edificios
router.get('/edificios', ruta(async (req, res) => {
  const [f] = await db.query('SELECT id_edificio AS id, nombre_edificio AS nombre FROM edificios ORDER BY id_edificio');
  res.json(f);
}));

export default router;
