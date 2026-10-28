import { Router } from 'express';
import { db } from '../db.js';  // pool de conexiones a MySQL
import { ruta, fechaLarga, hora12, NIVEL_TEXTO } from '../helpers.js';

const router = Router();

// GET /api/agenda            -> todas las agendas (administrador)
// GET /api/agenda?instructor=ID -> solo las de ese instructor
router.get('/', ruta(async (req, res) => {
  const params = [];
  let filtro = '';
  // Si llega ?instructor=ID, la consulta se filtra para traer solo las agendas de ese instructor
  if (req.query.instructor) {
    filtro = 'WHERE a.instructor_id = ?';
    params.push(req.query.instructor);
  }
  // CONSULTA: agendas con su ambiente, jornada, ficha, programa e instructores (JOIN = unir tablas;
  // LEFT JOIN = trae la agenda aunque falte el dato relacionado). Ordenadas por fecha y hora
  const [filas] = await db.query(`
    SELECT a.id_agenda, a.ambiente_id, a.instructor_id, a.fecha_inicio, a.fecha_fin, a.hora_inicio, a.hora_fin,
           am.nombre_ambiente, j.nombre_jornada,
           f.numero_ficha, f.coordinacion, f.cnt_aprendices,
           p.nombre_programa, p.nivel, p.fin_lectiva,
           CONCAT(ui.nombre, ' ', ui.apellido) AS instructor,
           CONCAT(ul.nombre, ' ', ul.apellido) AS lider
    FROM agendas a
    JOIN ambientes am ON am.id_ambiente = a.ambiente_id
    JOIN jornadas j ON j.id_jornada = a.jornada_id
    LEFT JOIN fichas f ON f.numero_ficha = a.ficha_numero
    LEFT JOIN programas_formacion p ON p.id_programa = f.programa_id
    LEFT JOIN usuarios ui ON ui.id_usuario = a.instructor_id
    LEFT JOIN usuarios ul ON ul.id_usuario = f.instructor_lider_id
    ${filtro}
    ORDER BY a.fecha_inicio, a.hora_inicio`, params);

  res.json(filas.map((a) => ({
    id: a.id_agenda,
    ambienteId: String(a.ambiente_id),
    ambiente: a.nombre_ambiente,
    ficha: a.numero_ficha ? String(a.numero_ficha) : '—',
    jornada: a.nombre_jornada,
    hora: `${hora12(a.hora_inicio)} - ${hora12(a.hora_fin)}`,
    horaInicio: a.hora_inicio, // 'HH:MM:SS' sin formato: sirve para ordenar las tarjetas del día
    horaFin: a.hora_fin,
    instructorId: a.instructor_id, // lo usa el formulario de edición
    instructor: a.instructor || 'Por asignar',
    nivel: NIVEL_TEXTO[a.nivel] || '',
    programa: a.nombre_programa || '',
    lider: a.lider || 'Sin asignar',
    finLectiva: fechaLarga(a.fin_lectiva),
    coordinacion: a.coordinacion || '',
    aprendices: a.cnt_aprendices != null ? String(a.cnt_aprendices) : '',
    fechaInicio: a.fecha_inicio,
    fechaFin: a.fecha_fin,
    // La BD no guarda días de la semana: la jornada FDS es sáb-dom, las demás lun-vie
    diasSemana: a.nombre_jornada === 'FDS' ? [6, 0] : [1, 2, 3, 4, 5],
  })));
}));

// ---------------------------------------------------------------------------
// Valida los datos y registra una agenda llamando al procedimiento sp_registrar_agenda.
// Lo usan POST (crear) y PUT (editar), para que las dos validen exactamente igual.
// "conn" es la conexión que se está usando (la variable @mensaje del procedimiento solo existe en esa sesión).
// Devuelve { estado, cuerpo }: el código HTTP y lo que hay que responder.
// ---------------------------------------------------------------------------
async function registrarAgenda(conn, datos) {
  const { ambienteId, instructorId, ficha, jornada, fechaInicio, fechaFin, horaInicio, horaFin } = datos;

  if (!instructorId) return { estado: 400, cuerpo: { error: 'Selecciona el instructor.' } };
  if (!ficha) return { estado: 400, cuerpo: { error: 'Indica el número de ficha.' } };

  // Verifica que la ficha exista antes de agendar
  const [existe] = await conn.query('SELECT 1 FROM fichas WHERE numero_ficha = ?', [ficha]);
  if (!existe.length) {
    return { estado: 400, cuerpo: { error: `La ficha ${ficha} no existe. Regístrala primero en Fichas.` } };
  }

  // Busca el id de la jornada a partir de su nombre ('Sabatina' equivale a la jornada FDS)
  const nombreJornada = jornada === 'Sabatina' ? 'FDS' : jornada;
  const [j] = await conn.query('SELECT id_jornada FROM jornadas WHERE nombre_jornada = ?', [nombreJornada]);
  if (!j.length) return { estado: 400, cuerpo: { error: 'La jornada seleccionada no existe.' } };

  // Llama al PROCEDIMIENTO ALMACENADO sp_registrar_agenda: la propia base de datos valida cruces de horario,
  // capacidad, jornada, etapa lectiva y estado del ambiente, y guarda la agenda si todo está bien
  await conn.query('CALL sp_registrar_agenda(?, ?, ?, ?, ?, ?, ?, ?, @mensaje)', [
    instructorId, ficha, parseInt(ambienteId, 10), j[0].id_jornada,
    fechaInicio, fechaFin, horaInicio, horaFin,
  ]);
  // Lee el mensaje de resultado que dejó el procedimiento (éxito o error)
  const [[r]] = await conn.query('SELECT @mensaje AS mensaje');

  // Todos los mensajes de error de sp_registrar_agenda empiezan con "Error:"
  const mensaje = r.mensaje || '';
  if (mensaje && !/^error/i.test(mensaje)) return { estado: 201, cuerpo: { ok: true, mensaje } };
  return {
    estado: 400,
    cuerpo: { error: (mensaje || 'No se pudo registrar la agenda.').replace(/^Error:\s*/i, '') },
  };
}

// POST /api/agenda -> crear una agenda
// { ambienteId, instructorId, ficha, jornada, fechaInicio, fechaFin, horaInicio, horaFin }
router.post('/', ruta(async (req, res) => {
  // Se usa UNA misma conexión porque @mensaje solo existe dentro de esa sesión de MySQL
  const conn = await db.getConnection();
  try {
    const r = await registrarAgenda(conn, req.body);
    res.status(r.estado).json(r.cuerpo);
  } finally {
    conn.release(); // devuelve la conexión al pool
  }
}));

// PUT /api/agenda/:id -> editar una agenda (recibe los mismos datos que POST)
// La agenda es un rango de fechas: al editarla cambia en TODOS los días de ese rango.
// Como el procedimiento valida cruces contra las demás agendas, se hace así, dentro de una transacción:
//   1) se borra la agenda vieja  2) se registra la nueva con todas las validaciones
// Si alguna validación falla, se hace ROLLBACK y la agenda vieja queda intacta.
router.put('/:id', ruta(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [existe] = await conn.query('SELECT 1 FROM agendas WHERE id_agenda = ?', [id]);
    if (!existe.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Agenda no encontrada.' });
    }

    // DELETE de la agenda vieja (el usuario de MySQL necesita permiso DELETE sobre la tabla agendas)
    await conn.query('DELETE FROM agendas WHERE id_agenda = ?', [id]);

    const r = await registrarAgenda(conn, req.body);
    if (r.estado !== 201) {
      await conn.rollback(); // la validación falló: se deshace el borrado
      return res.status(r.estado).json(r.cuerpo);
    }

    await conn.commit(); // confirma el cambio
    res.json({ ok: true, mensaje: 'Agenda actualizada correctamente.' });
  } catch (e) {
    await conn.rollback(); // si algo falló, deshace todo
    throw e;
  } finally {
    conn.release();
  }
}));

// DELETE /api/agenda/:id -> eliminar una agenda (todo su rango de fechas)
router.delete('/:id', ruta(async (req, res) => {
  // DELETE: borra la fila. Ninguna otra tabla depende de agendas, así que se puede borrar sin problema
  const [r] = await db.query('DELETE FROM agendas WHERE id_agenda = ?', [parseInt(req.params.id, 10)]);
  if (r.affectedRows === 0) return res.status(404).json({ error: 'Agenda no encontrada.' });
  res.json({ ok: true });
}));

export default router;