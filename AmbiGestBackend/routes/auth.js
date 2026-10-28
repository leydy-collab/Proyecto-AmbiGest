import { Router } from 'express';
import { db, AES_KEY } from '../db.js';  // db = pool de conexiones a MySQL | AES_KEY = llave de cifrado
import { ruta } from '../helpers.js';

const router = Router();

// POST /api/auth/login   { rol, documento, correo, password }
router.post('/login', ruta(async (req, res) => {
  const { rol, documento, correo, password } = req.body;
  const nombreRol = rol === 'administrador' ? 'Administrador' : 'Instructor';

  // CONSULTA DE LOGIN: une la tabla usuarios con rol y busca un usuario con ese rol, documento y correo.
  // Solo cuenta si está activo (estado_usuario = 1). Los ? son PARÁMETROS: MySQL los reemplaza de forma segura
  // (así no se puede colar código SQL malicioso = evita la inyección SQL).
  let sql = `
    SELECT u.id_usuario AS id, u.nombre, u.apellido, u.correo, r.nombre_rol AS rol
    FROM usuarios u
    JOIN rol r ON r.id_rol = u.rol_id
    WHERE r.nombre_rol = ? AND u.numero_doc = ? AND LOWER(u.correo) = LOWER(?) AND u.estado_usuario = 1`;
  const params = [nombreRol, documento, correo];  // valores que reemplazan los ? de la consulta, en el mismo orden

  // El administrador además valida contraseña (la BD la guarda con AES_ENCRYPT)
  // Solo el administrador escribe contraseña. Se agrega una condición más a la consulta
  if (nombreRol === 'Administrador') {
    sql += ' AND u.contrasena_aes = AES_ENCRYPT(?, ?)';  // en la BD la contraseña está CIFRADA: se cifra lo que escribió el usuario con la misma llave y se comparan los dos cifrados
    params.push(password || '', AES_KEY);  // contraseña digitada y llave de cifrado (reemplazan los dos ? nuevos)
  }

  // Ejecuta la consulta en MySQL. "filas" trae los usuarios que coinciden (0 filas = credenciales incorrectas)
  const [filas] = await db.query(sql, params);
  if (filas.length === 0) {  // ningún usuario coincide -> error 401 (no autorizado)
    return res.status(401).json({ error: 'Credenciales incorrectas o usuario inactivo.' });
  }
  res.json(filas[0]);
}));

export default router;
