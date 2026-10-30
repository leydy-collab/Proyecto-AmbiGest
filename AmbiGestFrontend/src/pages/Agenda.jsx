import React, { useState, useEffect, useRef } from 'react';//useRef sirve para guardar un valor que persiste toda la vida del componente
import * as FiIcons from 'react-icons/fi';
import * as BiIcons from 'react-icons/bi';
import * as MdIcons from 'react-icons/md';
import { CeldaDia } from '../components/BloqueHorario';
import ModalAgendarAmbiente from '../components/ModalAgendarAmbiente';
import ErrorCarga from '../components/ErrorCarga';
import { agendaApi, ambientesApi } from '../services/api';

// Fecha local en texto 'AAAA-MM-DD' (sin desfase de zona horaria)
const textoFecha = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
//funcion pura que toma un objeto de js (new Date()) y lo convierte en un texto plano estadar formato "AAAA-MM-DD asegurando que no haya problemas por zona horaria"

function Agenda({ rol = 'administrador', usuario }) {//usuario es un objeto que trae todos los datos del usuario
  // Estado para el filtro: para 'administrador' es el Ambiente, para 'instructor' es la Ficha
  // Administrador: id del ambiente | Instructor: número de ficha (se llena al cargar los datos)
  const [filtroSeleccionado, setFiltroSeleccionado] = useState('');

  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);//guarda el detalle de la tarjeta en la que hizo click el usuario para mostrarla en el panel derecho
  const [modalAbierto, setModalAbierto] = useState(false);
  const [agendaEnEdicion, setAgendaEnEdicion] = useState(null); // null = agendar una nueva

  const [anoActual, setAnoActual] = useState(new Date().getFullYear());//inicializa el año actual del sistema operativo
  const [mesActual, setMesActual] = useState(new Date().getMonth()); // 0 = Enero ... 11 = Diciembre

  // Agendas desde la base de datos
  const [listaAsignaciones, setListaAsignaciones] = useState([]);//toda la lista de asignaciones/agendas
  const [ambientes, setAmbientes] = useState([]);//ambientes disponibles para llenar el menu desplegable del admin
  const [errorCarga, setErrorCarga] = useState('');//captura cualquier mensaje de error

  const [cargado, setCargado] = useState(false); // ya terminó la primera carga desde la base de datos
  const yaPosicionado = useRef(false);//posicionar la agenda una sola vez al cargar la pagina sin andar renderizando la pantalla

  // Al entrar por primera vez, elige una agenda para mostrar y lleva el calendario a su mes:
  // la que está vigente hoy; si no hay, la próxima; y si tampoco, la más reciente.
  // Así las agendas guardadas se ven sin tener que buscar el ambiente y el mes a mano.
  const posicionarEnAgendaRelevante = (agendas) => {//agendas es la lista completa de asignaciones de la base de datos
    if (yaPosicionado.current || agendas.length === 0) return null;
    yaPosicionado.current = true;
    const hoy = textoFecha(new Date());
    const vigente = agendas.find((a) => a.fechaInicio <= hoy && hoy <= a.fechaFin);
    const proxima = agendas
      .filter((a) => a.fechaInicio > hoy)
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))[0];//localCompare compara las siguientes agendas cronologicamnete de la mas cercana a la mas lejana
    const ultima = [...agendas].sort((a, b) => b.fechaFin.localeCompare(a.fechaFin))[0];
    const elegida = vigente ?? proxima ?? ultima;
    const referencia = vigente ? hoy : proxima ? proxima.fechaInicio : ultima.fechaFin;
    const [ano, mes] = referencia.split('-').map(Number);
    setAnoActual(ano);
    setMesActual(mes - 1);//-1 porque los meses en js van de 0 a 11
    return elegida;
  };

  const cargar = async () => {//espera a q el servidor responda antes de continuar con el codigo
    try {
      if (rol === 'administrador') {
        const [asignaciones, ambs] = await Promise.all([agendaApi.listar(), ambientesApi.listar()]);//promise all carga agendas y ambientes al mismo tiempo
        setListaAsignaciones(asignaciones);//guarda la lista completa de agendas en el estado del componente
        setAmbientes(ambs);//guarda la lista de ambientes disponibles para llenar el filtrado de ambientes
        const elegida = posicionarEnAgendaRelevante(asignaciones);//usa el posicionamiento de la funcion anterior
        const ambDeLaAgenda = elegida && ambs.find((a) => parseInt(a.id, 10) === parseInt(elegida.ambienteId, 10));//busca el ambiente de la agenda elegida
        setFiltroSeleccionado((actual) => actual || ambDeLaAgenda?.id || (ambs[0]?.id ?? ''));
        //actual representa lo que ya hbaia en el filtro en ese momento, sino elige el ambiente de la agenda seleccionada sino el primer ambiente de la lista
      } else {
        // El instructor solo ve sus propias agendas
        const asignaciones = await agendaApi.listar(usuario?.id);
        setListaAsignaciones(asignaciones);
        const elegida = posicionarEnAgendaRelevante(asignaciones);
        setFiltroSeleccionado((actual) => actual || elegida?.ficha || (asignaciones[0]?.ficha ?? ''));
      }
      setErrorCarga('');
    } catch (e) {
      setErrorCarga(e.message);
    }
    setCargado(true);//independientemente de si cargo o fallo, esto avisa q el proceso se realizo, ya se para cargar los datos o quitar el spinner
  };

  //use effect se usa para efectos secundarios: peticiones a la api o cargar datos cuando un cmponente aparece en pantalla
  useEffect(() => { cargar(); }, [rol, usuario?.id]);//rol, le dice vuelve a ejecutar cargar() si el rol cambia

  // ¿Esta agenda corresponde al ambiente (administrador) o a la ficha (instructor) elegidos?
  //cuando el calendario va a dibujar las agendas pregunta a esta funcion si la agenda debe mostrarse o no segun lo que el usuario eligio en el filtro
  const coincideConFiltro = (asignacion) =>//ya que solo se puede mostrar la agenda de un ambiente/ficha a la vez
    rol === 'administrador'
      ? parseInt(asignacion.ambienteId, 10) === parseInt(filtroSeleccionado, 10)//el calendario filtra solo las agendas
      : asignacion.ficha.trim() === String(filtroSeleccionado).trim();//que le corresponden al usuario

  // MOTOR DE FILTRADO SEGÚN EL ROL
  const obtenerHorariosParaFecha = (fechaTexto) => {
    const horariosDelDia = [];//los horarios en cada casilla de día

    listaAsignaciones.forEach(asignacion => {
      // Si es Admin, filtra por coincidencia de AMBIENTE.
      // Si es Instructor, filtra por coincidencia de FICHA.
      const coincideFiltro = coincideConFiltro(asignacion);

      const enRango = fechaTexto >= asignacion.fechaInicio && fechaTexto <= asignacion.fechaFin;
      //comprueba que la casilla del día este dentro del rango de la agenda
      const [ano, mes, dia] = fechaTexto.split('-');
      const fechaObj = new Date(ano, mes - 1, dia);
      const diaSemana = fechaObj.getDay();
                                    // verifica que aparte de q este en el rango de fechas, diaSemana se encuentre en el arrglo de los dias de la agenda
      if (coincideFiltro && enRango && asignacion.diasSemana.includes(diaSemana)) {
        horariosDelDia.push(asignacion);//si la asignacion pasa los filtros se añade a, arreglo del dia
      }
    });

    // Las tarjetas del día se ordenan por hora de inicio (mañana, tarde, noche)
    return horariosDelDia.sort((a, b) => String(a.horaInicio).localeCompare(String(b.horaInicio)));
  };

  // Generador de grilla del calendario
  const obtenerDiasCalendario = () => {
    //objetos de fecha
    const primerDiaMes = new Date(anoActual, mesActual, 1);
    const ultimoDiaMes = new Date(anoActual, mesActual + 1, 0);//truco que retrocede al ultimo día del mes actual, pero es un objeto fecha
    const totalDias = ultimoDiaMes.getDate();//aqui extra de ese objeto el numero total de dias

    let diaSemanaInicial = primerDiaMes.getDay();//para las columnas del calendario
    diaSemanaInicial = diaSemanaInicial === 0 ? 6 : diaSemanaInicial - 1;//reordena los dias de la semana, en el sena el primer dia no seria domingo sino lunes

    const celdas = [];//arreglo de las 42 casillas del calendario

    // Mes anterior
    const ultimoDiaMesAnterior = new Date(anoActual, mesActual, 0).getDate();
    for (let i = 0; i < diaSemanaInicial; i++) {
      const numDiaAnterior = ultimoDiaMesAnterior - (diaSemanaInicial - 1 - i);
      celdas.push({ numero: numDiaAnterior, esMesActual: false, fechaTexto: null, horarios: [] });
    }

    // Mes actual
    for (let d = 1; d <= totalDias; d++) {
      const mesFormateado = String(mesActual + 1).padStart(2, '0');//transforma los meses para ya no inicien en 0 sumando 1, y los convierte a texto de minimo 2 caracteres rellenando si es el caso con 0
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

  // Para avisar cuando el mes que se está viendo no tiene agendas pero el ambiente sí tiene en otros meses
  const agendasDelFiltro = listaAsignaciones.filter(coincideConFiltro);
  const hayAgendasEnElMes = matrizCeldas.some((c) => c.esMesActual && c.horarios.length > 0);

  const irAAgendaCercana = () => {
    const inicioMes = `${anoActual}-${String(mesActual + 1).padStart(2, '0')}-01`;
    const ordenadas = [...agendasDelFiltro].sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
    const proxima = ordenadas.find((a) => a.fechaInicio >= inicioMes);
    const referencia = proxima ? proxima.fechaInicio : ordenadas[ordenadas.length - 1].fechaFin;
    const [ano, mes] = referencia.split('-').map(Number);
    setAnoActual(ano);
    setMesActual(mes - 1);
    setDetalleSeleccionado(null);
  };

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
      // Si hay una agenda en edición se actualiza; si no, se crea una nueva
      if (agendaEnEdicion) await agendaApi.editar(agendaEnEdicion.id, datos);
      else await agendaApi.crear(datos);
      await cargar();
      setModalAbierto(false);
      setAgendaEnEdicion(null);
      // Lleva el calendario al mes donde empieza la agenda nueva, para que se vea de inmediato
      const [anoNuevo, mesNuevo] = datos.fechaInicio.split('-').map(Number);
      setAnoActual(anoNuevo);
      setMesActual(mesNuevo - 1);
      setDetalleSeleccionado(null);
      if (rol === 'administrador') {
        setFiltroSeleccionado(datos.ambienteId);
      }
    } catch (e) {
      return e.message;
    }
  };

  // '2026-11-05' -> '05/11/2026'
  const formatoFecha = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

  // Abre el formulario con los datos de la agenda seleccionada
  const editarAgenda = () => {
    setAgendaEnEdicion(detalleSeleccionado);
    setModalAbierto(true);
  };

  // Elimina la agenda seleccionada (afecta TODO su rango de fechas, no solo el día que se tocó)
  const eliminarAgenda = async () => {
    const a = detalleSeleccionado;
    const confirmar = window.confirm(
      `¿Eliminar la agenda de la ficha ${a.ficha} en ${a.ambiente} (${a.jornada})?\n` +
      `Se eliminará del ${formatoFecha(a.fechaInicio)} al ${formatoFecha(a.fechaFin)}, no solo de este día.`
    );
    if (!confirmar) return;
    try {
      await agendaApi.eliminar(a.id);
      setDetalleSeleccionado(null);
      await cargar();
    } catch (e) {
      setErrorCarga(e.message);
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
                onClick={() => { setAgendaEnEdicion(null); setModalAbierto(true); }}
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

        {/* Aviso cuando el mes que se ve no tiene agendas */}
        {cargado && !errorCarga && filtroSeleccionado !== '' && !hayAgendasEnElMes && (
          <div className="w-full flex flex-wrap items-center justify-between gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2.5 rounded-lg">
            {agendasDelFiltro.length === 0 ? (
              <span>
                {rol === 'administrador' ? 'Este ambiente todavía no tiene agendas.' : 'Esta ficha todavía no tiene agendas.'}
              </span>
            ) : (
              <>
                <span>No hay agendas en este mes. Hay {agendasDelFiltro.length} guardada(s) en otros meses.</span>
                <button
                  onClick={irAAgendaCercana}
                  className="bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold px-3 py-1 rounded-md transition-all cursor-pointer"
                >
                  Ir a la más cercana
                </button>
              </>
            )}
          </div>
        )}

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
              <div><span className="font-semibold text-gray-500">Vigencia:</span> {formatoFecha(detalleSeleccionado.fechaInicio)} al {formatoFecha(detalleSeleccionado.fechaFin)}</div>
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

          {/* Solo el administrador puede editar o eliminar agendas */}
          {rol === 'administrador' && (
            <div className="mt-auto flex gap-2">
              <button
                onClick={editarAgenda}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#FDE28A] border border-amber-300 text-gray-800 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-300 transition-all cursor-pointer"
              >
                <MdIcons.MdEdit /> Editar
              </button>
              <button
                onClick={eliminarAgenda}
                className="flex-1 flex items-center justify-center gap-1.5 bg-[#F2786D] border border-red-300 text-white py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500 transition-all cursor-pointer"
              >
                <MdIcons.MdDelete /> Eliminar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal para agendar ambiente */}
      {modalAbierto && (
        <ModalAgendarAmbiente
          ambienteInicial={filtroSeleccionado}
          agendaInicial={agendaEnEdicion}
          onGuardar={guardarNuevaAsignacion}
          onCancelar={() => { setModalAbierto(false); setAgendaEnEdicion(null); }}
        />
      )}

    </div>
  );
}

export default Agenda;