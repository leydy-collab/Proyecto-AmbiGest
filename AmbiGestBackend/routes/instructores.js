import { Router } from 'express';
import { db, AES_KEY } from '../db.js';  // db = pool de conexiones a MySQL | AES_KEY = llave de cifrado
import { ruta } from '../helpers.js';

const router = Router();

// Consulta base: un instructor son DOS tablas unidas, usuarios (datos personales) e instructores (área y red)
const SELECT_INSTRUCTORES = `
  SELECT u.id_usuario AS id, u.tipo_doc AS tipoDoc, u.numero_doc AS numeroDoc,
         u.nombre, u.apellido, i.area, i.red_conocimiento AS red, u.correo,
         IF(u.estado_usuario = 1, 'Activo', 'Inactivo') AS estado
  FROM usuarios u
  JOIN instructores i ON i.usuario_id = u.id_usuario`;

const mensajesDup = {
  duplicado: (e) => (e.sqlMessage || '').toLowerCase().includes('correo')
    ? 'Ya existe un instructor con ese correo.'
    : 'Ya existe un instructor con ese documento.',
};

// GET /api/instructores
router.get('/', ruta(async (req, res) => {
  // Ejecuta la consulta base ordenada por id
  const [filas] = await db.query(`${SELECT_INSTRUCTORES} ORDER BY u.id_usuario`);
  res.json(filas);
}));

// POST /api/instructores
router.post('/', ruta(async (req, res) => {
  const { tipoDoc = 'CC', numeroDoc, nombre, apellido, correo, area, red, estado,
          contrato = 'Contratista', fechaInicioContrato, fechaFinContrato } = req.body;

  // Toma una conexión del pool para usar una transacción
  const conn = await db.getConnection();
  try {
    // Inicia la transacción: crear un instructor implica 2 INSERT y deben guardarse juntos
    await conn.beginTransaction();
    // Contraseña inicial = número de documento (cifrada con AES como en tu BD)
    // INSERT 1: crea el usuario con rol Instructor. La contraseña inicial es el documento, cifrada con AES_ENCRYPT
    const [u] = await conn.query(
      `INSERT INTO usuarios (rol_id, tipo_doc, numero_doc, nombre, apellido, correo, contrasena_aes, estado_usuario)
       VALUES ((SELECT id_rol FROM rol WHERE nombre_rol = 'Instructor'), ?, ?, ?, ?, ?, AES_ENCRYPT(?, ?), ?)`,
      [tipoDoc, numeroDoc, nombre, apellido, correo, numeroDoc, AES_KEY, estado === 'Inactivo' ? 0 : 1]
    );
    // El contrato es obligatorio en la BD y la pantalla aún no lo pide:
    // por defecto "Contratista", desde hoy hasta dentro de 1 año.
    // INSERT 2: crea el registro del instructor ligado al usuario recién creado (u.insertId). Un trigger valida rol y fechas
    await conn.query(
      `INSERT INTO instructores (usuario_id, red_conocimiento, area, contrato, fecha_inicio_contrato, fecha_fin_contrato)
       VALUES (?, ?, ?, ?, COALESCE(?, CURDATE()), COALESCE(?, DATE_ADD(CURDATE(), INTERVAL 1 YEAR)))`,
      [u.insertId, red, area, contrato, fechaInicioContrato || null, fechaFinContrato || null]
    );
    // Confirma los cambios
    await conn.commit();
    res.status(201).json({ id: u.insertId });
  } catch (e) {
    // Si algo falló, deshace todo
    await conn.rollback();
    throw e;
  } finally {
    conn.release();  // devuelve la conexión al pool
  }
}, mensajesDup));

// PUT /api/instructores/:id
router.put('/:id', ruta(async (req, res) => {
  const { numeroDoc, nombre, apellido, correo, area, red, estado } = req.body;
  // Toma una conexión del pool para usar una transacción
  const conn = await db.getConnection();
  try {
    // Inicia la transacción: crear un instructor implica 2 INSERT y deben guardarse juntos
    await conn.beginTransaction();
    // UPDATE 1: edita los datos personales en la tabla usuarios
    await conn.query(
      `UPDATE usuarios SET numero_doc = ?, nombre = ?, apellido = ?, correo = ?, estado_usuario = ?
       WHERE id_usuario = ?`,
      [numeroDoc, nombre, apellido, correo, estado === 'Inactivo' ? 0 : 1, req.params.id]
    );
    // UPDATE 2: edita área y red de conocimiento en la tabla instructores
    await conn.query(
      'UPDATE instructores SET area = ?, red_conocimiento = ? WHERE usuario_id = ?',
      [area, red, req.params.id]
    );
    // Confirma los cambios
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    // Si algo falló, deshace todo
    await conn.rollback();
    throw e;
  } finally {
    conn.release();  // devuelve la conexión al pool
  }
}, mensajesDup));

// DELETE /api/instructores/:id  (borra el usuario; instructores se borra en cascada)
router.delete('/:id', ruta(async (req, res) => {
  // DELETE: borra el usuario; la fila de instructores se borra sola por el ON DELETE CASCADE
  await db.query('DELETE FROM usuarios WHERE id_usuario = ?', [req.params.id]);
  res.json({ ok: true });
}));

export default router;
