import React, { useState, useEffect } from 'react';
import * as FaIcons from 'react-icons/fa';
import * as MdIcons from 'react-icons/md';
import ModalAgendarAmbiente from '../components/ModalAgendarAmbiente';
import ErrorCarga from '../components/ErrorCarga';
import { ambientesApi, agendaApi, catalogosApi } from '../services/api';

const inputBase =
  'bg-[#EAE5DE] border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-600';

// Fila etiqueta + campo (mismo diseño de siempre, solo evita repetir el bloque)
function Fila({ etiqueta, error, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="w-1/3 font-medium text-gray-700">{etiqueta}</label>
      <div className="w-2/3 flex flex-col">
        {children}
        {error && <span className="text-red-500 text-xs mt-0.5">{error}</span>}
      </div>
    </div>
  );
}

function Ambientes() {
  const [listaAmbientes, setListaAmbientes] = useState([]);
  const [errorCarga, setErrorCarga] = useState('');

  // Trae los ambientes desde la base de datos
  const cargar = async () => {
    try {
      const datos = await ambientesApi.listar();
      setListaAmbientes(datos);
      setErrorCarga('');
    } catch (e) {
      setErrorCarga(e.message);
    }
  };

  useEffect(() => { cargar(); }, []);

  // Listas para los selectores del formulario (vienen de la base de datos)
  const [categorias, setCategorias] = useState([]);
  const [edificios, setEdificios] = useState([]);
  const [jornadas, setJornadas] = useState([]);

  const cargarCatalogos = async () => {
    try {
      const [cats, edifs, jorns] = await Promise.all([
        catalogosApi.categorias(),
        catalogosApi.edificios(),
        catalogosApi.jornadas(),
      ]);
      setCategorias(cats);
      setEdificios(edifs);
      setJornadas(jorns);
    } catch (e) {
      setErrorCarga(e.message);
    }
  };

  useEffect(() => { cargarCatalogos(); }, []);

  // Estados para modal de CRUD (Registrar / Editar Ambiente)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [errores, setErrores] = useState({});

  // 1️⃣ NUEVO ESTADO: Para controlar el modal de Agendar Ambiente desde la tabla
  const [modalAgendarAbierto, setModalAgendarAbierto] = useState(false);
  const [ambienteParaAgendar, setAmbienteParaAgendar] = useState('');

  const valoresInicialesForm = {
    nombre: '',
    categoriaId: '',
    edificioId: '',
    piso: 'Piso 1',
    capacidad: '',
    estado: 'Activo',
    jornadaIds: [],
  };

  const [formValues, setFormValues] = useState(valoresInicialesForm);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
    if (errores[name]) {
      setErrores(prev => ({ ...prev, [name]: null }));
    }
  };

  const toggleJornada = (id) => {
    setFormValues(prev => ({
      ...prev,
      jornadaIds: prev.jornadaIds.includes(id)
        ? prev.jornadaIds.filter(j => j !== id)
        : [...prev.jornadaIds, id],
    }));
  };

  const validarFormulario = () => {
    const errs = {};
    const nombreLimpio = formValues.nombre ? formValues.nombre.trim() : '';

    if (!nombreLimpio) {
      errs.nombre = 'El nombre del ambiente es requerido';
    } else if (nombreLimpio.length < 3) {
      errs.nombre = 'Debe contener al menos 3 caracteres';
    }

    if (!formValues.categoriaId) errs.categoriaId = 'La categoría es requerida';
    if (!formValues.edificioId) errs.edificioId = 'El edificio es requerido';

    const capacidadNum = Number(formValues.capacidad);
    if (!formValues.capacidad || isNaN(capacidadNum)) {
      errs.capacidad = 'Ingresa un número válido';
    } else if (capacidadNum <= 0 || !Number.isInteger(capacidadNum)) {
      errs.capacidad = 'Debe ser un número entero mayor a 0';
    } else if (capacidadNum > 200) {
      errs.capacidad = 'Capacidad máxima permitida: 200';
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

  const abrirEdicion = (amb) => {
    setEditandoId(amb.id);
    setFormValues({
      nombre: amb.nombre,
      categoriaId: amb.categoriaId ?? '',
      edificioId: amb.edificioId ?? '',
      piso: amb.piso || 'Piso 1',
      capacidad: amb.capacidad,
      estado: amb.estado || 'Activo',
      jornadaIds: amb.jornadaIds || [],
    });
    setErrores({});
    setModalAbierto(true);
  };

  // 2️⃣ FUNCIÓN: Abrir modal de agendar con el ambiente de la fila
  const abrirModalAgendar = (nombreAmbiente) => {
    setAmbienteParaAgendar(nombreAmbiente);
    setModalAgendarAbierto(true);
  };

  // 3️⃣ FUNCIÓN: Procesar el guardado de la asignación de agendamiento
  const manejarGuardarAgendamiento = async (datos) => {
    try {
      await agendaApi.crear(datos);
      setModalAgendarAbierto(false);
      await cargar(); // refresca Ocupado/Disponible
    } catch (e) {
      return e.message; // el modal lo muestra
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    const datos = {
      nombre: formValues.nombre.trim(),
      categoriaId: Number(formValues.categoriaId),
      edificioId: Number(formValues.edificioId),
      piso: formValues.piso.trim() || 'Piso 1',
      capacidad: Number(formValues.capacidad),
      estado: formValues.estado,
      jornadaIds: formValues.jornadaIds,
    };

    try {
      if (editandoId !== null) {
        await ambientesApi.editar(editandoId, datos);
      } else {
        await ambientesApi.crear(datos);
      }
      await cargar();
      setModalAbierto(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const eliminarAmbiente = async (id, nombre) => {
    const confirmacion = window.confirm(`¿Estás seguro de que deseas enviar "${nombre}" a la papelera?`);
    if (!confirmacion) return;
    try {
      await ambientesApi.eliminar(id);
      await cargar();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn p-2 md:p-4">
      <ErrorCarga mensaje={errorCarga} />
      
      {/* Acciones superiores */}
      <div className="w-full flex justify-between items-center bg-white p-4 rounded-xl shadow-xs border border-gray-100">
        <div>
          <h1 className="text-[28px] font-normal text-gray-800 leading-tight">
            Gestión de <span className="text-verde-oscuro font-bold">Ambientes</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={abrirRegistro}
            className="flex items-center gap-2 bg-verde-oscuro text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs hover:bg-[#247338] transition-all cursor-pointer"
          >
            <span className="text-white font-bold text-lg leading-none">+</span>
            <span>Registrar ambiente</span>
          </button>
          <div className="bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold shadow-xs">
            Total ambientes: {listaAmbientes.length}
          </div>
        </div>
      </div>

      {/* Tabla de ambientes */}
      <div className="w-full bg-white rounded-xl shadow-xs border border-gray-200/60 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-gray-700">
            <thead className="bg-verde-claro border-b border-gray-200 text-gray-800">
              <tr>
                <th className="px-4 py-4 font-normal text-center w-14 border-x border-gray-200">ID</th>
                <th className="px-6 py-4 font-normal border-r border-gray-200">Nombre</th>
                <th className="px-6 py-4 font-normal border-r border-gray-200">Ubicación</th>
                <th className="px-6 py-4 font-normal border-r border-gray-200">Categoría</th>
                <th className="px-6 py-4 font-normal border-r border-gray-200">Capacidad</th>
                <th className="px-6 py-4 font-normal border-r border-gray-200">Jornada</th>
                <th className="px-6 py-4 font-normal border-r border-gray-200">Horario</th>
                <th className="px-6 py-4 font-normal text-center border-r border-gray-200 w-34">Estado</th>
                <th className="px-6 py-4 font-normal text-center w-36">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {listaAmbientes.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-center py-8 text-gray-500">
                    No hay ambientes registrados en el sistema.
                  </td>
                </tr>
              ) : (
                listaAmbientes.map((amb) => (
                  <tr key={amb.id} className="align-middle hover:bg-[#81fa8d98] transition-colors duration-300 ease-in-out">
                    <td className="px-4 py-4 text-center text-xs font-light text-gray-700 border-x border-gray-100">
                      {amb.id}
                    </td>
                    <td className="px-6 py-4 text-sm font-normal text-gray-800 tracking-tight border-r border-gray-100">
                      {amb.nombre}
                    </td>
                    <td className="px-6 py-4 text-sm font-normal text-gray-600 border-r border-gray-100">
                      {amb.edificio} · {amb.piso}
                    </td>
                    <td className="px-6 py-4 text-sm font-normal text-gray-800 border-r border-gray-100">
                      {amb.categoria}
                    </td>
                    <td className="px-6 py-4 text-sm font-normal text-gray-600 border-r border-gray-100">
                      {amb.capacidad}
                    </td>
                    <td className="px-6 py-2 text-sm text-gray-800 border-r border-gray-100 align-top">
                      <div className="flex flex-col gap-2 py-1">
                        {amb.programacion?.map((prog, idx) => (
                          <div key={idx} className="h-6 flex items-center font-normal">{prog.jornada}</div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-2 text-sm text-gray-600 border-r border-gray-100">
                      <div className="flex flex-col gap-2 py-1">
                        {amb.programacion?.map((prog, idx) => (
                          <div key={idx} className="h-6 flex items-center font-normal text-[13px] whitespace-nowrap">{prog.horario}</div>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-2 border-r border-gray-100">
                      <div className="flex flex-col gap-2 py-1 items-center justify-center">
                        {amb.programacion?.map((prog, idx) => (
                          <div key={idx} className="h-6 flex items-center justify-center w-full">
                            <span className={`w-28 text-center py-0.5 text-[11px] font-semibold rounded border uppercase tracking-wider ${
                              prog.estado === 'Disponible'
                                ? 'bg-verde-claro border-verde-oscuro text-green-900'
                                : prog.estado === 'Mantenimiento'
                                  ? 'bg-amber-200 border-amber-500 text-amber-900'
                                  : 'bg-rojo-alerta/80 border-red-700 text-red-950'
                            }`}>
                              {prog.estado}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    {/* Bloque de Acciones */}
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center items-center gap-1.5">
                        
                        {/* 4️⃣ BOTÓN DEL CALENDARIO CONECTADO AL MODAL */}
                        <button 
                          onClick={() => abrirModalAgendar(amb.id)}
                          title={`Agendar ${amb.nombre}`} 
                          className="p-1.5 bg-[#2F9348] text-white rounded hover:bg-green-700 transition-colors shadow-xs cursor-pointer"
                        >
                          <FaIcons.FaCalendarAlt className="text-xs" />
                        </button>
                        
                        {/* Editar */}
                        <button 
                          onClick={() => abrirEdicion(amb)} 
                          title="Editar Ambiente" 
                          className="p-1.5 bg-[#FDE28A] border border-amber-300 rounded text-gray-800 hover:bg-amber-300 transition-colors cursor-pointer shadow-xs"
                        >
                          <MdIcons.MdEdit className="text-xs" />
                        </button>
                        
                        {/* Eliminar */}
                        <button 
                          onClick={() => eliminarAmbiente(amb.id, amb.nombre)} 
                          title="Eliminar Ambiente" 
                          className="p-1.5 bg-[#F2786D] border border-red-300 rounded text-white hover:bg-red-500 transition-colors cursor-pointer shadow-xs"
                        >
                          <FaIcons.FaTrashAlt className="text-[10px]" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Registrar / Editar Ambiente */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-[#FAF8F5] border border-gray-200 rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
            
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              {editandoId !== null ? 'Editar ambiente' : 'Registrar ambiente'}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm text-gray-700">
              
              <div className="flex items-center justify-between gap-4">
                <label className="w-1/3 font-medium text-gray-700">Nombre:</label>
                <div className="w-2/3 flex flex-col">
                  <input
                    type="text"
                    name="nombre"
                    placeholder="Ej: Ambiente 301"
                    value={formValues.nombre}
                    onChange={handleChange}
                    className={`bg-[#EAE5DE] border ${errores.nombre ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-600`}
                  />
                  {errores.nombre && <span className="text-red-500 text-xs mt-0.5">{errores.nombre}</span>}
                </div>
              </div>

              <Fila etiqueta="Categoría:" error={errores.categoriaId}>
                <select
                  name="categoriaId"
                  value={formValues.categoriaId}
                  onChange={handleChange}
                  className={`${inputBase} ${errores.categoriaId ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="" disabled>Seleccione</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </Fila>

              <Fila etiqueta="Edificio:" error={errores.edificioId}>
                <select
                  name="edificioId"
                  value={formValues.edificioId}
                  onChange={handleChange}
                  className={`${inputBase} ${errores.edificioId ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="" disabled>Seleccione</option>
                  {edificios.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </Fila>

              <Fila etiqueta="Piso:">
                <input
                  type="text"
                  name="piso"
                  placeholder="Ej: Piso 2"
                  value={formValues.piso}
                  onChange={handleChange}
                  className={`${inputBase} border-gray-300`}
                />
              </Fila>

              <Fila etiqueta="Jornadas:">
                <div className="flex flex-wrap gap-x-4 gap-y-1 py-1">
                  {jornadas.map((j) => (
                    <label key={j.id} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formValues.jornadaIds.includes(j.id)}
                        onChange={() => toggleJornada(j.id)}
                        className="accent-green-700"
                      />
                      {j.nombre}
                    </label>
                  ))}
                </div>
              </Fila>

              <div className="flex items-center justify-between gap-4">
                <label className="w-1/3 font-medium text-gray-700">Capacidad:</label>
                <div className="w-2/3 flex flex-col">
                  <input
                    type="number"
                    name="capacidad"
                    placeholder="Ej: 30"
                    value={formValues.capacidad}
                    onChange={handleChange}
                    className={`bg-[#EAE5DE] border ${errores.capacidad ? 'border-red-500' : 'border-gray-300'} rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-600`}
                  />
                  {errores.capacidad && <span className="text-red-500 text-xs mt-0.5">{errores.capacidad}</span>}
                </div>
              </div>

              <Fila etiqueta="Estado:">
                <select
                  name="estado"
                  value={formValues.estado}
                  onChange={handleChange}
                  className={`${inputBase} border-gray-300`}
                >
                  <option value="Activo">Buenas condiciones (se puede agendar)</option>
                  <option value="Mantenimiento">En mantenimiento (no se puede agendar)</option>
                </select>
              </Fila>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="bg-[#ED7864] text-white px-5 py-1.5 rounded-lg font-medium hover:bg-red-500 transition-colors shadow-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#2F9348] text-white px-5 py-1.5 rounded-lg font-medium hover:bg-green-700 transition-colors shadow-xs cursor-pointer"
                >
                  Guardar
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* 5️⃣ COMPONENTE: Modal Agendar Ambiente desde la Tabla */}
      {modalAgendarAbierto && (
        <ModalAgendarAmbiente 
          ambienteInicial={ambienteParaAgendar}
          onGuardar={manejarGuardarAgendamiento}
          onCancelar={() => setModalAgendarAbierto(false)}
        />
      )}

    </div>
  );
}

export default Ambientes;