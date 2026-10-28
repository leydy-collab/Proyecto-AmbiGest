import React, { useState, useEffect } from 'react';
import { ambientesApi, instructoresApi } from '../services/api';


function ModalAgendarAmbiente({ ambienteInicial = '', onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    ambiente: ambienteInicial,
    jornada: 'Mañana',
    hora: '6:00 am - 12:00 pm',
    ficha: '',
    instructor: '',
    fechaInicio: new Date().toISOString().slice(0, 10),
    fechaFin: '',
    modalidad: 'Lunes a viernes',
    nivel: 'Tecnólogo',
    programa: 'Análisis y Desarrollo de Software',
    lider: 'Mario Velasco',
    coordinacion: 'Darwin Celis',
    aprendices: '25',
    color: 'rojo'
  });

 
  const [error, setError] = useState('');
  const [ambientes, setAmbientes] = useState([]);
  const [instructores, setInstructores] = useState([]);
  // Ambientes e instructores reales desde la base de datos
  useEffect(() => {
    ambientesApi.listar()
      .then((lista) => {
        setAmbientes(lista);
        setForm((prev) => ({ ...prev, ambiente: ambienteInicial || prev.ambiente || (lista[0]?.id ?? '') }));
      })
      .catch((e) => setError(e.message));
    instructoresApi.listar()
      .then((lista) => setInstructores(lista.filter((i) => i.estado === 'Activo')))
      .catch((e) => setError(e.message));
  }, [ambienteInicial]);

  function cambiar(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError('');
  }

  async function enviar(e) {
    e.preventDefault();

    if (!form.ficha.trim() || !form.fechaInicio || !form.fechaFin || !form.ambiente) {
      setError('Por favor completa la ficha y las fechas requeridas.');
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

    // La página que abrió el modal guarda en la BD; si falla, devuelve el mensaje
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
          Agendar ambiente
        </h2>

        <form onSubmit={enviar} className="flex flex-col gap-4 text-sm text-gray-700">
          
          {/* Selección de Ambiente Dinámica */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="ambiente">Ambiente:</label>
            <div className="w-2/3">
              <select 
                id="ambiente" 
                name="ambiente" 
                value={form.ambiente} 
                onChange={cambiar}
                className="w-full bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-700 cursor-pointer"
              >
                {ambientes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Demás campos del formulario */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="jornada">Jornada:</label>
            <div className="w-2/3">
              <select 
                id="jornada" 
                name="jornada" 
                value={form.jornada} 
                onChange={cambiar}
                className="w-full bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-700 cursor-pointer"
              >
                <option value="Mañana">Mañana</option>
                <option value="Tarde">Tarde</option>
                <option value="Noche">Noche</option>
                <option value="Sabatina">Sabatina</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="horaInicio">Horario:</label>
            <div className="w-2/3">
              <div className="flex items-center gap-2">
                <input
                  id="horaInicio"
                  name="horaInicio"
                  type="time"
                  value={form.horaInicio}
                  onChange={cambiar}
                  required
                  className="bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 w-full text-xs text-gray-800"
                />
                <span className="text-xs text-gray-500">a</span>
                <input
                  id="horaFin"
                  name="horaFin"
                  type="time"
                  value={form.horaFin}
                  onChange={cambiar}
                  required
                  className="bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 w-full text-xs text-gray-800"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="ficha">Ficha:</label>
            <div className="w-2/3">
              <input
                id="ficha"
                name="ficha"
                type="text"
                maxLength={10}
                value={form.ficha}
                onChange={cambiar}
                placeholder="Número de ficha"
                required
                className="bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 w-full text-xs text-gray-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="instructor">Instructor programado:</label>
            <div className="w-2/3">
              <select
                id="instructor"
                name="instructor"
                value={form.instructor}
                onChange={cambiar}
                required
                className="w-full bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-700 cursor-pointer"
              >
                <option value="">Seleccione un instructor</option>
                {instructores.map((i) => (
                  <option key={i.id} value={String(i.id)}>{i.nombre} {i.apellido}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="fechaInicio">Fecha de inicio:</label>
            <div className="w-2/3">
              <input
                id="fechaInicio"
                name="fechaInicio"
                type="date"
                value={form.fechaInicio}
                onChange={cambiar}
                required
                className="bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 w-full text-xs text-gray-800 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="fechaFin">Fecha de fin:</label>
            <div className="w-2/3">
              <input
                id="fechaFin"
                name="fechaFin"
                type="date"
                value={form.fechaFin}
                onChange={cambiar}
                required
                className="bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 w-full text-xs text-gray-800 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="modalidad">Modalidad:</label>
            <div className="w-2/3">
              <select
                id="modalidad"
                name="modalidad"
                value={form.modalidad}
                onChange={cambiar}
                className="w-full bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-700 cursor-pointer"
              >
                <option value="Lunes a viernes">Lunes a viernes</option>
                <option value="Fines de semana">Fines de semana</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-xs font-semibold mt-1 text-center bg-red-50 border border-red-200 py-1.5 rounded-lg w-full">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onCancelar}
              className="bg-[#ED7864] text-white px-5 py-1.5 rounded-lg font-medium hover:bg-red-500 transition-colors shadow-xs cursor-pointer text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#2F9348] text-white px-5 py-1.5 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-xs cursor-pointer text-xs"
            >
              Guardar
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default ModalAgendarAmbiente;