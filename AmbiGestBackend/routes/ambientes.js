import { Router } from 'express';
import { db } from '../db.js';                       // db = pool de conexiones a MySQL (ver db.js)
import { ruta, pad3, hora12 } from '../helpers.js';  // ruta() atrapa los errores de MySQL y responde con un mensaje

const router = Router();

// Mensaje que se muestra si MySQL rechaza un ambiente repetido (llave UNIQUE edificio + piso + nombre)
const mensajes = {
  duplicado: () => 'Ya existe un ambiente con ese nombre en ese edificio y piso.',
};

// Trae los ambientes de la BD y los devuelve con la forma que necesita el front.
// Si se pasa idAmbiente, trae solo ese (se usa para devolver el ambiente recién guardado).
async function listar(idAmbiente = null) {
  // CONSULTA 1: ambientes + su categoría y su edificio (LEFT JOIN: si falta alguno, el ambiente igual aparece).
  // Los ambientes 'Inactivo' están en la "papelera" y no se listan. El ? es un parámetro (evita inyección SQL).
  const [ambs] = await db.query(
    `SELECT a.id_ambiente, a.nombre_ambiente, a.edificio_id, e.nombre_edificio, a.piso,
            a.capacidad_max, a.estado_ambiente, a.categoria_id, c.nombre_categoria
       FROM ambientes a
       LEFT JOIN categoria_ambiente c ON c.id_categoria = a.categoria_id
       LEFT JOIN edificios e ON e.id_edificio = a.edificio_id
      WHERE a.estado_ambiente <> 'Inactivo' ${idAmbiente ? 'AND a.id_ambiente = ?' : ''}
      ORDER BY a.id_ambiente`,
    idAmbiente ? [idAmbiente] : []
  );

  // CONSULTA 2: jornadas habilitadas de cada ambiente (tabla jornada_ambiente) con su horario.
  // EXISTS(...) devuelve 1 si HOY hay una agenda de ese ambiente en esa jornada -> la jornada está "Ocupado".
  const [jorns] = await db.query(
    `SELECT ja.ambiente_id, j.id_jornada, j.nombre_jornada, j.hora_inicio, j.hora_fin,
            EXISTS (SELECT 1 FROM agendas ag
                     WHERE ag.ambiente_id = ja.ambiente_id
                       AND ag.jornada_id = j.id_jornada
                       AND CURDATE() BETWEEN ag.fecha_inicio AND ag.fecha_fin) AS ocupado
       FROM jornada_ambiente ja
       JOIN jornadas j ON j.id_jornada = ja.jornada_id
      ORDER BY j.id_jornada`
  );

  // Une los resultados de las dos consultas (cada ambiente con sus jornadas)
  return ambs.map((a) => {
    const propias = jorns.filter((j) => j.ambiente_id === a.id_ambiente);
    const enMantenimiento = a.estado_ambiente === 'Mantenimiento';
    return {
      id: pad3(a.id_ambiente),
      codigo: pad3(a.id_ambiente),
      nombre: a.nombre_ambiente,
      edificioId: a.edificio_id,
      edificio: a.nombre_edificio || '',
      piso: a.piso,
      categoriaId: a.categoria_id,
      categoria: a.nombre_categoria || '',
      capacidad: String(a.capacidad_max),
      estado: a.estado_ambiente, // 'Activo' o 'Mantenimiento'
      jornadaIds: propias.map((j) => j.id_jornada),
      programacion: propias.map((j) => ({
        jornada: j.nombre_jornada,
        horario: j.nombre_jornada === 'FDS' ? 'SAB-DOM' : `${hora12(j.hora_inicio)} a ${hora12(j.hora_fin)}`,
        horaInicio: j.hora_inicio ? j.hora_inicio.slice(0, 5) : null, // 'HH:MM' (la jornada FDS no tiene horas fijas)
        horaFin: j.hora_fin ? j.hora_fin.slice(0, 5) : null,
        // Mantenimiento manda sobre todo; si no, depende de si hay una ficha usándolo hoy
        estado: enMantenimiento ? 'Mantenimiento' : j.ocupado ? 'Ocupado' : 'Disponible',
      })),
    };
  });
}

// Validaciones antes de tocar la base de datos
function validar(b) {
  const cap = Number(b.capacidad);
  if (String(b.nombre ?? '').trim().length < 3) return 'El nombre debe tener al menos 3 caracteres.';
  if (!b.categoriaId) return 'La categoría es requerida.';
  if (!b.edificioId) return 'El edificio es requerido.';
  if (!Number.isInteger(cap) || cap <= 0 || cap > 200) return 'La capacidad debe ser un entero entre 1 y 200.';
  if (b.estado && !['Activo', 'Mantenimiento'].includes(b.estado)) return 'El estado no es válido.';
  return null;
}

// Reemplaza las jornadas de un ambiente: borra las que tenía y guarda las nuevas.
// "conn" es la conexión de la transacción en curso.
async function guardarJornadas(conn, idAmbiente, jornadaIds = []) {
  // Borra las jornadas actuales del ambiente (por eso el usuario de MySQL necesita permiso DELETE en esta tabla)
  await conn.query('DELETE FROM jornada_ambiente WHERE ambiente_id = ?', [idAmbiente]);
  if (jornadaIds.length > 0) {
    // INSERT de varias filas a la vez: el "VALUES ?" recibe una lista de pares [ambiente, jornada]
    await conn.query('INSERT INTO jornada_ambiente (ambiente_id, jornada_id) VALUES ?', [
      jornadaIds.map((j) => [idAmbiente, Number(j)]),
    ]);
  }
}

// Valores del ambiente en el mismo orden de los ? de las consultas INSERT / UPDATE
// Orden: categoria, nombre, edificio, piso, capacidad, estado
const datosDe = (b) => [
  Number(b.categoriaId),
  b.nombre.trim(),
  Number(b.edificioId),
  String(b.piso ?? '').trim() || 'Piso 1',
  Number(b.capacidad),
  b.estado || 'Activo',
];

// GET /api/ambientes -> lista de ambientes
router.get('/', ruta(async (req, res) => {
  res.json(await listar());
}));

// POST /api/ambientes -> crear un ambiente
router.post('/', ruta(async (req, res) => {
  const error = validar(req.body);
  if (error) return res.status(400).json({ error });

  // Toma UNA conexión del pool para poder usar una transacción
  const conn = await db.getConnection();
  try {
    // Transacción: o se guarda todo (ambiente + jornadas) o no se guarda nada
    await conn.beginTransaction();
    // INSERT del ambiente. Si la capacidad es <= 0, el trigger trg_antes_insertar_ambientes lo rechaza
    const [r] = await conn.query(
      `INSERT INTO ambientes (categoria_id, nombre_ambiente, edificio_id, piso, capacidad_max, estado_ambiente)
       VALUES (?, ?, ?, ?, ?, ?)`,
      datosDe(req.body)
    );
    // r.insertId = id que MySQL le asignó al ambiente nuevo (AUTO_INCREMENT)
    await guardarJornadas(conn, r.insertId, req.body.jornadaIds);
    await conn.commit();   // confirma los cambios
    res.status(201).json((await listar(r.insertId))[0]);
  } catch (e) {
    await conn.rollback(); // si algo falló, deshace todo lo hecho en la transacción
    throw e;
  } finally {
    conn.release();        // devuelve la conexión al pool (siempre, haya o no error)
  }
}, mensajes));

// PUT /api/ambientes/:id -> editar (el id puede venir como "001")
router.put('/:id', ruta(async (req, res) => {
  const error = validar(req.body);
  if (error) return res.status(400).json({ error });

  const id = parseInt(req.params.id, 10);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // UPDATE del ambiente. affectedRows = cuántas filas encontró (0 = el id no existe)
    const [r] = await conn.query(
      `UPDATE ambientes
          SET categoria_id = ?, nombre_ambiente = ?, edificio_id = ?, piso = ?,
              capacidad_max = ?, estado_ambiente = ?
        WHERE id_ambiente = ?`,
      [...datosDe(req.body), id]
    );
    if (r.affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Ambiente no encontrado.' });
    }
    await guardarJornadas(conn, id, req.body.jornadaIds);
    await conn.commit();
    res.json((await listar(id))[0]);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}, mensajes));

// DELETE /api/ambientes/:id -> "papelera": NO borra la fila, solo la marca 'Inactivo'
// (así no se pierden las agendas y novedades que apuntan a ese ambiente)
router.delete('/:id', ruta(async (req, res) => {
  const [r] = await db.query(
    "UPDATE ambientes SET estado_ambiente = 'Inactivo' WHERE id_ambiente = ?",
    [parseInt(req.params.id, 10)]
  );
  if (r.affectedRows === 0) return res.status(404).json({ error: 'Ambiente no encontrado.' });
  res.json({ ok: true });
}));

export default router;