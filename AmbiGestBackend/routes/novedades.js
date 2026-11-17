import { Router } from 'express';
import { db } from '../db.js';  // pool de conexiones a MySQL
import { ruta, fechaCorta, hora12 } from '../helpers.js';

const router = Router();

// Estados válidos de una novedad (los mismos del ENUM de la tabla novedades)
const ESTADOS = ['Pendiente', 'En proceso', 'Resuelto'];

// GET /api/novedades            -> todas (administrador)
// GET /api/novedades?instructor=ID -> solo las de ese instructor
router.get('/', ruta(async (req, res) => {
  const params = [];
  let filtro = '';
  // Si llega ?instructor=ID, solo se traen las novedades de ese instructor
  if (req.query.instructor) {
    filtro = 'WHERE n.instructor_id = ?';
    params.push(req.query.instructor);
  }
  // CONSULTA: novedades con el nombre del instructor, el ambiente y el tipo (más recientes primero)
  const [filas] = await db.query(`
    SELECT n.id_novedad, n.fecha_reporte, n.hora_reporte, n.descripcion, n.estado_novedad,
           CONCAT(u.nombre, ' ', u.apellido) AS instructor,
           a.nombre_ambiente, t.nombre_tipo
    FROM novedades n
    LEFT JOIN usuarios u ON u.id_usuario = n.instructor_id
    JOIN ambientes a ON a.id_ambiente = n.ambiente_id
    LEFT JOIN tipos_novedad t ON t.id_tipo = n.tipo_id
    ${filtro}
    ORDER BY n.fecha_reporte DESC, n.hora_reporte DESC, n.id_novedad DESC`, params);

  res.json(filas.map((n) => ({
    id: n.id_novedad,
    instructor: n.instructor || 'Instructor eliminado',
    ambiente: n.nombre_ambiente,
    tipo: n.nombre_tipo || '',
    desc: n.descripcion,
    fecha: fechaCorta(n.fecha_reporte),
    hora: hora12(n.hora_reporte),
    estado: n.estado_novedad,
  })));
}));

// GET /api/novedades/resumen -> lo que necesita el administrador para enterarse de novedades nuevas:
//   pendientes = cuántas novedades siguen en estado 'Pendiente' (número de la campana)
//   ultimoId   = id de la novedad más reciente (si sube entre una consulta y otra, llegó una nueva)
//   ultima     = datos de esa novedad más reciente (para el aviso emergente)
router.get('/resumen', ruta(async (req, res) => {
  const [[r]] = await db.query(
    `SELECT COALESCE(SUM(estado_novedad = 'Pendiente'), 0) AS pendientes,
            COALESCE(MAX(id_novedad), 0) AS ultimoId
     FROM novedades`);

  let ultima = null;
  if (r.ultimoId > 0) {
    const [[u]] = await db.query(
      `SELECT n.id_novedad, a.nombre_ambiente, t.nombre_tipo,
              CONCAT(us.nombre, ' ', us.apellido) AS instructor
       FROM novedades n
       JOIN ambientes a ON a.id_ambiente = n.ambiente_id
       LEFT JOIN tipos_novedad t ON t.id_tipo = n.tipo_id
       LEFT JOIN usuarios us ON us.id_usuario = n.instructor_id
       WHERE n.id_novedad = ?`, [r.ultimoId]);
    ultima = {
      id: u.id_novedad,
      ambiente: u.nombre_ambiente,
      tipo: u.nombre_tipo || '',
      instructor: u.instructor || 'Instructor eliminado',
    };
  }
  res.json({ pendientes: Number(r.pendientes), ultimoId: r.ultimoId, ultima });
}));

// GET /api/novedades/mis-ambientes?instructor=ID
// Ambientes donde ese instructor tiene una agenda vigente HOY. Son los únicos donde el trigger
// le permite reportar, así el formulario no le ofrece opciones que luego serían rechazadas.
router.get('/mis-ambientes', ruta(async (req, res) => {
  const id = parseInt(req.query.instructor, 10);
  if (!id) return res.status(400).json({ error: 'Falta el instructor.' });

  const [filas] = await db.query(
    `SELECT DISTINCT am.id_ambiente AS id, am.nombre_ambiente AS nombre
     FROM agendas a
     JOIN ambientes am ON am.id_ambiente = a.ambiente_id
     WHERE a.instructor_id = ? AND CURDATE() BETWEEN a.fecha_inicio AND a.fecha_fin
     ORDER BY am.nombre_ambiente`, [id]);
  res.json(filas);
}));

// POST /api/novedades   { instructorId, ambienteId, tipoId, descripcion }
// Tu trigger valida que el instructor esté asignado a ese ambiente en esa fecha.
router.post('/', ruta(async (req, res) => {
  const { instructorId, ambienteId, tipoId, descripcion } = req.body;

  // Validación previa: sin instructor el trigger respondería un error confuso ("no estás asignado")
  if (!instructorId) {
    return res.status(400).json({ error: 'No se identificó al instructor. Inicia sesión de nuevo.' });
  }
  if (!ambienteId || !tipoId || !String(descripcion || '').trim()) {
    return res.status(400).json({ error: 'Completa el ambiente, el tipo y la descripción de la novedad.' });
  }

  // INSERT: guarda la novedad con la fecha y hora actuales de MySQL (CURDATE, CURTIME).
  // El trigger trg_antes_insertar_novedades la rechaza si el instructor no está asignado a ese ambiente en esa fecha
  const [r] = await db.query(
    `INSERT INTO novedades (tipo_id, instructor_id, ambiente_id, fecha_reporte, hora_reporte, descripcion)
     VALUES (?, ?, ?, CURDATE(), CURTIME(), ?)`,
    [tipoId, instructorId, parseInt(ambienteId, 10), String(descripcion).trim()]
  );
  res.status(201).json({ id: r.insertId });
}));

// PUT /api/novedades/:id/estado   { estado: 'Pendiente' | 'En proceso' | 'Resuelto' }
router.put('/:id/estado', ruta(async (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ error: 'Estado no válido.' });
  }
  // UPDATE: cambia el estado de la novedad (Pendiente, En proceso, Resuelto)
  const [r] = await db.query('UPDATE novedades SET estado_novedad = ? WHERE id_novedad = ?', [estado, req.params.id]);
  if (r.affectedRows === 0) return res.status(404).json({ error: 'La novedad no existe.' });
  res.json({ ok: true });
}));

export default router;
