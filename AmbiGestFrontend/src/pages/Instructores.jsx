
import React, { useState, useEffect } from 'react';
import * as MdIcons from 'react-icons/md';
import * as FaIcons from 'react-icons/fa';
import { instructoresApi } from '../services/api';
import ErrorCarga from '../components/ErrorCarga';

const DOMINIO = '@soysena.edu.co';

function Instructores() {
  const [instructores, setInstructores] = useState([]);
  const [errorCarga, setErrorCarga] = useState('');

  // Trae los instructores desde la base de datos
  const cargar = async () => {
    try {
      const datos = await instructoresApi.listar();
      setInstructores(datos);
      setErrorCarga('');
    } catch (e) {
      setErrorCarga(e.message);
    }
  };

  useEffect(() => { cargar(); }, []);

  const [mostrarModal, setMostrarModal] = useState(false);
  const [instructorEditando, setInstructorEditando] = useState(null);

  function abrirRegistrar() {
    setInstructorEditando(null);
    setMostrarModal(true);
  }

  function abrirEditar(instructor) {
    setInstructorEditando(instructor);
    setMostrarModal(true);
  }
 
  function cerrarModal() {
    setMostrarModal(false);
    setInstructorEditando(null);
  }

  // Devuelve un texto si hay error (el modal lo muestra); si todo sale bien, no devuelve nada
  async function guardar(datos) {
    try {
      if (instructorEditando) {
        await instructoresApi.editar(instructorEditando.id, datos);
      } else {
        await instructoresApi.crear(datos);
      }
      await cargar();
      cerrarModal();
    } catch (e) {
      return e.message;
    }
  }

  async function eliminar(instructor) {
    const confirmado = window.confirm(
      `¿Eliminar a ${instructor.nombre} ${instructor.apellido}? Esta acción no se puede deshacer.`
    );
    if (!confirmado) return;
    try {
      await instructoresApi.eliminar(instructor.id);
      await cargar();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <div className="w-full flex flex-col gap-6 animate-fadeIn p-2 md:p-4">
      <ErrorCarga mensaje={errorCarga} />
      
      {/* acciones superiores */}
      <div className="w-full flex justify-between items-center bg-white p-4 rounded-xl shadow-xs border border-gray-100">
        <div>
          <h1 className="text-[28px] font-normal text-gray-800 leading-tight">
            Gestión de <span className="text-verde-oscuro font-bold">Instructores</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button 
            className="flex items-center gap-2 bg-verde-oscuro text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs hover:bg-[#247338] transition-all cursor-pointer"
            onClick={abrirRegistrar}
          >
            <span className="text-white font-bold text-lg leading-none">+</span>
            <span>Registrar instructor</span>
          </button>
          <div className="bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold shadow-xs">
            Total instructores: {instructores.length}
          </div>
        </div>
      </div>

      {/* tabla instructores*/}
      <div className="w-full bg-white rounded-xl shadow-xs border border-gray-200/60 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-gray-700">
            <thead className="bg-verde-claro border-b border-gray-300 text-gray-800">
              <tr>
                <th className="px-6 py-4 font-normal text-center w-16 border-x border-gray-100">ID</th>
                <th className="px-6 py-4 font-normal border-r border-gray-100">Nombre</th>
                <th className="px-6 py-4 font-normal border-r border-gray-100">Documento</th>
                <th className="px-6 py-4 font-normal border-r border-gray-100">Área</th>
                <th className="px-6 py-4 font-normal border-r border-gray-100">Red de conoc.</th>
                <th className="px-6 py-4 font-normal border-r border-gray-100">Correo</th>
                <th className="px-6 py-4 font-normal text-center border-r border-gray-100">Estado</th>
                <th className="px-6 py-4 font-normal text-center w-28"></th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {instructores.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-gray-400 font-light italic">
                    No hay instructores registrados.
                  </td>
                </tr>
              ) : (
                instructores.map((i) => (
                  <tr key={i.id} className="align-middle hover:bg-[#81fa8d98] transition-colors duration-300 ease-in-out">
                    <td className="px-6 py-3.5 text-center text-xs font-light text-gray-500 border-r border-gray-100">{String(i.id).padStart(3, '0')}</td>
                    <td className="px-6 py-3.5 text-sm font-normal text-gray-800 tracking-tight border-r border-gray-100">{i.nombre} {i.apellido}</td>
                    <td className="px-6 py-3.5 text-sm font-normal text-gray-600 border-r border-gray-100">{i.numeroDoc}</td>
                    <td className="px-6 py-3.5 text-sm font-normal text-gray-600 border-r border-gray-100">{i.area}</td>
                    <td className="px-6 py-3.5 text-sm font-light text-gray-500 border-r border-gray-100">{i.red}</td>
                    <td className="px-6 py-3.5 text-sm font-light text-gray-500 border-r border-gray-100">{i.correo}</td>
                    <td className="px-6 py-3.5 text-center text-sm font-normal text-gray-700 border-r border-gray-100">{i.estado}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex justify-center items-center gap-2">
                        <button
                          className="p-1 bg-[#FDE28A] border border-amber-300 rounded text-gray-800 hover:bg-amber-300 transition-colors cursor-pointer shadow-xs"
                          title="Editar"
                          onClick={() => abrirEditar(i)}
                        >
                          <MdIcons.MdEdit className="text-sm" />
                        </button>
                        <button
                          className="p-1 bg-[#F2786D] border border-red-300 rounded text-white hover:bg-red-500 transition-colors cursor-pointer shadow-xs"
                          title="Eliminar"
                          onClick={() => eliminar(i)}
                        >
                          <FaIcons.FaTrashAlt className="text-xs" />
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

      
      {mostrarModal && (
        <ModalInstructor
          instructor={instructorEditando}
          onGuardar={guardar}
          onCancelar={cerrarModal}
        />
      )}
    </div>
  );
}

//MODAL

function ModalInstructor({ instructor, onGuardar, onCancelar }) {
  const editando = instructor !== null;

  const [form, setForm] = useState(
    editando
      ? {
          numeroDoc: instructor.numeroDoc,
          nombre: instructor.nombre,
          apellido: instructor.apellido,
          usuarioCorreo: instructor.correo.split('@')[0],
          area: instructor.area,
          red: instructor.red,
          estado: instructor.estado,
        }
      : {
          numeroDoc: '',
          nombre: '',
          apellido: '',
          usuarioCorreo: '',
          area: '',
          red: '',
          estado: 'Activo',
        }
  );
  const [error, setError] = useState('');

  function cambiar(e) {
    let { name, value } = e.target;

    if (name === 'usuarioCorreo') {
      value = value.split('@')[0].replace(/\s/g, '').toLowerCase();
    }
    if (name === 'numeroDoc') {
      value = value.replace(/\D/g, '');
    }

    setForm({ ...form, [name]: value });
    setError('');
  }

  async function enviar(e) {
    e.preventDefault();

    const datos = {
      numeroDoc: form.numeroDoc,
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      correo: form.usuarioCorreo + DOMINIO,
      area: form.area.trim(),
      red: form.red.trim(),
      estado: form.estado,
    };

    const mensajeError = await onGuardar(datos);
    if (mensajeError) setError(mensajeError);
  }

  return (
    // capa de fondo oscura con blur sutil
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn">
      {/* Tarjeta del modal */}
      <div className="bg-[#FAF8F5] border border-gray-200 rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
        
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          {editando ? 'Editar instructor' : 'Registrar instructor'}
        </h2>

        <form onSubmit={enviar} className="flex flex-col gap-4 text-sm text-gray-700">
          
          {/* campo documento */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="numeroDoc">Documento:</label>
            <div className="w-2/3 flex flex-col">
              <input
                id="numeroDoc"
                name="numeroDoc"
                type="text"
                inputMode="numeric"
                maxLength={15}
                value={form.numeroDoc}
                onChange={cambiar}
                placeholder="Número de documento"
                required
                className="bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 w-full text-xs text-gray-800"
              />
            </div>
          </div>

          {/* campo nombres */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="nombre">Nombres:</label>
            <div className="w-2/3 flex flex-col">
              <input 
                id="nombre" 
                name="nombre" 
                type="text"
                value={form.nombre} 
                onChange={cambiar} 
                required 
                className="bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-800"
              />
            </div>
          </div>

          {/* campo apellidos */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="apellido">Apellidos:</label>
            <div className="w-2/3 flex flex-col">
              <input 
                id="apellido" 
                name="apellido" 
                type="text"
                value={form.apellido} 
                onChange={cambiar} 
                required 
                className="bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-800"
              />
            </div>
          </div>

          {/* campo correo con dominio fijo */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="usuarioCorreo">Correo:</label>
            <div className="w-2/3 flex items-center bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 focus-within:ring-1 focus-within:ring-green-600">
              <input
                id="usuarioCorreo"
                name="usuarioCorreo"
                type="text"
                value={form.usuarioCorreo}
                onChange={cambiar}
                placeholder="usuario"
                required
                className="w-full h-full py-1.5 bg-transparent border-none outline-hidden text-xs text-gray-800"
              />
              <span className="text-xs text-gray-500 font-mono select-none pl-1">{DOMINIO}</span>
            </div>
          </div>

          {/* campo área */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="area">Área:</label>
            <div className="w-2/3 flex flex-col">
              <input 
                id="area" 
                name="area" 
                type="text"
                value={form.area} 
                onChange={cambiar} 
                required 
                className="bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-800"
              />
            </div>
          </div>

          {/* campo red de conocimiento */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="red">Red de conocimiento:</label>
            <div className="w-2/3 flex flex-col">
              <input 
                id="red" 
                name="red" 
                type="text"
                value={form.red} 
                onChange={cambiar} 
                required 
                className="bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-800"
              />
            </div>
          </div>

          {/* Campo estado */}
          <div className="flex items-center justify-between gap-4">
            <label className="w-1/3 font-medium text-gray-700" htmlFor="estado">Estado:</label>
            <div className="w-2/3">
              <select 
                id="estado" 
                name="estado" 
                value={form.estado} 
                onChange={cambiar}
                className="w-full bg-[#EAE5DE] border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-green-600 text-xs text-gray-700 cursor-pointer"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          {/* caja dinámica de errores */}
          {error && (
            <p className="text-red-500 text-xs font-semibold mt-1 text-center bg-red-50 border border-red-200 py-1.5 rounded-lg w-full">
              {error}
            </p>
          )}

          {/* botones de acción del Modal */}
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
              {editando ? 'Actualizar' : 'Guardar'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

export default Instructores;