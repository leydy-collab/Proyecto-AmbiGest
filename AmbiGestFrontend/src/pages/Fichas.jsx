import React, { useState, useEffect } from 'react';
import ErrorCarga from '../components/ErrorCarga';
import { fichasApi, instructoresApi } from '../services/api';
import * as MdIcons from 'react-icons/md';
import * as FaIcons from 'react-icons/fa';

function Fichas() {
  const [listaFichas, setListaFichas] = useState([]);
  const [instructores, setInstructores] = useState([]);
  const [errorCarga, setErrorCarga] = useState('');

  // Trae fichas e instructores desde la base de datos
  const cargar = async () => {
    try {
      const [fichas, instrs] = await Promise.all([fichasApi.listar(), instructoresApi.listar()]);
      setListaFichas(fichas);
      setInstructores(instrs);
      setErrorCarga('');
    } catch (e) {
      setErrorCarga(e.message);
    }
  };

  useEffect(() => { cargar(); }, []);

  // Estados de control para el modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [errores, setErrores] = useState({});

  const valoresInicialesForm = {
    numero: '',
    nivel: 'TEC',
    programa: '',
    instructor_lider: '',
    fin_lectiva: '',
    coordinacion: 'Darwin Celis',
    aprendices: ''
  };

  const [formValues, setFormValues] = useState(valoresInicialesForm);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
    if (errores[name]) {
      setErrores(prev => ({ ...prev, [name]: null }));
    }
  };

  // Validaciones del formulario
  const validarFormulario = () => {
    const errs = {};
    const numeroLimpio = formValues.numero ? formValues.numero.trim() : '';
    const programaLimpio = formValues.programa ? formValues.programa.trim() : '';
    const instructorLimpio = formValues.instructor_lider ? formValues.instructor_lider.trim() : '';
    const finLectivaLimpio = formValues.fin_lectiva ? formValues.fin_lectiva.trim() : '';

    if (!numeroLimpio) {
      errs.numero = 'El número de ficha es requerido';
    } else if (isNaN(Number(numeroLimpio))) {
      errs.numero = 'Debe contener solo números';
    }

    if (!programaLimpio) errs.programa = 'El programa es requerido';
    if (!instructorLimpio) errs.instructor_lider = 'El instructor líder es requerido';
    if (!finLectivaLimpio) errs.fin_lectiva = 'La fecha de fin lectiva es requerida';

    const aprendicesNum = Number(formValues.aprendices);
    if (!formValues.aprendices || isNaN(aprendicesNum)) {
      errs.aprendices = 'Ingresa un número válido';
    } else if (aprendicesNum <= 0 || !Number.isInteger(aprendicesNum)) {
      errs.aprendices = 'Debe ser mayor a 0';
    }

    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const abrirRegistro = () => {
    setEditandoId(null);
    setFormValues(valoresInicialesForm);
    setErrores({});
    setModalAbierto(true);
  };

  const abrirEdicion = (fich) => {
    setEditandoId(fich.id);
    setFormValues({
      numero: fich.numero,
      nivel: fich.nivel,
      programa: fich.programa,
      instructor_lider: fich.instructor_lider_id,
      fin_lectiva: fich.fin_lectiva_iso,
      coordinacion: fich.coordinacion,
      aprendices: fich.aprendices
    });
    setErrores({});
    setModalAbierto(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const datos = {
      numero: formValues.numero.trim(),
      nivel: formValues.nivel,
      programa: formValues.programa.trim(),
      instructor_lider: formValues.instructor_lider,
      fin_lectiva: formValues.fin_lectiva,
      coordinacion: formValues.coordinacion,
      aprendices: Number(formValues.aprendices),
    };

    try {
      if (editandoId !== null) {
        await fichasApi.editar(editandoId, datos);
      } else {
        await fichasApi.crear(datos);
      }
      await cargar();
      setModalAbierto(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const eliminarFicha = async (id, numero) => {
    const confirmacion = window.confirm(`¿Estás seguro de que deseas eliminar la ficha "${numero}"?`);
    if (!confirmacion) return;
    try {
      await fichasApi.eliminar(id);
      await cargar();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn p-2 md:p-4 font-sans">
      <ErrorCarga mensaje={errorCarga} />
      
      {/* acciones superiores */}
      <div className="w-full flex justify-between items-center bg-white p-4 rounded-xl shadow-xs border border-gray-100">
        <h1 className="text-[28px] font-normal text-gray-800 leading-tight">
          Gestión de <span className="text-verde-oscuro font-bold">Fichas</span>
        </h1>
        <div className="flex items-center gap-3">
          <button 
            onClick={abrirRegistro}
            className="flex items-center gap-2 bg-verde-oscuro text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs hover:bg-[#247338] transition-all cursor-pointer"
          >
            <span className="text-white font-bold text-lg leading-none">+</span>
            <span>Registrar ficha</span>
          </button>
          <div className="bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold shadow-xs">
            Total fichas: {listaFichas.length}
          </div>
        </div>
      </div>

      {/* tabla fichas */}
      <div className="w-full bg-white rounded-xl shadow-xs border border-gray-200/60 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-gray-700">
            <thead className="bg-verde-claro border-b border-gray-200 text-gray-800">
              <tr>
                <th className="px-4 py-3 font-normal text-center w-14 border-x border-gray-100">ID</th>
                <th className="px-4 py-3 font-normal border-r border-gray-100">Ficha</th>
                <th className="px-4 py-3 font-normal w-16 border-r border-gray-100">Nivel</th>
                <th className="px-4 py-3 font-normal max-w-[200px] border-r border-gray-100">Programa</th>
                <th className="px-4 py-3 font-normal border-r border-gray-100">Instructor líder</th>
                <th className="px-4 py-3 font-normal border-r border-gray-100">Fin lectiva</th>
                <th className="px-4 py-3 font-normal border-r border-gray-100">Coordinación</th>
                <th className="px-4 py-3 font-normal text-center w-24 border-r border-gray-100">Aprendices</th>
                <th className="px-4 py-3 font-normal text-center w-28"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listaFichas.map((fich, idx) => (
                <tr key={fich.id} className="align-middle hover:bg-[#81fa8d98] transition-colors duration-300 ease-in-out">
                  <td className="px-4 py-4 text-center text-xs font-light text-gray-500 border-r border-gray-100">{String(idx + 1).padStart(3, '0')}</td>
                  <td className="px-4 py-4 text-sm font-normal text-gray-800 tracking-tight border-r border-gray-100">{fich.numero}</td>
                  <td className="px-4 py-4 text-sm font-normal text-gray-600 border-r border-gray-100">{fich.nivel}</td>
                  <td className="px-4 py-4 text-sm font-light text-gray-800 leading-tight max-w-[200px] break-words border-r border-gray-100">{fich.programa}</td>
                  <td className="px-4 py-4 text-sm font-normal text-gray-700 border-r border-gray-100">{fich.instructor_lider}</td>
                  <td className="px-4 py-4 text-sm font-light text-gray-600 border-r border-gray-100">{fich.fin_lectiva}</td>
                  <td className="px-4 py-4 text-sm font-light text-gray-600 border-r border-gray-100">{fich.coordinacion}</td>
                  <td className="px-4 py-4 text-center text-sm font-light text-gray-700 border-r border-gray-100">{fich.aprendices}</td>
                  <td className="px-4 py-4">
                    <div className="flex justify-center items-center gap-2">
                      <button 
                        onClick={() => abrirEdicion(fich)}
                        className="p-1.5 bg-[#FDE28A] border border-amber-300 rounded text-gray-800 hover:bg-amber-300 transition-colors cursor-pointer shadow-xs"
                      >
                        <MdIcons.MdEdit className="text-xs" />
                      </button>
                      <button 
                        onClick={() => eliminarFicha(fich.id, fich.numero)}
                        className="p-1.5 bg-[#F2786D] border border-red-300 rounded text-white hover:bg-red-500 transition-colors cursor-pointer shadow-xs"
                      >
                        <FaIcons.FaTrashAlt className="text-[10px]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-[#FAF8F5] border border-gray-200 rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
            
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              {editandoId !== null ? 'Editar ficha' : 'Registrar ficha'}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm text-gray-700">
              
              {/* campo número de ficha */}
              <div className="flex items-center justify-between gap-4">
                <label className="w-1/3 font-medium text-gray-700">Número Ficha:</label>
                <div className="w-2/3 flex flex-col">
                  <input
                    type="text"
                    name="numero"
                    placeholder="Ej: 2453245"
                    value={formValues.numero}
                    onChange={handleChange}
                    className={`bg-[#EAE5DE] border ${errores.numero ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-800`}
                  />
                  {errores.numero && <span className="text-red-500 text-xs mt-0.5">{errores.numero}</span>}
                </div>
              </div>

              {/* campo nivel */}
              <div className="flex items-center justify-between gap-4">
                <label className="w-1/3 font-medium text-gray-700">Nivel:</label>
                <div className="w-2/3">
                  <select
                    name="nivel"
                    value={formValues.nivel}
                    onChange={handleChange}
                    className="w-full bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-700 cursor-pointer"
                  >
                    <option value="TEC">Tecnólogo (TEC)</option>
                    <option value="TO">Técnico (TO)</option>
                    <option value="AUX">Auxiliar (AUX)</option>
                    <option value="OP">Operario (OP)</option>
                  </select>
                </div>
              </div>

              {/* campo programa */}
              <div className="flex items-center justify-between gap-4">
                <label className="w-1/3 font-medium text-gray-700">Programa:</label>
                <div className="w-2/3 flex flex-col">
                  <input
                    type="text"
                    name="programa"
                    placeholder="Ej: Análisis y desarrollo de software"
                    value={formValues.programa}
                    onChange={handleChange}
                    className={`bg-[#EAE5DE] border ${errores.programa ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-800`}
                  />
                  {errores.programa && <span className="text-red-500 text-xs mt-0.5">{errores.programa}</span>}
                </div>
              </div>

              {/* campo instructor líder */}
              <div className="flex items-center justify-between gap-4">
                <label className="w-1/3 font-medium text-gray-700">Instructor líder:</label>
                <div className="w-2/3 flex flex-col">
                  <select
                    name="instructor_lider"
                    value={formValues.instructor_lider}
                    onChange={handleChange}
                    className={`bg-[#EAE5DE] border ${errores.instructor_lider ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-800`}
                  >
                    <option value="">Seleccione un instructor</option>
                    {instructores.map((ins) => (
                      <option key={ins.id} value={String(ins.id)}>{ins.nombre} {ins.apellido}</option>
                    ))}
                  </select>
                  {errores.instructor_lider && <span className="text-red-500 text-xs mt-0.5">{errores.instructor_lider}</span>}
                </div>
              </div>

              {/* campo fin lectiva */}
              <div className="flex items-center justify-between gap-4">
                <label className="w-1/3 font-medium text-gray-700">Fin lectiva:</label>
                <div className="w-2/3 flex flex-col">
                  <input
                    type="date"
                    name="fin_lectiva"
                    value={formValues.fin_lectiva}
                    onChange={handleChange}
                    className={`bg-[#EAE5DE] border ${errores.fin_lectiva ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-800`}
                  />
                  {errores.fin_lectiva && <span className="text-red-500 text-xs mt-0.5">{errores.fin_lectiva}</span>}
                </div>
              </div>

              {/* campo coordinación */}
              <div className="flex items-center justify-between gap-4">
                <label className="w-1/3 font-medium text-gray-700">Coordinación:</label>
                <div className="w-2/3">
                  <select
                    name="coordinacion"
                    value={formValues.coordinacion}
                    onChange={handleChange}
                    className="w-full bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-700 cursor-pointer"
                  >
                    <option value="Darwin Celis">Darwin Celis</option>
                    <option value="Dinora Mantilla">Dinora Mantilla</option>
                    <option value="Productiva">Productiva</option>
                  </select>
                </div>
              </div>

              {/* campo aprendices */}
              <div className="flex items-center justify-between gap-4">
                <label className="w-1/3 font-medium text-gray-700">Aprendices:</label>
                <div className="w-2/3 flex flex-col">
                  <input
                    type="number"
                    name="aprendices"
                    placeholder="Ej: 25"
                    value={formValues.aprendices}
                    onChange={handleChange}
                    className={`bg-[#EAE5DE] border ${errores.aprendices ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-800`}
                  />
                  {errores.aprendices && <span className="text-red-500 text-xs mt-0.5">{errores.aprendices}</span>}
                </div>
              </div>

              {/* botones de acción del Modal */}
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
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
      )}

    </div>
  );  
}

export default Fichas;
