import { Router } from 'express';
import { db } from '../db.js';
import { ruta } from '../helpers.js';

const router = Router();

// Condición SQL reutilizable: "esta agenda aplica HOY".
// DAYOFWEEK() en MySQL: 1 = domingo, 2 = lunes ... 7 = sábado
const APLICA_HOY = `
  a.fecha_inicio <= CURDATE() AND CURDATE() <= a.fecha_fin
  AND (
    (j.nombre_jornada = 'FDS' AND DAYOFWEEK(CURDATE()) IN (1, 7))
    OR (j.nombre_jornada <> 'FDS' AND DAYOFWEEK(CURDATE()) BETWEEN 2 AND 6)
  )`;

// Igual que APLICA_HOY, pero además la hora actual debe estar dentro del horario de la agenda
const APLICA_AHORA = `
  ${APLICA_HOY}
  AND CURTIME() >= a.hora_inicio AND CURTIME() < a.hora_fin`;

// GET /api/inicio              -> resumen del administrador
// GET /api/inicio?instructor=ID -> resumen de ese instructor
router.get('/', ruta(async (req, res) => {
  // ----- INSTRUCTOR -----
  if (req.query.instructor) {
    const id = parseInt(req.query.instructor, 10);

    // Cuántas agendas tiene hoy
    const [[n]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM agendas a JOIN jornadas j ON j.id_jornada = a.jornada_id
       WHERE a.instructor_id = ? AND ${APLICA_HOY}`, [id]);

    // La agenda de hoy que está en curso o la siguiente (la que aún no termina)
    const [actual] = await db.query(
      `SELECT a.ficha_numero, am.nombre_ambiente
       FROM agendas a
       JOIN jornadas j ON j.id_jornada = a.jornada_id
       JOIN ambientes am ON am.id_ambiente = a.ambiente_id
       WHERE a.instructor_id = ? AND ${APLICA_HOY} AND a.hora_fin >= CURTIME()
       ORDER BY a.hora_inicio LIMIT 1`, [id]);

    return res.json({
      agendasHoy: n.total,
      ficha: actual[0] ? String(actual[0].ficha_numero) : '—',
      ambiente: actual[0] ? actual[0].nombre_ambiente : '—',
    });
  }

  // ----- ADMINISTRADOR -----
  // Ocupados: ambientes con una agenda en curso AHORA, ignorando los Inactivos
  const [[r]] = await db.query(
    `SELECT COUNT(DISTINCT a.ficha_numero) AS formaciones,
            COUNT(DISTINCT a.ambiente_id)  AS ocupados
     FROM agendas a
     JOIN jornadas j  ON j.id_jornada  = a.jornada_id
     JOIN ambientes am ON am.id_ambiente = a.ambiente_id
     WHERE ${APLICA_AHORA} AND am.estado_ambiente <> 'Inactivo'`);

  // Disponibles: ni en Mantenimiento ni Inactivo, y sin agenda en curso AHORA
  const [[d]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM ambientes am
     LEFT JOIN (
       SELECT DISTINCT a.ambiente_id
       FROM agendas a JOIN jornadas j ON j.id_jornada = a.jornada_id
       WHERE ${APLICA_AHORA}
     ) oc ON oc.ambiente_id = am.id_ambiente
     WHERE am.estado_ambiente NOT IN ('Mantenimiento', 'Inactivo')
       AND oc.ambiente_id IS NULL`);

  res.json({ formaciones: r.formaciones, ocupados: r.ocupados, disponibles: d.total });
}));

export default router;