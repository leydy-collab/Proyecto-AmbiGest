import React, { useState, useEffect } from 'react';
import ErrorCarga from '../components/ErrorCarga';
import { novedadesApi, ambientesApi, catalogosApi } from '../services/api';
import * as FiIcons from 'react-icons/fi';
import * as BiIcons from 'react-icons/bi';
import * as LuIcons from 'react-icons/lu';

function Novedades({ rol, usuario }) {
  // Estado para controlar si el Instructor abrió el formulario de reporte
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  // Estados para capturar los campos del formulario del instructor
  const [ambiente, setAmbiente] = useState('');
  const [tipoFalla, setTipoFalla] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Datos desde la base de datos
  const [reportesGlobales, setReportesGlobales] = useState([]);
  const [ambientes, setAmbientes] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [errorCarga, setErrorCarga] = useState('');

  useEffect(() => {
    if (rol === 'instructor') {
      Promise.all([ambientesApi.listar(), catalogosApi.tiposNovedad()])
        .then(([ambs, tps]) => { setAmbientes(ambs); setTipos(tps); setErrorCarga(''); })
        .catch((e) => setErrorCarga(e.message));
    } else {
      novedadesApi.listar()
        .then((lista) => { setReportesGlobales(lista); setErrorCarga(''); })
        .catch((e) => setErrorCarga(e.message));
    }
  }, [rol]);

  // Función cuando el Instructor envía la novedad
  const handleEnviarReporte = async (e) => {
    e.preventDefault();
    try {
      // El trigger de la BD valida que el instructor esté asignado a ese ambiente en esa fecha
      await novedadesApi.crear({
        instructorId: usuario?.id,
        ambienteId: ambiente,
        tipoId: tipoFalla,
        descripcion,
      });
      alert('¡Novedad reportada con éxito a administración!');
      setAmbiente('');
      setTipoFalla('');
      setDescripcion('');
      setMostrarFormulario(false);
    } catch (err) {
      alert(err.message);
    }
  };

  // instructor
  if (rol === 'instructor') {
    return (
      <div className="w-full flex flex-col gap-6 animate-fadeIn">
        <ErrorCarga mensaje={errorCarga} />
        
        {/* botón superior cambiante */}
        <div className="flex justify-start">
          <button 
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
            className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-medium shadow-xs hover:bg-gray-50 transition-all cursor-pointer"
          >
            <FiIcons.FiClipboard className="text-verde-oscuro text-lg" />
            <span>{mostrarFormulario ? 'Cancelar reporte' : 'Reportar novedad'}</span>
          </button>
        </div>

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

              <button type="submit" className="w-full py-2 bg-verde-oscuro text-white text-xs font-bold rounded-lg shadow-xs hover:bg-[#237037] transition-all cursor-pointer mt-2">
                Enviar Reporte a Administración
              </button>
            </form>
          </div>
        ) : (
          /* Mensaje cuando no está reportando nada */
          <p className="text-xs text-gray-400 font-light mt-4 italic">Pulse el botón superior para notificar incidencias técnicas en los ambientes.</p>
        )}
      </div>
    );
  }

  // Admin
  return (
    <div className="w-full flex flex-col gap-10 animate-fadeIn">
      <ErrorCarga mensaje={errorCarga} />
      <div>
        <h1 className="text-[32px] font-normal text-gray-800 leading-tight">
          Bandeja de <span className="text-verde-oscuro font-bold">Novedades</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1 font-light">Panel de control y revisión de incidencias enviadas por Instructores</p>
      </div>

      {/* contenedor de reportes */}
      <div className="w-full">
        {reportesGlobales.length > 0 ? (
          <div className="flex flex-col gap-4">
            {reportesGlobales.map((rep) => (
              <div 
                key={rep.id} 
                className="p-5 bg-white border border-gray-200/60 rounded-xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* lado izquierdo de la tarjeta */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    {/* Nombre del ambiente */}
                    <span className="text-base font-bold text-gray-800 tracking-tight">{rep.ambiente}</span>
                    
                    {/* Badge del tipo de novedad por colores */}
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-md font-semibold tracking-wide border ${
                      rep.tipo.startsWith('Equipo') 
                        ? 'bg-blue-50 text-blue-600 border-blue-100' 
                        : 'bg-orange-50 text-orange-600 border-orange-100'
                    }`}>
                      {rep.tipo}
                    </span>
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
                  {/* Badge rectangular de estado */}
                  <span className={`text-xs px-3 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                    rep.estado === 'Pendiente' 
                      ? 'bg-red-50 text-red-600 border border-red-100' 
                      : 'bg-green-50 text-green-600 border border-green-100'
                  }`}>
                    {rep.estado}
                  </span>
                  
                  {/* Fecha */}
                  <span className="text-[11px] text-gray-400 font-light font-mono">{rep.fecha}</span>
                </div>

              </div>
            ))}
          </div>
        ) : (
          /* Bandeja vacía*/
          <div className="w-full bg-white rounded-xl border border-gray-200/60 py-20 flex flex-col justify-center items-center text-gray-400 gap-3 shadow-xs">
            <LuIcons.LuInbox className="text-5xl opacity-40 text-gray-300" />
            <span className="text-lg font-normal tracking-wide">Bandeja vacía</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default Novedades;
