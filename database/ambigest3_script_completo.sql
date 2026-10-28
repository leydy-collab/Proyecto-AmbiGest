-- =====================================================================
--  AMBIGEST  -  SCRIPT COMPLETO DE LA BASE DE DATOS  (versión: ambigest3)
--  Se ejecuta de principio a fin en MySQL Workbench con el usuario ROOT.
--  Funciona en MySQL 8 y en MariaDB.
--
--  Contenido:
--    1. Creación de la base de datos
--    2. Tablas
--    3. Funciones y procedimiento almacenado (validaciones de la agenda)
--    4. Disparadores (triggers)
--    5. Vistas
--    6. Datos iniciales (catálogos, 18 ambientes de Pescadero, usuarios de prueba)
--    7. Usuarios de MySQL y permisos (el backend entra con el usuario 'admin')
--
--  Nota de diseño: la COORDINACIÓN es un campo de la tabla fichas, no de ambientes.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BASE DE DATOS
-- ---------------------------------------------------------------------
drop database if exists ambigest3;
create database ambigest3 character set utf8mb4 collate utf8mb4_unicode_ci;
use ambigest3;

-- ---------------------------------------------------------------------
-- 2. TABLAS
-- ---------------------------------------------------------------------

-- Roles de la aplicación (Administrador / Instructor)
create table rol(
  id_rol int auto_increment primary key,
  nombre_rol varchar(30) not null unique                 -- para que no se repitan roles
);

create table categoria_ambiente(
  id_categoria int auto_increment primary key,
  nombre_categoria varchar(100) not null unique          -- para que no se repitan categorías
);

-- Edificios de la sede (EF, EI, CIES, Tecnoparque...). Alimenta el selector del formulario de ambientes.
create table edificios(
  id_edificio int auto_increment primary key,
  nombre_edificio varchar(100) not null unique
);

create table programas_formacion(
  id_programa int auto_increment primary key,
  nombre_programa varchar(255) not null unique,
  nivel enum('Operario','Auxiliar','Tecnico','Tecnologo') not null,
  fin_lectiva date not null
);

create table tipos_novedad(
  id_tipo int auto_increment primary key,
  nombre_tipo varchar(50) not null unique
);

create table usuarios(
  id_usuario int auto_increment primary key,
  rol_id int,
  tipo_doc enum('CC','CE','PPT') not null,
  numero_doc varchar(20) not null,
  nombre varchar(255) not null,
  apellido varchar(255) not null,
  correo varchar(255) not null unique,
  contrasena_aes varbinary(255) not null,                -- contraseña cifrada con AES_ENCRYPT
  estado_usuario tinyint(1) default 1,                   -- 1 = Activo, 0 = Inactivo
  constraint uq_tipo_num_doc unique (tipo_doc, numero_doc),
  foreign key(rol_id) references rol(id_rol) on delete set null
);

create table administradores(
  usuario_id int primary key,
  dependencia varchar(255) not null,
  foreign key(usuario_id) references usuarios(id_usuario) on delete cascade
);

create table instructores(
  usuario_id int primary key,
  red_conocimiento varchar(255) not null,
  area varchar(255) not null,
  contrato enum('Planta','Contratista','Provisional') not null default 'Contratista',
  fecha_inicio_contrato date not null,
  fecha_fin_contrato date not null,
  foreign key(usuario_id) references usuarios(id_usuario) on delete cascade
);

-- Horarios de las jornadas (FDS = sábado y domingo, sin horas fijas)
create table jornadas(
  id_jornada int auto_increment primary key,
  nombre_jornada varchar(100) not null unique,
  hora_inicio time null,
  hora_fin time null
);

create table ambientes(
  id_ambiente int auto_increment primary key,
  categoria_id int,
  edificio_id int,
  nombre_ambiente varchar(50) not null,
  piso varchar(50) not null default 'Piso 1',
  capacidad_max int not null,
  -- Activo = buenas condiciones (se puede agendar) | Mantenimiento = no se puede agendar | Inactivo = en la "papelera"
  -- "Ocupado / Disponible" NO se guarda aquí: se calcula con las agendas de cada jornada.
  estado_ambiente enum('Activo','Mantenimiento','Inactivo') not null default 'Activo',
  constraint uq_edificio_piso_nombre unique (edificio_id, piso, nombre_ambiente),
  foreign key(categoria_id) references categoria_ambiente(id_categoria) on delete set null,
  foreign key(edificio_id) references edificios(id_edificio) on delete restrict
);

-- Jornadas en las que cada ambiente está habilitado
create table jornada_ambiente(
  ambiente_id int,
  jornada_id int,
  primary key(jornada_id, ambiente_id),
  foreign key(ambiente_id) references ambientes(id_ambiente) on delete cascade,
  foreign key(jornada_id) references jornadas(id_jornada) on delete cascade
);

create table fichas(
  numero_ficha int primary key,
  programa_id int,
  coordinacion varchar(255) not null,                    -- la coordinación pertenece a la ficha
  modalidad enum('Presencial','Distancia') not null default 'Presencial',
  cnt_aprendices int not null,
  instructor_lider_id int null,
  foreign key(programa_id) references programas_formacion(id_programa) on delete no action,
  foreign key(instructor_lider_id) references instructores(usuario_id) on delete set null
);

create table agendas(
  id_agenda int auto_increment primary key,
  instructor_id int,
  ficha_numero int,
  ambiente_id int,
  jornada_id int,
  fecha_inicio date,
  fecha_fin date,
  hora_inicio time,
  hora_fin time,
  foreign key(instructor_id) references instructores(usuario_id) on delete set null,
  foreign key(ficha_numero) references fichas(numero_ficha) on delete set null,
  foreign key(ambiente_id) references ambientes(id_ambiente) on delete restrict,
  foreign key(jornada_id) references jornadas(id_jornada) on delete restrict
);

create table novedades(
  id_novedad int auto_increment primary key,
  tipo_id int,                                           -- tipo de novedad
  instructor_id int,                                     -- quien la reporta
  ambiente_id int,                                       -- dónde ocurre
  fecha_reporte date not null,
  hora_reporte time not null,
  descripcion text not null,
  estado_novedad enum('Pendiente','En proceso','Resuelto') default 'Pendiente',
  foreign key(tipo_id) references tipos_novedad(id_tipo),
  foreign key(instructor_id) references instructores(usuario_id) on delete set null,
  foreign key(ambiente_id) references ambientes(id_ambiente) on delete restrict
);

-- ---------------------------------------------------------------------
-- 3. FUNCIONES Y PROCEDIMIENTO ALMACENADO
-- ---------------------------------------------------------------------
delimiter //

-- Devuelve 1 si el ambiente está libre en ese rango de fechas y horas (0 = ocupado)
create function fn_ambiente_disponible(p_id_amb int, p_fi date, p_ff date, p_hi time, p_hf time)
returns tinyint
reads sql data
begin
  declare conflictos int;
  select count(*) into conflictos from agendas where ambiente_id = p_id_amb
    and (p_fi <= fecha_fin and p_ff >= fecha_inicio)
    and (p_hi < hora_fin and p_hf > hora_inicio);
  return if(conflictos = 0, 1, 0);
end //

-- Devuelve 1 si el instructor no tiene otra agenda cruzada en ese rango
create function fn_instructor_disponible(p_id_instr int, p_fi date, p_ff date, p_hi time, p_hf time)
returns tinyint
reads sql data
begin
  declare conflictos int;
  select count(*) into conflictos from agendas where instructor_id = p_id_instr
    and (p_fi <= fecha_fin and p_ff >= fecha_inicio)
    and (p_hi < hora_fin and p_hf > hora_inicio);
  return if(conflictos = 0, 1, 0);
end //

-- Devuelve 1 si la capacidad del ambiente alcanza para los aprendices de la ficha
create function fn_capacidad_adecuada(p_id_amb int, p_num_ficha int)
returns tinyint
reads sql data
begin
  declare capacidad int;
  declare aprendices int;
  select capacidad_max into capacidad from ambientes where id_ambiente = p_id_amb;
  select cnt_aprendices into aprendices from fichas where numero_ficha = p_num_ficha;
  return if(capacidad >= aprendices, 1, 0);
end //

-- Devuelve 1 si el ambiente está habilitado para esa jornada
create function fn_jornada_compatible(p_id_amb int, p_id_jorn int)
returns tinyint
reads sql data
begin
  declare habilitado int;
  select count(*) into habilitado from jornada_ambiente where ambiente_id = p_id_amb and jornada_id = p_id_jorn;
  return if(habilitado > 0, 1, 0);
end //

-- Registra una agenda validando todo. El resultado queda en la variable OUT "mensaje"
-- (los errores empiezan con "Error:"). El backend usa este procedimiento.
create procedure sp_registrar_agenda(in p_instr int, in p_ficha_num int, in p_amb_id int, in p_jorn_id int,
in p_fi date, in p_ff date, in p_hi time, in p_hf time, out mensaje varchar(255))
begin
  -- Coherencia de fecha y hora
  if p_fi > p_ff or p_hi >= p_hf then
    set mensaje = 'Error: Fechas u horas incoherentes.';

  -- El ambiente debe estar en buenas condiciones (no mantenimiento ni inactivo)
  elseif (select estado_ambiente from ambientes where id_ambiente = p_amb_id) <> 'Activo' then
    set mensaje = 'Error: El ambiente no se puede agendar porque está en mantenimiento o inactivo.';

  -- No agendar fuera de la etapa lectiva de la ficha
  elseif p_fi > (select fin_lectiva from programas_formacion pf join fichas f on pf.id_programa = f.programa_id where numero_ficha = p_ficha_num)
      or p_ff > (select fin_lectiva from programas_formacion pf join fichas f on pf.id_programa = f.programa_id where numero_ficha = p_ficha_num) then
    set mensaje = 'Error: Las fechas inicio y fin están fuera de la etapa lectiva de la ficha seleccionada';

  -- Disponibilidad del ambiente
  elseif fn_ambiente_disponible(p_amb_id, p_fi, p_ff, p_hi, p_hf) = 0 then
    set mensaje = 'Error: El ambiente ya está ocupado en ese rango.';

  -- Disponibilidad del instructor
  elseif fn_instructor_disponible(p_instr, p_fi, p_ff, p_hi, p_hf) = 0 then
    set mensaje = 'Error: El instructor ya tiene otra asignación.';

  -- Capacidad
  elseif fn_capacidad_adecuada(p_amb_id, p_ficha_num) = 0 then
    set mensaje = 'Error: El ambiente es muy pequeño para esta ficha.';

  -- Jornada compatible con el ambiente
  elseif fn_jornada_compatible(p_amb_id, p_jorn_id) = 0 then
    set mensaje = 'Error: El ambiente seleccionado no está habilitado para la jornada elegida.';

  -- Todo bien: se inserta
  else
    insert into agendas (instructor_id, ficha_numero, ambiente_id, jornada_id, fecha_inicio, fecha_fin, hora_inicio, hora_fin) values
    (p_instr, p_ficha_num, p_amb_id, p_jorn_id, p_fi, p_ff, p_hi, p_hf);
    set mensaje = 'Éxito: Agenda registrada correctamente.';
  end if;
end //

-- ---------------------------------------------------------------------
-- 4. DISPARADORES (TRIGGERS)
-- ---------------------------------------------------------------------

-- Un administrador debe ser un usuario con rol Administrador
create trigger trg_antes_insertar_admin
before insert on administradores
for each row
begin
  if (new.usuario_id not in (select id_usuario from usuarios where rol_id = (select id_rol from rol where nombre_rol = 'Administrador'))) then
    signal sqlstate '45000'
    set message_text = 'Error: el id de usuario ingresado no pertenece a un administrador';
  end if;
end //

-- Un instructor debe ser un usuario con rol Instructor y con fechas de contrato coherentes
create trigger trg_antes_insertar_instructores
before insert on instructores
for each row
begin
  if (new.usuario_id not in (select id_usuario from usuarios where rol_id = (select id_rol from rol where nombre_rol = 'Instructor'))) then
    signal sqlstate '45000'
    set message_text = 'Error: el id de usuario ingresado no pertenece a un instructor';
  end if;

  if new.fecha_inicio_contrato >= new.fecha_fin_contrato then
    signal sqlstate '45000'
    set message_text = 'Error: las fechas de contrato son incoherentes';
  end if;
end //

-- Capacidad de ambientes mayor a 0 (al crear y al editar)
create trigger trg_antes_insertar_ambientes
before insert on ambientes
for each row
begin
  if new.capacidad_max <= 0 then
    signal sqlstate '45000'
    set message_text = 'Error: no se puede ingresar capacidades máximas iguales o por debajo de cero';
  end if;
end //

create trigger trg_antes_actualizar_ambientes
before update on ambientes
for each row
begin
  if new.capacidad_max <= 0 then
    signal sqlstate '45000'
    set message_text = 'Error: no se puede ingresar capacidades máximas iguales o por debajo de cero';
  end if;
end //

-- Aprendices de la ficha mayor a 0 (al crear y al editar)
create trigger trg_antes_insertar_fichas
before insert on fichas
for each row
begin
  if new.cnt_aprendices <= 0 then
    signal sqlstate '45000'
    set message_text = 'Error: no se puede ingresar cantidades de aprendices iguales o por debajo de cero';
  end if;
end //

create trigger trg_antes_actualizar_fichas
before update on fichas
for each row
begin
  if new.cnt_aprendices <= 0 then
    signal sqlstate '45000'
    set message_text = 'Error: no se puede ingresar cantidades de aprendices iguales o por debajo de cero';
  end if;
end //

-- Validaciones al insertar una agenda directamente (las de cruce de horarios viven en sp_registrar_agenda,
-- porque MySQL no deja que un trigger consulte la misma tabla que está modificando)
create trigger trg_antes_insertar_agendas
before insert on agendas
for each row
begin
  if new.fecha_inicio > new.fecha_fin or new.hora_inicio >= new.hora_fin then
    signal sqlstate '45000'
    set message_text = 'Error: Fechas u horas incoherentes.';

  -- El ambiente debe estar en buenas condiciones
  elseif (select estado_ambiente from ambientes where id_ambiente = new.ambiente_id) <> 'Activo' then
    signal sqlstate '45000'
    set message_text = 'Error: El ambiente no se puede agendar porque está en mantenimiento o inactivo.';

  -- No agendar fichas que ya terminaron su etapa lectiva
  elseif new.fecha_inicio > (select fin_lectiva from programas_formacion pf join fichas f on pf.id_programa = f.programa_id where numero_ficha = new.ficha_numero)
      or new.fecha_fin > (select fin_lectiva from programas_formacion pf join fichas f on pf.id_programa = f.programa_id where numero_ficha = new.ficha_numero) then
    signal sqlstate '45000'
    set message_text = 'Error: Las fechas inicio y fin están fuera de la etapa lectiva de la ficha seleccionada';

  -- Capacidad
  elseif fn_capacidad_adecuada(new.ambiente_id, new.ficha_numero) = 0 then
    signal sqlstate '45000'
    set message_text = 'Error: El ambiente es muy pequeño para esta ficha.';

  -- Jornada compatible con el ambiente
  elseif fn_jornada_compatible(new.ambiente_id, new.jornada_id) = 0 then
    signal sqlstate '45000'
    set message_text = 'Error: El ambiente seleccionado no está habilitado para la jornada elegida.';
  end if;
end //

-- Un instructor solo puede reportar novedades en ambientes y fechas donde tiene agenda
create trigger trg_antes_insertar_novedades
before insert on novedades
for each row
begin
  if not exists (select 1 from agendas where instructor_id = new.instructor_id and ambiente_id = new.ambiente_id
        and new.fecha_reporte between fecha_inicio and fecha_fin) then
    signal sqlstate '45000'
    set message_text = 'Error: Instructor, no puedes reportar novedades en una fecha o ambiente donde no estás asignado.';
  end if;
end //

delimiter ;

-- ---------------------------------------------------------------------
-- 5. VISTAS
-- ---------------------------------------------------------------------
-- Ambientes que sí se pueden usar
create view vw_ambientes_disponibles as
select a.id_ambiente, a.nombre_ambiente, e.nombre_edificio as edificio, a.piso, a.capacidad_max
from ambientes a
left join edificios e on e.id_edificio = a.edificio_id
where a.estado_ambiente = 'Activo';

-- Usuarios sin documento ni contraseña
create view vw_usuarios_seguro as
select id_usuario, nombre, apellido, correo, estado_usuario from usuarios;

-- Cantidad de agendas por ambiente
create view vw_ocupacion_ambientes as
select am.nombre_ambiente, count(a.id_agenda) as total_agendas
from ambientes am
left join agendas a on am.id_ambiente = a.ambiente_id
group by am.nombre_ambiente;

-- Fichas con su programa y coordinación
create view vw_fichas_programas as
select f.numero_ficha, pf.nombre_programa, pf.nivel, f.coordinacion, f.modalidad, f.cnt_aprendices, pf.fin_lectiva
from fichas f
inner join programas_formacion pf on f.programa_id = pf.id_programa;

-- ---------------------------------------------------------------------
-- 6. DATOS INICIALES
-- ---------------------------------------------------------------------
insert into rol (nombre_rol) values ('Administrador'), ('Instructor');

insert into categoria_ambiente (nombre_categoria) values
  ('Aula tic'), ('Laboratorio'), ('Aula convencional'), ('Multimedia'), ('Música'), ('Ingeniería y diseño'), ('Productiva');

insert into edificios (nombre_edificio) values
  ('Edificio de formación'),   -- EF
  ('Edificio de industria'),   -- EI
  ('CIES'),
  ('Tecnoparque'),
  ('Por confirmar');           -- EB y otros que aún no se sabe cuáles son

-- Horarios según el Excel de Pescadero
insert into jornadas (nombre_jornada, hora_inicio, hora_fin) values
  ('Mañana', '06:00', '11:55'),
  ('Tarde',  '12:05', '18:00'),
  ('Noche',  '18:30', '21:30'),
  ('FDS',    null,    null);

insert into tipos_novedad (nombre_tipo) values
  ('Ambiente, aula o laboratorio'),
  ('Equipo, máquinas y mobiliario'),
  ('Materiales de formación'),
  ('Biblioteca y bibliografía');

-- Usuarios de prueba (contraseña cifrada con AES; la llave debe ser la misma del archivo .env del backend: AES_KEY)
insert into usuarios (rol_id, tipo_doc, numero_doc, nombre, apellido, correo, contrasena_aes) values
  ((select id_rol from rol where nombre_rol = 'Administrador'), 'CC', '1092172163', 'Mariana', 'García',
   'dmariana.admin@sena.edu.co', AES_ENCRYPT('admin2026', 'Sena_Ambigest2026')),
  ((select id_rol from rol where nombre_rol = 'Instructor'), 'CC', '1092322121', 'Isabell', 'Rojas',
   'lgarcia@sena.edu.co', AES_ENCRYPT('sena123', 'Sena_Ambigest2026'));

insert into administradores (usuario_id, dependencia) values
  ((select id_usuario from usuarios where correo = 'dmariana.admin@sena.edu.co'), 'Coordinación Académica - CEDRUM');

insert into instructores (usuario_id, red_conocimiento, area, contrato, fecha_inicio_contrato, fecha_fin_contrato) values
  ((select id_usuario from usuarios where correo = 'lgarcia@sena.edu.co'), 'Software', 'Programacion', 'Contratista', '2026-01-01', '2026-12-31');

-- Programa y ficha de ejemplo
insert into programas_formacion (nombre_programa, nivel, fin_lectiva) values ('ADSO', 'Tecnologo', '2026-12-31');

insert into fichas (numero_ficha, programa_id, coordinacion, modalidad, cnt_aprendices, instructor_lider_id) values
  (3237822, (select id_programa from programas_formacion where nombre_programa = 'ADSO'), 'Darwin Celis', 'Presencial', 30,
   (select id_usuario from usuarios where correo = 'lgarcia@sena.edu.co'));

-- 18 ambientes de la sede Pescadero (fuente: Excel, solo las filas visibles de la hoja PESCADERO)
insert into ambientes (categoria_id, edificio_id, nombre_ambiente, piso, capacidad_max, estado_ambiente) values
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula tic'), (select id_edificio from edificios where nombre_edificio = 'Edificio de formación'), 'EF-201 TIC', 'Piso 2', 34, 'Activo'),
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula convencional'), (select id_edificio from edificios where nombre_edificio = 'Edificio de formación'), 'EF-206', 'Piso 2', 33, 'Activo'),
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula convencional'), (select id_edificio from edificios where nombre_edificio = 'Edificio de formación'), 'EF-207', 'Piso 2', 34, 'Activo'),
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula convencional'), (select id_edificio from edificios where nombre_edificio = 'Edificio de formación'), 'EF-208', 'Piso 2', 28, 'Activo'),
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula convencional'), (select id_edificio from edificios where nombre_edificio = 'Edificio de formación'), 'EF-209', 'Piso 2', 32, 'Activo'),
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula convencional'), (select id_edificio from edificios where nombre_edificio = 'Edificio de formación'), 'EF-210', 'Piso 2', 27, 'Activo'),
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula tic'), (select id_edificio from edificios where nombre_edificio = 'Edificio de formación'), 'EF-301 TIC', 'Piso 3', 34, 'Activo'),
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula convencional'), (select id_edificio from edificios where nombre_edificio = 'Edificio de formación'), 'EF-307 (CIES)', 'Piso 3', 35, 'Activo'),
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula convencional'), (select id_edificio from edificios where nombre_edificio = 'CIES'), '310 (CIES)', 'Piso 3', 28, 'Activo'),
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula convencional'), (select id_edificio from edificios where nombre_edificio = 'CIES'), '309 (CIES)', 'Piso 3', 20, 'Activo'),
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula convencional'), (select id_edificio from edificios where nombre_edificio = 'CIES'), '311 (CIES)', 'Piso 3', 30, 'Activo'),
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Multimedia'), (select id_edificio from edificios where nombre_edificio = 'Por confirmar'), '304 MULTIMEDIA', 'Piso 3', 34, 'Activo'),  -- REVISAR: edificio por confirmar
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula convencional'), (select id_edificio from edificios where nombre_edificio = 'Edificio de industria'), 'EI-210', 'Piso 2', 30, 'Activo'),
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Productiva'), (select id_edificio from edificios where nombre_edificio = 'Por confirmar'), 'EB-306', 'Piso 3', 21, 'Activo'),  -- REVISAR: edificio por confirmar
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Música'), (select id_edificio from edificios where nombre_edificio = 'Por confirmar'), 'A-MUSICA', 'Piso 1', 26, 'Activo'),  -- REVISAR: edificio por confirmar
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula tic'), (select id_edificio from edificios where nombre_edificio = 'Tecnoparque'), 'TEC-TIC1', 'Piso 1', 36, 'Activo'),
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Aula tic'), (select id_edificio from edificios where nombre_edificio = 'Tecnoparque'), 'TECNOACADEMIA TIC', 'Piso 2', 30, 'Activo'),  -- REVISAR: capacidad provisional (el Excel no trae aprendices)
  ((select id_categoria from categoria_ambiente where nombre_categoria = 'Ingeniería y diseño'), (select id_edificio from edificios where nombre_edificio = 'Tecnoparque'), 'TEC-INGDISEÑO1', 'Piso 2', 16, 'Activo');

-- Jornadas en las que cada ambiente aparece en el Excel
insert into jornada_ambiente (ambiente_id, jornada_id)
select a.id_ambiente, j.id_jornada from ambientes a, jornadas j
 where a.nombre_ambiente in ('EF-201 TIC', 'EF-206', 'EF-207', 'EF-208', 'EF-209', 'EF-210', 'EF-301 TIC', '304 MULTIMEDIA', 'EI-210', 'EB-306', 'TEC-TIC1', 'TECNOACADEMIA TIC', 'TEC-INGDISEÑO1')
   and j.nombre_jornada in ('Mañana', 'Tarde', 'Noche', 'FDS');

insert into jornada_ambiente (ambiente_id, jornada_id)
select a.id_ambiente, j.id_jornada from ambientes a, jornadas j
 where a.nombre_ambiente in ('EF-307 (CIES)')
   and j.nombre_jornada in ('Noche', 'FDS');

insert into jornada_ambiente (ambiente_id, jornada_id)
select a.id_ambiente, j.id_jornada from ambientes a, jornadas j
 where a.nombre_ambiente in ('310 (CIES)', '309 (CIES)', '311 (CIES)')
   and j.nombre_jornada in ('Noche');

insert into jornada_ambiente (ambiente_id, jornada_id)
select a.id_ambiente, j.id_jornada from ambientes a, jornadas j
 where a.nombre_ambiente in ('A-MUSICA')
   and j.nombre_jornada in ('Mañana', 'Tarde', 'Noche');

-- ---------------------------------------------------------------------
-- 7. USUARIOS DE MYSQL Y PERMISOS
--    El backend entra a MySQL como 'admin' (ver DB_USER y DB_PASSWORD en el archivo .env).
--    Se crea con IF NOT EXISTS y luego se fuerza la contraseña, así queda igual aunque el usuario ya existiera.
-- ---------------------------------------------------------------------
create user if not exists 'admin'@'localhost' identified by 'Senaadmins';
create user if not exists 'admin'@'127.0.0.1' identified by 'Senaadmins';
create user if not exists 'instructor'@'localhost' identified by 'Senainstru';
alter user 'admin'@'localhost' identified by 'Senaadmins';
alter user 'admin'@'127.0.0.1' identified by 'Senaadmins';
alter user 'instructor'@'localhost' identified by 'Senainstru';

-- Roles de MySQL (documentan qué puede hacer cada tipo de usuario)
create role if not exists rol_admin;
create role if not exists rol_instructor;
grant select, insert, update, execute on ambigest3.* to rol_admin;
grant select on ambigest3.agendas to rol_instructor;
grant insert on ambigest3.novedades to rol_instructor;
grant rol_admin to 'admin'@'localhost';
grant rol_admin to 'admin'@'127.0.0.1';
grant rol_instructor to 'instructor'@'localhost';

-- Permisos directos (para que funcionen sin tener que activar el rol)
-- admin: lo usa el backend. Necesita DELETE solo en las tablas que el sistema realmente borra.
grant select, insert, update, execute on ambigest3.* to 'admin'@'localhost';
grant select, insert, update, execute on ambigest3.* to 'admin'@'127.0.0.1';
grant delete on ambigest3.fichas to 'admin'@'localhost';
grant delete on ambigest3.fichas to 'admin'@'127.0.0.1';
grant delete on ambigest3.usuarios to 'admin'@'localhost';
grant delete on ambigest3.usuarios to 'admin'@'127.0.0.1';
grant delete on ambigest3.jornada_ambiente to 'admin'@'localhost';
grant delete on ambigest3.jornada_ambiente to 'admin'@'127.0.0.1';
grant select on ambigest3.agendas to 'instructor'@'localhost';
grant insert on ambigest3.novedades to 'instructor'@'localhost';
flush privileges;

-- ---------------------------------------------------------------------
-- 8. VERIFICACIÓN (debe mostrar 18 ambientes)
-- ---------------------------------------------------------------------
select a.id_ambiente, a.nombre_ambiente, c.nombre_categoria, e.nombre_edificio, a.piso, a.capacidad_max,
       a.estado_ambiente, group_concat(j.nombre_jornada order by j.id_jornada) as jornadas
from ambientes a
left join categoria_ambiente c on c.id_categoria = a.categoria_id
left join edificios e on e.id_edificio = a.edificio_id
left join jornada_ambiente ja on ja.ambiente_id = a.id_ambiente
left join jornadas j on j.id_jornada = ja.jornada_id
group by a.id_ambiente
order by a.id_ambiente;

/* ---------------------------------------------------------------------
   PRUEBAS OPCIONALES (quita los comentarios para probar)

   -- Agenda correcta (debe decir "Éxito"):
   call sp_registrar_agenda(2, 3237822, 1, 1, '2026-11-02', '2026-11-30', '07:00', '11:00', @r);
   select @r;

   -- Mismo ambiente, mismo horario: debe decir que el ambiente está ocupado
   call sp_registrar_agenda(2, 3237822, 1, 1, '2026-11-10', '2026-11-12', '08:00', '10:00', @r);
   select @r;

   -- Ambiente en mantenimiento: no se puede agendar
   update ambientes set estado_ambiente = 'Mantenimiento' where id_ambiente = 2;
   call sp_registrar_agenda(2, 3237822, 2, 1, '2026-12-01', '2026-12-05', '07:00', '11:00', @r);
   select @r;
   update ambientes set estado_ambiente = 'Activo' where id_ambiente = 2;
   --------------------------------------------------------------------- */
