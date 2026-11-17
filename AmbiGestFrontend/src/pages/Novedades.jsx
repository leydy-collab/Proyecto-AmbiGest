import React, { useState, useEffect, useRef } from 'react';
import ErrorCarga from '../components/ErrorCarga';
import { novedadesApi, catalogosApi } from '../services/api';
import * as FiIcons from 'react-icons/fi';
import * as LuIcons from 'react-icons/lu';

const ESTADOS = ['Pendiente', 'En proceso', 'Resuelto'];

// La bandeja del administrador se actualiza sola cada 15 s (así le aparecen las novedades nuevas sin recargar);
// la del instructor cada 30 s (para ver cuando el administrador cambia el estado de lo que reportó)
const CADA_CUANTO_ADMIN = 15 * 1000;
const CADA_CUANTO_INSTRUCTOR = 30 * 1000;

// Colores del badge según el estado de la novedad
const CLASE_ESTADO = {
  'Pendiente': 'bg-red-50 text-red-600 border-red-100',
  'En proceso': 'bg-amber-50 text-amber-600 border-amber-100',
  'Resuelto': 'bg-green-50 text-green-600 border-green-100',
};

// Colores del badge según el tipo de novedad
const claseTipo = (tipo) =>
  tipo.startsWith('Equipo')
    ? 'bg-blue-50 text-blue-600 border-blue-100'
    : 'bg-orange-50 text-orange-600 border-orange-100';

// ==========================================
// VISTA DEL ADMINISTRADOR: bandeja de novedades
// ==========================================
function VistaAdmin({ onCambio }) {
  const [reportesGlobales, setReportesGlobales] = useState([]);
  const [filtro, setFiltro] = useState('Todas');
  const [errorCarga, setErrorCarga] = useState('');
  const [guardando, setGuardando] = useState(null); // id de la novedad cuyo estado se está guardando

  // Ids que ya se habían visto: las que lleguen después se marcan como "Nueva"
  const idsConocidos = useRef(null);
  const [nuevas, setNuevas] = useState(() => new Set());

  useEffect(() => {
    const cargar = async () => {
      try {
        const lista = await novedadesApi.listar();
        if (idsConocidos.current === null) {
          // primera carga: todas las que ya existen se consideran vistas
          idsConocidos.current = new Set(lista.map((n) => n.id));
        } else {
          // cargas siguientes: las que no estaban antes acaban de ser reportadas por un instructor
          const llegaron = lista.filter((n) => !idsConocidos.current.has(n.id));
          if (llegaron.length > 0) {
            llegaron.forEach((n) => idsConocidos.current.add(n.id));
            setNuevas((prev) => new Set([...prev, ...llegaron.map((n) => n.id)]));
          }
        }
        setReportesGlobales(lista);
        setErrorCarga('');
      } catch (e) {
        setErrorCarga(e.message);
      }
    };

    cargar(); // primera carga al entrar
    const intervalo = setInterval(cargar, CADA_CUANTO_ADMIN);

    // Al volver a esta pestaña se actualiza de inmediato
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  // El administrador cambia el estado de una novedad (Pendiente / En proceso / Resuelto)
  const cambiarEstado = async (id, estado) => {
    setGuardando(id);
    try {
      await novedadesApi.cambiarEstado(id, estado);
      setReportesGlobales((lista) => lista.map((n) => (n.id === id ? { ...n, estado } : n)));
      setErrorCarga('');
      if (onCambio) onCambio(); // actualiza el número de la campana en el Header
    } catch (e) {
      setErrorCarga(e.message);
    } finally {
      setGuardando(null);
    }
  };

  const conteo = (estado) => reportesGlobales.filter((n) => n.estado === estado).length;
  const visibles = filtro === 'Todas'
    ? reportesGlobales
    : reportesGlobales.filter((n) => n.estado === filtro);

  return (
    <div className="w-full flex flex-col gap-8 animate-fadeIn">
      <ErrorCarga mensaje={errorCarga} />
      <div>
        <h1 className="text-[32px] font-normal text-gray-800 leading-tight">
          Bandeja de <span className="text-verde-oscuro font-bold">Novedades</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1 font-light">Panel de control y revisión de incidencias enviadas por Instructores</p>
      </div>

      {/* filtros por estado, con cuántas hay en cada uno */}
      <div className="flex flex-wrap gap-2">
        {['Todas', ...ESTADOS].map((op) => {
          const total = op === 'Todas' ? reportesGlobales.length : conteo(op);
          const activo = filtro === op;
          return (
            <button
              key={op}
              onClick={() => setFiltro(op)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                activo
                  ? 'bg-verde-oscuro text-white border-verde-oscuro shadow-xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {op} <span className={activo ? 'opacity-80' : 'text-gray-400'}>({total})</span>
            </button>
          );
        })}
      </div>

      {/* contenedor de reportes */}
      <div className="w-full">
        {visibles.length > 0 ? (
          <div className="flex flex-col gap-4">
            {visibles.map((rep) => (
              <div
                key={rep.id}
                className={`p-5 bg-white border rounded-xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
                  nuevas.has(rep.id) ? 'border-rojo-alerta/60' : 'border-gray-200/60'
                }`}
              >
                {/* lado izquierdo de la tarjeta */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Nombre del ambiente */}
                    <span className="text-base font-bold text-gray-800 tracking-tight">{rep.ambiente}</span>

                    {/* Badge del tipo de novedad por colores */}
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-semibold tracking-wide border ${claseTipo(rep.tipo)}`}>
                      {rep.tipo}
                    </span>

                    {/* Etiqueta para las que llegaron mientras el administrador tenía la bandeja abierta */}
                    {nuevas.has(rep.id) && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wide bg-rojo-alerta text-white">
                        Nueva
                      </span>
                    )}
                  </div>

                  {/* Descripción extendida */}
                  <p className="text-sm text-gray-600 m-0 font-light leading-relaxed">{rep.desc}</p>

                  {/* instructor*/}
                  <span className="text-xs text-gray-400 font-medium mt-1">
                    Reportado por: <span className="text-gray-500 font-semibold">{rep.instructor}</span>
                  </span>
                </div>

                {/* lado derecho de la tarjeta (estado y fecha) */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                  {/* El estado es una lista desplegable: el administrador lo cambia ahí mismo */}
                  <select
                    value={rep.estado}
                    disabled={guardando === rep.id}
                    onChange={(e) => cambiarEstado(rep.id, e.target.value)}
                    title="Cambiar estado"
                    className={`text-xs px-3 py-1 rounded-md font-bold uppercase tracking-wider border outline-hidden cursor-pointer disabled:opacity-50 ${CLASE_ESTADO[rep.estado]}`}
                  >
                    {ESTADOS.map((est) => (
                      <option key={est} value={est}>{est}</option>
                    ))}
                  </select>

                  {/* Fecha y hora del reporte */}
                  <span className="text-[11px] text-gray-400 font-light font-mono">{rep.fecha} · {rep.hora}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Bandeja vacía*/
          <div className="w-full bg-white rounded-xl border border-gray-200/60 py-20 flex flex-col justify-center items-center text-gray-400 gap-3 shadow-xs">
            <LuIcons.LuInbox className="text-5xl opacity-40 text-gray-300" />
            <span className="text-lg font-normal tracking-wide">
              {reportesGlobales.length === 0 ? 'Bandeja vacía' : `No hay novedades "${filtro}"`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// VISTA DEL INSTRUCTOR: reportar y ver lo que ha reportado
// ==========================================
function VistaInstructor({ usuario }) {
  // Estado para controlar si el Instructor abrió el formulario de reporte
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Estados para capturar los campos del formulario del instructor
  const [ambiente, setAmbiente] = useState('');
  const [tipoFalla, setTipoFalla] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { ok: true/false, texto } resultado del último envío

  // Datos desde la base de datos
  const [ambientes, setAmbientes] = useState([]);   // solo los ambientes donde el instructor tiene agenda vigente hoy
  const [tipos, setTipos] = useState([]);
  const [misNovedades, setMisNovedades] = useState([]);
  const [errorCarga, setErrorCarga] = useState('');
  const [recarga, setRecarga] = useState(0); // al subir este número, se vuelven a pedir los datos

  const idInstructor = usuario?.id;
  const errorSesion = idInstructor ? '' : 'No se pudo identificar al instructor. Cierra sesión e inicia de nuevo.';

  useEffect(() => {
    if (!idInstructor) return;

    const cargar = () =>
      Promise.all([
        novedadesApi.misAmbientes(idInstructor),
        catalogosApi.tiposNovedad(),
        novedadesApi.listar(idInstructor),
      ])
        .then(([ambs, tps, mias]) => {
          setAmbientes(ambs);
          setTipos(tps);
          setMisNovedades(mias);
          setErrorCarga('');
        })
        .catch((e) => setErrorCarga(e.message));

    cargar();
    const intervalo = setInterval(cargar, CADA_CUANTO_INSTRUCTOR);
    return () => clearInterval(intervalo);
  }, [idInstructor, recarga]);

  // Función cuando el Instructor envía la novedad
  const handleEnviarReporte = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setMensaje(null);
    try {
      // El trigger de la BD valida que el instructor esté asignado a ese ambiente en esa fecha
      await novedadesApi.crear({
        instructorId: idInstructor,
        ambienteId: ambiente,
        tipoId: tipoFalla,
        descripcion,
      });
      setMensaje({ ok: true, texto: '¡Novedad reportada con éxito a administración!' });
      setAmbiente('');
      setTipoFalla('');
      setDescripcion('');
      setMostrarFormulario(false);
      setRecarga((n) => n + 1); // refresca "Mis novedades" para que aparezca la recién enviada
    } catch (err) {
      setMensaje({ ok: false, texto: err.message });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn">
      <ErrorCarga mensaje={errorSesion || errorCarga} />

      {/* botón superior cambiante */}
      <div className="flex justify-start">
        <button
          onClick={() => { setMostrarFormulario(!mostrarFormulario); setMensaje(null); }}
          className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium shadow-xs hover:bg-gray-50 transition-all cursor-pointer"
        >
          <FiIcons.FiClipboard className="text-verde-oscuro text-lg" />
          <span>{mostrarFormulario ? 'Cancelar reporte' : 'Reportar novedad'}</span>
        </button>
      </div>

      {/* resultado del último envío (éxito o el error que respondió la base de datos) */}
      {mensaje && (
        <div className={`w-full max-w-[500px] text-sm font-medium px-4 py-3 rounded-lg border ${
          mensaje.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* formulario desplegable si presiona el botón */}
      {mostrarFormulario ? (
        <div className="w-full max-w-[500px] bg-white p-6 rounded-xl shadow-xs border border-gray-100 animate-slideDown">
          <h3 className="text-base font-bold text-gray-800 mb-4">Detalles de la novedad</h3>

          <form onSubmit={handleEnviarReporte} className="flex flex-col gap-4">

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ambiente afectado</label>
              <select
                required
                value={ambiente}
                onChange={(e) => setAmbiente(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-hidden focus:border-verde-oscuro focus:bg-white transition-all cursor-pointer"
              >
                <option value="" disabled>Seleccione el ambiente</option>
                {ambientes.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
              {/* solo se pueden reportar ambientes donde el instructor tiene agenda vigente */}
              {ambientes.length === 0 && !errorCarga && !errorSesion && (
                <p className="text-xs text-amber-600 mt-1.5 m-0">
                  No tienes agendas vigentes hoy, por eso no hay ambientes disponibles para reportar.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tipo de novedad</label>
              <select
                required
                value={tipoFalla}
                onChange={(e) => setTipoFalla(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-hidden focus:border-verde-oscuro focus:bg-white transition-all cursor-pointer"
              >
                <option value="" disabled>Seleccione una categoría</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>{t.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Descripción del suceso</label>
              <textarea
                required
                rows="3"
                placeholder="Describa brevemente la novedad observada..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-hidden focus:border-verde-oscuro focus:bg-white transition-all resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={enviando || ambientes.length === 0}
              className="w-full py-2 bg-verde-oscuro text-white text-xs font-bold rounded-lg shadow-xs hover:bg-[#237037] transition-all cursor-pointer mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enviando ? 'Enviando...' : 'Enviar Reporte a Administración'}
            </button>
          </form>
        </div>
      ) : (
        /* Mensaje cuando no está reportando nada */
        <p className="text-xs text-gray-400 font-light italic">Pulse el botón superior para notificar incidencias técnicas en los ambientes.</p>
      )}

      {/* historial: lo que este instructor ya reportó y en qué estado va */}
      <div className="w-full max-w-[700px] flex flex-col gap-3">
        <h3 className="text-base font-bold text-gray-800 m-0">Mis novedades reportadas</h3>

        {misNovedades.length > 0 ? (
          misNovedades.map((n) => (
            <div key={n.id} className="p-4 bg-white border border-gray-200/60 rounded-xl shadow-xs flex justify-between items-start gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-gray-800">{n.ambiente}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${claseTipo(n.tipo)}`}>{n.tipo}</span>
                </div>
                <p className="text-sm text-gray-600 m-0 font-light leading-relaxed">{n.desc}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className={`text-xs px-3 py-0.5 rounded-md font-bold uppercase tracking-wider border ${CLASE_ESTADO[n.estado]}`}>
                  {n.estado}
                </span>
                <span className="text-[11px] text-gray-400 font-light font-mono">{n.fecha} · {n.hora}</span>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-400 font-light italic m-0">Aún no has reportado novedades.</p>
        )}
      </div>
    </div>
  );
}

// El rol decide qué pantalla se muestra
function Novedades({ rol, usuario, onCambio }) {
  if (rol === 'instructor') return <VistaInstructor usuario={usuario} />;
  return <VistaAdmin onCambio={onCambio} />;
}

export default Novedades;
