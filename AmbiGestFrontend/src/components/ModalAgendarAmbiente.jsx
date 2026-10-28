import React, { useState, useEffect } from 'react';
import { ambientesApi, instructoresApi } from '../services/api';

// Horas sugeridas para el fin de semana (la jornada FDS no tiene horas fijas en la base de datos)
const HORAS_FDS = { inicio: '06:00', fin: '18:00' };

const inputBase =
  'w-full bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-800';

// Fila etiqueta + campo
function Campo({ etiqueta, htmlFor, children }) {
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
  const lista = ambiente?.programacion ?? [];
  const j = lista.find((p) => p.jornada === preferida) ?? lista[0];
  if (!j) return { jornada: '', horaInicio: '', horaFin: '' };
  return {
    jornada: j.jornada,
    horaInicio: j.horaInicio || HORAS_FDS.inicio,
    horaFin: j.horaFin || HORAS_FDS.fin,
  };
}

// Si llega "agendaInicial", el formulario funciona en modo EDICIÓN con los datos de esa agenda
function ModalAgendarAmbiente({ ambienteInicial = '', agendaInicial = null, onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    ambiente: ambienteInicial,
    jornada: '',
    horaInicio: '',
    horaFin: '',
    ficha: agendaInicial && agendaInicial.ficha !== '—' ? agendaInicial.ficha : '',
    instructor: agendaInicial?.instructorId ? String(agendaInicial.instructorId) : '',
    fechaInicio: agendaInicial?.fechaInicio ?? new Date().toISOString().slice(0, 10),
    fechaFin: agendaInicial?.fechaFin ?? '',
  });

  const [error, setError] = useState('');
  const [ambientes, setAmbientes] = useState([]);
  const [instructores, setInstructores] = useState([]);

  // Ambientes e instructores reales desde la base de datos
  useEffect(() => {
    ambientesApi.listar()
      .then((lista) => {
        const esElDeLaAgenda = (a) => agendaInicial && parseInt(a.id, 10) === parseInt(agendaInicial.ambienteId, 10);
        // Solo se puede agendar en ambientes en buenas condiciones (no en mantenimiento);
        // al editar también se incluye el ambiente de la agenda
        const activos = lista.filter((a) => a.estado === 'Activo' || esElDeLaAgenda(a));
        setAmbientes(activos);
        const elegido = agendaInicial
          ? activos.find(esElDeLaAgenda)
          : (activos.find((a) => a.id === ambienteInicial) ?? activos[0]);
        setForm((prev) => ({
          ...prev,
          ambiente: elegido?.id ?? '',
          ...valoresDeJornada(elegido, agendaInicial?.jornada ?? prev.jornada),
          // Al editar se conservan las horas guardadas en la agenda
          ...(agendaInicial
            ? { horaInicio: agendaInicial.horaInicio.slice(0, 5), horaFin: agendaInicial.horaFin.slice(0, 5) }
            : {}),
        }));
      })
      .catch((e) => setError(e.message));
    instructoresApi.listar()
      .then((lista) => setInstructores(lista.filter((i) => i.estado === 'Activo')))
      .catch((e) => setError(e.message));
  }, [ambienteInicial, agendaInicial]);

  const ambienteActual = ambientes.find((a) => a.id === form.ambiente);
  const jornadasDelAmbiente = ambienteActual?.programacion ?? [];
  const esFinDeSemana = form.jornada === 'FDS';

  function cambiar(e) {
    const { name, value } = e.target;
    setError('');
    if (name === 'ambiente') {
      // Al cambiar de ambiente se ajustan la jornada y las horas a las que ese ambiente tiene habilitadas
      const nuevo = ambientes.find((a) => a.id === value);
      setForm({ ...form, ambiente: value, ...valoresDeJornada(nuevo, form.jornada) });
    } else if (name === 'jornada') {
      setForm({ ...form, ...valoresDeJornada(ambienteActual, value) });
    } else {
      setForm({ ...form, [name]: value });
    }
  }

  async function enviar(e) {
    e.preventDefault();

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
    const mensaje = await onGuardar({
      ambienteId: form.ambiente,
      instructorId: form.instructor,
      ficha: form.ficha.trim(),
      jornada: form.jornada,
      fechaInicio: form.fechaInicio,
      fechaFin: form.fechaFin,
      horaInicio: form.horaInicio,
      horaFin: form.horaFin,
    });
    if (mensaje) setError(mensaje);
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