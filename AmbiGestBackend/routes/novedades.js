import { Router } from 'express';
import { db } from '../db.js';  // pool de conexiones a MySQL
import { ruta, fechaCorta } from '../helpers.js';

const router = Router();

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
    SELECT n.id_novedad, n.fecha_reporte, n.descripcion, n.estado_novedad,
           CONCAT(u.nombre, ' ', u.apellido) AS instructor,
           a.nombre_ambiente, t.nombre_tipo
    FROM novedades n
    LEFT JOIN usuarios u ON u.id_usuario = n.instructor_id
    JOIN ambientes a ON a.id_ambiente = n.ambiente_id
    LEFT JOIN tipos_novedad t ON t.id_tipo = n.tipo_id
    ${filtro}
    ORDER BY n.fecha_reporte DESC, n.hora_reporte DESC`, params);

  res.json(filas.map((n) => ({
    id: n.id_novedad,
    instructor: n.instructor || 'Instructor eliminado',
    ambiente: n.nombre_ambiente,
    tipo: n.nombre_tipo || '',
    desc: n.descripcion,
    fecha: fechaCorta(n.fecha_reporte),
    estado: n.estado_novedad,
  })));
}));

// POST /api/novedades   { instructorId, ambienteId, tipoId, descripcion }
// Tu trigger valida que el instructor esté asignado a ese ambiente en esa fecha.
router.post('/', ruta(async (req, res) => {
  const { instructorId, ambienteId, tipoId, descripcion } = req.body;
  // INSERT: guarda la novedad con la fecha y hora actuales de MySQL (CURDATE, CURTIME).
  // El trigger trg_antes_insertar_novedades la rechaza si el instructor no está asignado a ese ambiente en esa fecha
  const [r] = await db.query(
    `INSERT INTO novedades (tipo_id, instructor_id, ambiente_id, fecha_reporte, hora_reporte, descripcion)
     VALUES (?, ?, ?, CURDATE(), CURTIME(), ?)`,
    [tipoId, instructorId, parseInt(ambienteId, 10), descripcion]
  );
  res.status(201).json({ id: r.insertId });
}));

// PUT /api/novedades/:id/estado   { estado: 'Pendiente' | 'En proceso' | 'Resuelto' }
router.put('/:id/estado', ruta(async (req, res) => {
  // UPDATE: cambia el estado de la novedad (Pendiente, En proceso, Resuelto)
  await db.query('UPDATE novedades SET estado_novedad = ? WHERE id_novedad = ?', [req.body.estado, req.params.id]);
  res.json({ ok: true });
}));

export default router;
