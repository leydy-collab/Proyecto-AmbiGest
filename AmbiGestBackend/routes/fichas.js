import { Router } from 'express';
import { db } from '../db.js';  // pool de conexiones a MySQL
import { ruta, fechaLarga, NIVEL_A_DB, NIVEL_A_UI } from '../helpers.js';

const router = Router();

const mensajes = { duplicado: () => 'Ya existe una ficha con ese número.' };

// El programa (nombre, nivel, fin lectiva) vive en su propia tabla: se crea si no existe
// Busca el programa de formación por nombre: si existe lo actualiza y si no, lo crea. Devuelve su id
async function asegurarPrograma(conn, nombre, nivelUI, finLectiva) {
  const nivel = NIVEL_A_DB[nivelUI] || 'Tecnologo';
  // SELECT: ¿ya existe un programa con ese nombre?
  const [r] = await conn.query('SELECT id_programa FROM programas_formacion WHERE nombre_programa = ?', [nombre]);
  if (r.length) {
    // UPDATE: actualiza nivel y fin de etapa lectiva del programa existente
    await conn.query('UPDATE programas_formacion SET nivel = ?, fin_lectiva = ? WHERE id_programa = ?',
      [nivel, finLectiva, r[0].id_programa]);
    return r[0].id_programa;
  }
  // INSERT: crea el programa nuevo; ins.insertId = id que le asignó MySQL
  const [ins] = await conn.query(
    'INSERT INTO programas_formacion (nombre_programa, nivel, fin_lectiva) VALUES (?, ?, ?)',
    [nombre, nivel, finLectiva]);
  return ins.insertId;
}

// GET /api/fichas
router.get('/', ruta(async (req, res) => {
  // CONSULTA: fichas + su programa + el instructor líder (LEFT JOIN: la ficha aparece aunque no tenga líder)
  const [filas] = await db.query(`
    SELECT f.numero_ficha, f.coordinacion, f.cnt_aprendices, f.instructor_lider_id,
           p.nombre_programa, p.nivel, p.fin_lectiva,
           CONCAT(u.nombre, ' ', u.apellido) AS lider
    FROM fichas f
    LEFT JOIN programas_formacion p ON p.id_programa = f.programa_id
    LEFT JOIN usuarios u ON u.id_usuario = f.instructor_lider_id
    ORDER BY f.numero_ficha`);

  res.json(filas.map((f) => ({
    id: String(f.numero_ficha),
    numero: String(f.numero_ficha),
    nivel: NIVEL_A_UI[f.nivel] || '',
    programa: f.nombre_programa || '',
    instructor_lider: f.lider || 'Sin asignar',
    instructor_lider_id: f.instructor_lider_id ? String(f.instructor_lider_id) : '',
    fin_lectiva: fechaLarga(f.fin_lectiva),
    fin_lectiva_iso: f.fin_lectiva || '',
    coordinacion: f.coordinacion || '',
    aprendices: String(f.cnt_aprendices),
  })));
}));

// POST /api/fichas
router.post('/', ruta(async (req, res) => {
  const { numero, nivel, programa, instructor_lider, fin_lectiva, coordinacion, aprendices } = req.body;
  // Toma una conexión del pool para usar una transacción
  const conn = await db.getConnection();
  try {
    // Inicia la transacción: o se guarda todo (programa + ficha) o nada
    await conn.beginTransaction();
    const progId = await asegurarPrograma(conn, programa, nivel, fin_lectiva);
    // "modalidad" es obligatoria en la BD y la pantalla aún no la pide: Presencial por defecto
    // INSERT: guarda la ficha (la coordinación es un campo de la ficha)
    await conn.query(
      `INSERT INTO fichas (numero_ficha, programa_id, coordinacion, modalidad, cnt_aprendices, instructor_lider_id)
       VALUES (?, ?, ?, 'Presencial', ?, ?)`,
      [numero, progId, coordinacion, aprendices, instructor_lider || null]
    );
    // Confirma los cambios en la base de datos
    await conn.commit();
    res.status(201).json({ id: numero });
  } catch (e) {
    // Si algo falló, deshace todo lo hecho en la transacción
    await conn.rollback();
    throw e;
  } finally {
    conn.release();  // devuelve la conexión al pool
  }
}, mensajes));

// PUT /api/fichas/:numero
router.put('/:numero', ruta(async (req, res) => {
  const { numero, nivel, programa, instructor_lider, fin_lectiva, coordinacion, aprendices } = req.body;
  if (!(Number(aprendices) > 0)) {
    return res.status(400).json({ error: 'La cantidad de aprendices debe ser mayor a 0.' });
  }
  // Toma una conexión del pool para usar una transacción
  const conn = await db.getConnection();
  try {
    // Inicia la transacción: o se guarda todo (programa + ficha) o nada
    await conn.beginTransaction();
    const progId = await asegurarPrograma(conn, programa, nivel, fin_lectiva);
    // UPDATE: edita la ficha. Si otro registro depende de ella (agendas) MySQL puede rechazar el cambio de número
    await conn.query(
      `UPDATE fichas SET numero_ficha = ?, programa_id = ?, coordinacion = ?, cnt_aprendices = ?,
              instructor_lider_id = ? WHERE numero_ficha = ?`,
      [numero, progId, coordinacion, aprendices, instructor_lider || null, req.params.numero]
    );
    // Confirma los cambios en la base de datos
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    // Si algo falló, deshace todo lo hecho en la transacción
    await conn.rollback();
    throw e;
  } finally {
    conn.release();  // devuelve la conexión al pool
  }
}, { ...mensajes, referenciado: 'No se puede cambiar el número: la ficha tiene agendas asociadas.' }));

// DELETE /api/fichas/:numero
router.delete('/:numero', ruta(async (req, res) => {
  // DELETE: borra la ficha (las agendas que la usaban quedan con ficha vacía por el ON DELETE SET NULL)
  await db.query('DELETE FROM fichas WHERE numero_ficha = ?', [req.params.numero]);
  res.json({ ok: true });
}));

export default router;
