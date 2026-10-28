# AmbiGest: proyecto completo (Pescadero)

## Carpetas
- **database/**  -> `ambigest3_script_completo.sql`: la base de datos COMPLETA desde cero (tablas, funciones, triggers, vistas, datos y usuarios de MySQL).
- **AmbiGestBackend/**  -> backend (Node + Express + MySQL). Los archivos tienen comentarios en las líneas de conexión y consultas.
- **AmbiGestFrontend/** -> pantallas de React. Solo cambiaron `services/api.js` y `pages/Ambientes.jsx` (y un nombre en `Fichas.jsx`).

## No viene en este paquete (ya lo tienes, no lo reemplaces)
`App.jsx`, `main.jsx`, `index.css`, `App.scss`, `assets/`, `public/` y los componentes
`Header`, `SideBar`, `TarjetaInfo`, `BloqueHorario`, `ModalAgendarAmbiente`.
Copia el contenido de este zip ENCIMA de tu proyecto (solo se sobrescriben los archivos del mismo nombre).

## Pasos
1. **Base de datos**: abre `database/ambigest3_script_completo.sql` en MySQL Workbench, con el usuario ROOT,
   y ejecútalo completo (el rayo). Al final debe mostrar 18 ambientes.
2. **Backend**: en `AmbiGestBackend` copia `.env.example` como `.env` (ya trae DB_NAME=ambigest3,
   DB_USER=admin y DB_PASSWORD=Senaadmins). Luego:
       npm install
       npm run dev
   Prueba: http://localhost:3000/api/tablas  (debe listar las tablas)
   IMPORTANTE: si cambias el .env, detén el backend (Ctrl+C) y vuelve a iniciarlo.
3. **Front**: en `AmbiGestFrontend` copia `.env.example` como `.env`; luego `npm install` y `npm run dev`.
4. Ingreso de prueba: Administrador, documento 1092172163, correo dmariana.admin@sena.edu.co, contraseña admin2026.
   Instructor: documento 1092322121, correo lgarcia@sena.edu.co (sin contraseña).
