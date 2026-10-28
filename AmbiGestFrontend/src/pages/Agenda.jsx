// import React from 'react';
// import * as FiIcons from 'react-icons/fi';
// import * as BiIcons from 'react-icons/bi';
// import { CeldaDia } from '../components/BloqueHorario';

// function Agenda({ rol }) {
//   // Simulación de datos (Contiene 3 jornadas para validar que el límite de 2 funcione perfectamente)
//   const horariosEjemplo = [
//     { ficha: '3237822', hora: '6:00 AM - 12:00 PM', color: 'rojo' },
//     { ficha: '2918212', hora: '12:00 PM - 6:00 PM', color: 'amarillo' },
//     { ficha: '3121031', hora: '6:30 PM - 9:30 PM', color: 'verde' }
//   ];

//   const diasDelMes = Array.from({ length: 31 }, (_, i) => i + 1);
  
//   // Días de relleno
//   const diasPreviosRelleno = [24, 25, 26, 27, 28]; // Febrero
//   const diasPostRelleno = [1, 2, 3, 4, 5]; // Abril

//   return (
//     <div className="w-full flex flex-col gap-6 animate-fadeIn">
      
//       {/* acciones superiores */}
//       <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-xs border border-gray-100">
        
//         {/* buscador */}
//         <div className="relative w-full md:w-90">
//           <FiIcons.FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg" />
//           <input 
//             type="text" 
//             placeholder="Buscar ambiente..." 
//             className="w-full pl-10 pr-10 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-hidden focus:border-verde-oscuro focus:bg-white transition-all"
//           />
//           <FiIcons.FiSliders className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-verde-oscuro cursor-pointer" />
//         </div>

//         {/* Título del mes o ambiente */}
//         {rol === 'administrador' ? (
//         <h2 className="text-xl font-bold text-green-700 tracking-wide uppercase m-0 text-center">
//           Ambiente 301
//         </h2>
//         ):("")}

//         {/* rol admin: botón de agendar ambiente */}
//         {rol === 'administrador' ? (
//           <button className="flex items-center gap-2 bg-verde-oscuro text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs hover:bg-[#247338] transition-all cursor-pointer">
//             <BiIcons.BiPlusCircle className="text-lg" />
//             <span>Agendar ambiente</span>
//           </button>
//         ) : (
//           // rol instru: Badge estático e informativo
//           <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm font-semibold select-none">
//             <FiIcons.FiCalendar className="text-sm text-verde-oscuro" />
//             <span>Ficha: 3237822</span>
//           </div>
//         )}
//       </div>

//       {/* contenedor calendario */}
//       <div className="w-full bg-white p-4 rounded-xl shadow-xs border border-gray-100">
        
//         <h2 className="text-xl font-bold text-gray-700 tracking-wide uppercase mb-5 text-center">Marzo 2026</h2>
        
//         {/* columnas*/}
//         <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-gray-500 uppercase tracking-wider mb-2">
//           <div>Lun</div>
//           <div>Mar</div>
//           <div>Mié</div>
//           <div>Jue</div>
//           <div>Vie</div>
//           <div>Sáb</div>
//           <div>Dom</div>
//         </div>

//         {/* celdas */}
//         <div className="grid grid-cols-7 gap-1 bg-gray-200 p-0.5 rounded-md">
          
//           {/* Febrero */}
//           {diasPreviosRelleno.map(dia => (
//             <CeldaDia key={`prev-${dia}`} numero={dia} esMesActual={false} />
//           ))}

//           {/* Marzo */}
//           {diasDelMes.map(dia => (
//             <CeldaDia key={dia} numero={dia} horarios={horariosEjemplo} />
//           ))}

//           {/* Abril */}
//           {diasPostRelleno.map(dia => (
//             <CeldaDia key={`post-${dia}`} numero={dia} esMesActual={false} />
//           ))}

//         </div>
//       </div>

//     </div>
//   );
// }

// export default Agenda;

import React, { useState, useEffect } from 'react';
import * as FiIcons from 'react-icons/fi';
import * as BiIcons from 'react-icons/bi';
import * as MdIcons from 'react-icons/md';
import { CeldaDia } from '../components/BloqueHorario';
import ModalAgendarAmbiente from '../components/ModalAgendarAmbiente';
import ErrorCarga from '../components/ErrorCarga';
import { agendaApi, ambientesApi } from '../services/api';

function Agenda({ rol = 'administrador', usuario }) {
  // Estado para el filtro: para 'administrador' es el Ambiente, para 'instructor' es la Ficha
  // Administrador: id del ambiente | Instructor: número de ficha (se llena al cargar los datos)
  const [filtroSeleccionado, setFiltroSeleccionado] = useState('');

  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const [anoActual, setAnoActual] = useState(new Date().getFullYear());
  const [mesActual, setMesActual] = useState(new Date().getMonth()); // 0 = Enero ... 11 = Diciembre

  // Agendas desde la base de datos
  const [listaAsignaciones, setListaAsignaciones] = useState([]);
  const [ambientes, setAmbientes] = useState([]);
  const [errorCarga, setErrorCarga] = useState('');

  const cargar = async () => {
    try {
      if (rol === 'administrador') {
        const [asignaciones, ambs] = await Promise.all([agendaApi.listar(), ambientesApi.listar()]);
        setListaAsignaciones(asignaciones);
        setAmbientes(ambs);
        setFiltroSeleccionado((actual) => actual || (ambs[0]?.id ?? ''));
      } else {
        // El instructor solo ve sus propias agendas
        const asignaciones = await agendaApi.listar(usuario?.id);
        setListaAsignaciones(asignaciones);
        setFiltroSeleccionado((actual) => actual || (asignaciones[0]?.ficha ?? ''));
      }
      setErrorCarga('');
    } catch (e) {
      setErrorCarga(e.message);
    }
  };

  useEffect(() => { cargar(); }, [rol, usuario?.id]);

  // 🛠️ MOTOR DE FILTRADO SEGÚN EL ROL
  const obtenerHorariosParaFecha = (fechaTexto) => {
    const horariosDelDia = [];

    listaAsignaciones.forEach(asignacion => {
      // Si es Admin, filtra por coincidencia de AMBIENTE.
      // Si es Instructor, filtra por coincidencia de FICHA.
      const coincideFiltro = rol === 'administrador'
        ? parseInt(asignacion.ambienteId, 10) === parseInt(filtroSeleccionado, 10)
        : asignacion.ficha.trim() === String(filtroSeleccionado).trim();

      const enRango = fechaTexto >= asignacion.fechaInicio && fechaTexto <= asignacion.fechaFin;

      const [ano, mes, dia] = fechaTexto.split('-');
      const fechaObj = new Date(ano, mes - 1, dia);
      const diaSemana = fechaObj.getDay();

      if (coincideFiltro && enRango && asignacion.diasSemana.includes(diaSemana)) {
        horariosDelDia.push(asignacion);
      }
    });

    return horariosDelDia;
  };

  // Generador de grilla del calendario
  const obtenerDiasCalendario = () => {
    const primerDiaMes = new Date(anoActual, mesActual, 1);
    const ultimoDiaMes = new Date(anoActual, mesActual + 1, 0);
    const totalDias = ultimoDiaMes.getDate();

    let diaSemanaInicial = primerDiaMes.getDay();
    diaSemanaInicial = diaSemanaInicial === 0 ? 6 : diaSemanaInicial - 1;

    const celdas = [];

    // Mes anterior
    const ultimoDiaMesAnterior = new Date(anoActual, mesActual, 0).getDate();
    for (let i = 0; i < diaSemanaInicial; i++) {
      const numDiaAnterior = ultimoDiaMesAnterior - (diaSemanaInicial - 1 - i);
      celdas.push({ numero: numDiaAnterior, esMesActual: false, fechaTexto: null, horarios: [] });
    }

    // Mes actual
    for (let d = 1; d <= totalDias; d++) {
      const mesFormateado = String(mesActual + 1).padStart(2, '0');
      const diaFormateado = String(d).padStart(2, '0');
      const fechaTexto = `${anoActual}-${mesFormateado}-${diaFormateado}`;

      celdas.push({
        numero: d,
        esMesActual: true,
        fechaTexto,
        horarios: obtenerHorariosParaFecha(fechaTexto)
      });
    }

    // Mes posterior
    const celdasRestantes = 42 - celdas.length; 
    for (let h = 1; h <= celdasRestantes; h++) {
      celdas.push({ numero: h, esMesActual: false, fechaTexto: null, horarios: [] });
    }

    return celdas;
  };

  const nombreMes = new Date(anoActual, mesActual).toLocaleString('es-CO', { month: 'long' });
  const matrizCeldas = obtenerDiasCalendario();

  const cambiarMes = (direccion) => {
    if (direccion === 'atras') {
      if (mesActual === 0) { setMesActual(11); setAnoActual(prev => prev - 1); }
      else { setMesActual(prev => prev - 1); }
    } else {
      if (mesActual === 11) { setMesActual(0); setAnoActual(prev => prev + 1); }
      else { setMesActual(prev => mesActual + 1); }
    }
    setDetalleSeleccionado(null);
  };

  // Guarda en la BD (usa tu procedimiento sp_registrar_agenda). Si falla, devuelve el mensaje al modal.
  const guardarNuevaAsignacion = async (datos) => {
    try {
      await agendaApi.crear(datos);
      await cargar();
      setModalAbierto(false);
      if (rol === 'administrador') {
        setFiltroSeleccionado(datos.ambienteId);
      }
    } catch (e) {
      return e.message;
    }
  };

  return (
    <div className="w-full flex gap-6 relative animate-fadeIn font-sans"> 
      
      <div className="flex-1 flex flex-col gap-6 transition-all duration-300"> 
        <ErrorCarga mensaje={errorCarga} />
        
        {/* Barra superior adaptada por ROL */}
        <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-xs border border-gray-100">
          
          {rol === 'administrador' ? (
            /* SELECTOR DE AMBIENTES PARA ADMINISTRADOR */
            <div className="relative w-full md:w-80">
              <select 
                value={filtroSeleccionado}
                onChange={(e) => setFiltroSeleccionado(e.target.value)}
                className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-green-600 focus:bg-white transition-all text-gray-700 cursor-pointer"
              >
                {ambientes.map((a) => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>
          ) : (
            /* SELECTOR DE FICHAS PARA INSTRUCTOR */
            <div className="relative w-full md:w-80">
              <select 
                value={filtroSeleccionado}
                onChange={(e) => setFiltroSeleccionado(e.target.value)}
                className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:border-green-600 focus:bg-white transition-all text-gray-700 cursor-pointer font-medium"
              >
                {[...new Set(listaAsignaciones.map((a) => a.ficha))].map((f) => (
                  <option key={f} value={f}>Ficha: {f}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* LADO DERECHO: TÍTULO EN ROL INSTRUCTOR O BOTÓN EN ROL ADMIN */}
          {rol === 'administrador' ? (
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              {/* <h2 className="text-lg font-bold text-green-700 tracking-wide uppercase m-0">
                {filtroSeleccionado || 'Seleccione ambiente'}
              </h2> */}
              <button 
                onClick={() => setModalAbierto(true)}
                className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs hover:bg-green-800 transition-all cursor-pointer"
              >
                <BiIcons.BiPlusCircle className="text-lg" />
                <span>Agendar ambiente</span>
              </button>
            </div>
          ) : (
            <h2 className="text-lg font-bold text-green-700 tracking-wide uppercase m-0 text-right">
              Ficha: {filtroSeleccionado}
            </h2>
          )}

        </div>

        {/* Contenedor del Calendario */}
        <div className="w-full bg-white p-4 rounded-xl shadow-xs border border-gray-100">
          <div className="flex justify-between items-center mb-5 max-w-sm mx-auto">
            <button onClick={() => cambiarMes('atras')} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"><FiIcons.FiChevronLeft /></button>
            <h2 className="text-lg font-bold text-gray-700 tracking-wide uppercase m-0 capitalize">{nombreMes} {anoActual}</h2>
            <button onClick={() => cambiarMes('adelante')} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"><FiIcons.FiChevronRight /></button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-gray-400 uppercase tracking-wider mb-2">
            <div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div><div>Dom</div>
          </div>
          
          <div className="grid grid-cols-7 gap-1 bg-gray-200 p-0.5 rounded-md">
            {matrizCeldas.map((celda, index) => (
              <CeldaDia 
                key={index} 
                numero={celda.numero} 
                esMesActual={celda.esMesActual} 
                horarios={celda.horarios || []} 
                onSeleccionarTarjeta={(tarjeta) => setDetalleSeleccionado({ ...tarjeta, dia: celda.numero, mesText: nombreMes })}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Panel lateral flotante de detalles */}
      {detalleSeleccionado && (
        <div className="w-80 bg-white border border-gray-200 rounded-xl p-5 shadow-2xl flex flex-col gap-5 sticky top-0 h-[580px] flex-shrink-0">
          
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-green-700 uppercase tracking-wide m-0">
              Detalle de Programación
            </h3>
            <button 
              onClick={() => setDetalleSeleccionado(null)} 
              className="text-gray-400 hover:text-red-500 transition-colors text-lg cursor-pointer bg-transparent border-none flex items-center justify-center"
            >
              <MdIcons.MdClose />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider m-0">
              Agenda del mes
            </h4>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col gap-1.5 text-xs text-gray-700">
              <div><span className="font-semibold text-gray-500">Fecha seleccionada:</span> {detalleSeleccionado.dia} de {detalleSeleccionado.mesText}</div>
              <div><span className="font-semibold text-gray-500">Ambiente:</span> {detalleSeleccionado.ambiente}</div>
              <div><span className="font-semibold text-gray-500">Jornada:</span> {detalleSeleccionado.jornada}</div>
              <div><span className="font-semibold text-gray-500">Horario:</span> {detalleSeleccionado.hora}</div>
              <div><span className="font-semibold text-gray-500">Ficha:</span> {detalleSeleccionado.ficha}</div>
              <div><span className="font-semibold text-gray-500">Instructor:</span> {detalleSeleccionado.instructor}</div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider m-0">
              Información de la Ficha
            </h4>
            <div className="bg-green-50/40 p-3 rounded-lg border border-green-100/50 flex flex-col gap-1.5 text-xs text-gray-700">
              <div><span className="font-semibold text-green-800">Nivel:</span> {detalleSeleccionado.nivel}</div>
              <div><span className="font-semibold text-green-800">Formación:</span> {detalleSeleccionado.programa}</div>
              <div><span className="font-semibold text-green-800">Instructor Líder:</span> {detalleSeleccionado.lider}</div>
              <div><span className="font-semibold text-green-800">Fin Lectiva:</span> {detalleSeleccionado.finLectiva}</div>
              <div><span className="font-semibold text-green-800">Coordinación:</span> {detalleSeleccionado.coordinacion}</div>
              <div><span className="font-semibold text-green-800">Aprendices:</span> {detalleSeleccionado.aprendices} inscritos</div>
            </div>
          </div>

          <div className="mt-auto text-[10px] text-gray-400 font-light text-center italic border-t border-gray-100 pt-2">
            AmbiGest • Sistema de Control Institucional
          </div>
        </div>
      )}

      {/* Modal para agendar ambiente */}
      {modalAbierto && (
        <ModalAgendarAmbiente
          ambienteInicial={filtroSeleccionado}
          onGuardar={guardarNuevaAsignacion}
          onCancelar={() => setModalAbierto(false)}
        />
      )}

    </div>
  );
}

export default Agenda;