import mysql from 'mysql2/promise';  // mysql2 = librería que conecta Node.js con MySQL (versión con promesas, para usar async/await)
import 'dotenv/config';  // lee el archivo .env y carga sus variables en process.env

// POOL DE CONEXIONES a MySQL. En vez de abrir una conexión nueva en cada petición,
// mantiene varias abiertas y las reutiliza (más rápido). Todas las rutas importan este objeto "db".
// Los datos salen del archivo .env para no escribir contraseñas en el código.
export const db = mysql.createPool({
  host: process.env.DB_HOST,  // servidor donde está MySQL (localhost = este mismo computador)
  port: process.env.DB_PORT,  // puerto de MySQL (por defecto 3306)
  user: process.env.DB_USER,  // usuario de MySQL con el que entra el backend (admin)
  password: process.env.DB_PASSWORD,  // contraseña de ese usuario de MySQL
  database: process.env.DB_NAME,  // base de datos que se va a usar: ambigest3
  dateStrings: true,  // las fechas llegan como texto 'AAAA-MM-DD' (evita errores de zona horaria)
  waitForConnections: true,  // si las 10 conexiones están ocupadas, la petición espera su turno
  connectionLimit: 10,  // máximo de conexiones abiertas al mismo tiempo
});

// Llave para cifrar y comparar contraseñas con AES_ENCRYPT de MySQL (se usa en el login)
export const AES_KEY = process.env.AES_KEY;