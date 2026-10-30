import React, { useState, useEffect } from 'react'; // Hooks de React
import { ambientesApi, instructoresApi } from '../services/api'; // conexion con el backend

// Horas sugeridas para el fin de semana (no tiene horas fijas en la base de datos)
const HORAS_FDS = { inicio: '06:00', fin: '18:00' };

const inputBase =
  'w-full bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-800';

// Fila etiqueta + campo
function Campo({ etiqueta, htmlFor, children }) { // representa todo lo que se coloque dentro de las etiquetas del componente
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="w-1/3 font-medium text-gray-700" htmlFor={htmlFor}>{etiqueta}</label>
      <div className="w-2/3">{children}</div>
    </div>
  );
}

// Dado un ambiente, devuelve la jornada elegida y sus horas sugeridas.
// Solo se ofrecen las jornadas en las que ese ambiente está habilitado (tabla jornada_ambiente).
function valoresDeJornada(ambiente, preferida) {
  const lista = ambiente?.programacion ?? []; //ambiente con el ? evita que la app se caiga si ambientes es null o vacio
  // ?? [] operador cohesión nula: si lo anterior (ambiente?.programacion) es null o undefined entonces usa un arreglo vacio [] por defecto
  const j = lista.find((p) => p.jornada === preferida) ?? lista[0]; // busca al primer objeto cuya jornada coincida con preferida, si no toma la primera [0] disponible para ese ambiente
  if (!j) return { jornada: '', horaInicio: '', horaFin: '' }; // si esta vacio devuelve un objeto con campos vacios
  return {
    jornada: j.jornada,
    horaInicio: j.horaInicio || HORAS_FDS.inicio,
    horaFin: j.horaFin || HORAS_FDS.fin,
  };
}

// Si llega "agendaInicial", el formulario funciona en modo EDICIÓN con los datos de esa agenda
function ModalAgendarAmbiente({ ambienteInicial = '', agendaInicial = null, onGuardar, onCancelar }) {
  //ambienteInicial recibe el id del ambiente en el que estabamos parados
  //agendaInicial, si es null es para crear una agenda nueva, si viene con datos es modo edición
  const [form, setForm] = useState({ //usamos el hook de react useState para datos que cambian en pantalla. El objeto form guardara el valor de todos los campos del formulario
    ambiente: ambienteInicial,
    jornada: '', //el codigo se encarga
    horaInicio: '', // de llenarlos automaticamente
    horaFin: '', // segun el ambiente elegido
    ficha: agendaInicial && agendaInicial.ficha !== '—' ? agendaInicial.ficha : '',
    // ya existia la agenda y tenia una ficha asociada? si si usa ese numero para llenar el campo ficha si no lo deja en blanco
    instructor: agendaInicial?.instructorId ? String(agendaInicial.instructorId) : '',
    // agendaInicial tiene un instructor.id? si si lo convierte a texto (los select solo manejan texto) sino lo deja vacio
    fechaInicio: agendaInicial?.fechaInicio ?? new Date().toISOString().slice(0, 10),
    //si agendaInicial existe usa esa fecha ?? si lo de la derecha no sirve usa lo de la izquierda(fecha de hoy)
    fechaFin: agendaInicial?.fechaFin ?? '',
  });

  const [error, setError] = useState('');
  const [ambientes, setAmbientes] = useState([]); // inicia como un arreglo vacio aqui guardaremos la lista
  const [instructores, setInstructores] = useState([]); // de ambien./instruc. para mostrarlos en el menu desplegable

  // Ambientes e instructores reales desde la base de datos
  useEffect(() => {
    ambientesApi.listar()//funcion que hace una peticion HTTP al backend para traer todos los ambientes
      .then((lista) => {//guarda en lista la respuesta del backend
        const esElDeLaAgenda = (a) => agendaInicial && parseInt(a.id, 10) === parseInt(agendaInicial.ambienteId, 10);
        // Solo se puede agendar en ambientes en buenas condiciones (no en mantenimiento);
        // al editar también se incluye el ambiente de la agenda
        const activos = lista.filter((a) => a.estado === 'Activo' || esElDeLaAgenda(a));
        //toma en cuenta solo los de estado activos o tambien el de la agenda para incluir a un ambiente que pueda estar en mantenimiento pero q tenia una agenda
        setAmbientes(activos);
        const elegido = agendaInicial //si estamos editando
          ? activos.find(esElDeLaAgenda) //busca el ambiente que coincida con la agenda
          : (activos.find((a) => a.id === ambienteInicial) ?? activos[0]); // sino busca el ambiente en el que estamos parados y si no elige el primer ambiente en lista
        setForm((prev) => ({
          ...prev, //toma una copia de los valores anteriores y l einyecta los nuevos al formulario
          ambiente: elegido?.id ?? '', //asigna el id del ambiente que elegimos sino lo deja vacio
          ...valoresDeJornada(elegido, agendaInicial?.jornada ?? prev.jornada),
          // Al editar se conservan las horas guardadas en la agenda
          // lama la funcion que calcula las jornadas para ese ambiente expandiendo ese objeto dentro del formulario
          ...(agendaInicial
            ? { horaInicio: agendaInicial.horaInicio.slice(0, 5), horaFin: agendaInicial.horaFin.slice(0, 5) }
            : {}), //si existe la agenda (modo edicion) toma las horas que tenia
        }));
      })
      .catch((e) => setError(e.message));
    instructoresApi.listar()
      .then((lista) => setInstructores(lista.filter((i) => i.estado === 'Activo')))
      .catch((e) => setError(e.message)); // toma los posibles errores con el servidor o en la base de datos y los muestra
  }, [ambienteInicial, agendaInicial]);

  const ambienteActual = ambientes.find((a) => a.id === form.ambiente);//busca dentro de los ambientes  aquel cuyo id coincida 
  const jornadasDelAmbiente = ambienteActual?.programacion ?? []; //jornadas del ambiente
  const esFinDeSemana = form.jornada === 'FDS'; //true si la jornada es fin de semana

  function cambiar(e) { //cada vez q se escribe o selecciona en un campo
    const { name, value } = e.target;//extra las propiedades name, value del elemento HTML que disparó el evento
    setError('');//limpiar el error, ya que el usuario esta cambiando eso
    if (name === 'ambiente') {//si cmabia de ambiente
      // Al cambiar de ambiente se ajustan la jornada y las horas a las que ese ambiente tiene habilitadas
      const nuevo = ambientes.find((a) => a.id === value);
      setForm({ ...form, ambiente: value, ...valoresDeJornada(nuevo, form.jornada) });
    } else if (name === 'jornada') {//si cambia la jornada
      setForm({ ...form, ...valoresDeJornada(ambienteActual, value) });
    } else {//para cualquier otro campo
      setForm({ ...form, [name]: value });
    }
  }
  // asyc y wait permiten realizar un aoperacion asincrona(como guardar en l abase de datos y esperar que el servidor responda)
  async function enviar(e) {
    e.preventDefault();//evita que se recargue completamente la pagina al enviar el formulario

    if (!form.ficha.trim() || !form.fechaInicio || !form.fechaFin || !form.ambiente) {
      setError('Por favor completa la ficha y las fechas requeridas.');
      return;
    }
    if (!form.jornada) {
      setError('Este ambiente no tiene jornadas habilitadas. Edítalo en la pantalla de Ambientes.');
      return;
    }
    if (!form.instructor) {
      setError('Selecciona el instructor.');
      return;
    }
    if (!form.horaInicio || !form.horaFin) {
      setError('Indica la hora de inicio y la hora de fin.');
      return;
    }
    if (form.fechaFin < form.fechaInicio) {
      setError('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    // La página que abrió el modal guarda en la BD (sp_registrar_agenda); si falla, devuelve el mensaje
    const mensaje = await onGuardar({//llama a la funcion onGuardar
      ambienteId: form.ambiente, //envia un objeto limpio con todos los datos recolectados
      instructorId: form.instructor, //al componente padre, que es el encargo de ejecutar
      ficha: form.ficha.trim(), //la peticion HTTP (post, put) hacia el backend y disparar el proceso
      jornada: form.jornada, // almacenado en MySQL (sp_registrar_agenda)
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      horaInicio: form.horaInicio,
      horaFin: form.horaFin,
    });
    if (mensaje) setError(mensaje);//si el servidor responde con un mensaje de error esta variable lo atrapa y muestra
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-[#FAF8F5] border border-gray-200 rounded-2xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          {agendaInicial ? 'Editar agenda' : 'Agendar ambiente'}
        </h2>

        <form onSubmit={enviar} className="flex flex-col gap-4 text-sm text-gray-700">

          <Campo etiqueta="Ambiente:" htmlFor="ambiente">
            <select id="ambiente" name="ambiente" value={form.ambiente} onChange={cambiar} className={`${inputBase} cursor-pointer`}>
              {ambientes.map((a) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Jornada:" htmlFor="jornada">
            <select id="jornada" name="jornada" value={form.jornada} onChange={cambiar} className={`${inputBase} cursor-pointer`}>
              {jornadasDelAmbiente.length === 0 && <option value="">Sin jornadas habilitadas</option>}
              {jornadasDelAmbiente.map((p) => (
                <option key={p.jornada} value={p.jornada}>
                  {p.jornada === 'FDS' ? 'Fin de semana (sábado y domingo)' : p.jornada}
                </option>
              ))}
            </select>
            {form.jornada && (
              <p className="text-[10px] text-gray-400 mt-1 m-0">
                {esFinDeSemana
                  ? 'Se agenda los sábados y domingos entre las fechas elegidas.'
                  : 'Se agenda de lunes a viernes entre las fechas elegidas.'}
              </p>
            )}
          </Campo>

          <Campo etiqueta="Horario:" htmlFor="horaInicio">
            <div className="flex items-center gap-2">
              <input id="horaInicio" name="horaInicio" type="time" value={form.horaInicio} onChange={cambiar} required className={inputBase} />
              <span className="text-xs text-gray-500">a</span>
              <input id="horaFin" name="horaFin" type="time" value={form.horaFin} onChange={cambiar} required className={inputBase} />
            </div>
          </Campo>

          <Campo etiqueta="Ficha:" htmlFor="ficha">
            <input id="ficha" name="ficha" type="text" maxLength={10} value={form.ficha} onChange={cambiar}
              placeholder="Número de ficha" required className={inputBase} />
          </Campo>

          <Campo etiqueta="Instructor programado:" htmlFor="instructor">
            <select id="instructor" name="instructor" value={form.instructor} onChange={cambiar} required className={`${inputBase} cursor-pointer`}>
              <option value="">Seleccione un instructor</option>
              {instructores.map((i) => (
                <option key={i.id} value={String(i.id)}>{i.nombre} {i.apellido}</option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Fecha de inicio:" htmlFor="fechaInicio">
            <input id="fechaInicio" name="fechaInicio" type="date" value={form.fechaInicio} onChange={cambiar} required className={`${inputBase} cursor-pointer`} />
          </Campo>

          <Campo etiqueta="Fecha de fin:" htmlFor="fechaFin">
            <input id="fechaFin" name="fechaFin" type="date" value={form.fechaFin} onChange={cambiar} required className={`${inputBase} cursor-pointer`} />
          </Campo>

          {error && (
            <p className="text-red-500 text-xs font-semibold mt-1 text-center bg-red-50 border border-red-200 py-1.5 rounded-lg w-full">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <button type="button" onClick={onCancelar}
              className="bg-[#ED7864] text-white px-5 py-1.5 rounded-lg font-medium hover:bg-red-500 transition-colors shadow-xs cursor-pointer text-xs">
              Cancelar
            </button>
            <button type="submit"
              className="bg-[#2F9348] text-white px-5 py-1.5 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-xs cursor-pointer text-xs">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ModalAgendarAmbiente;