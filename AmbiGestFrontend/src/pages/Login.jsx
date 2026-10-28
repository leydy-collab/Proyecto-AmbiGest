import React, { useState } from 'react';
import * as MdIcons from 'react-icons/md';
import logo from '../assets/logo.png';
import { authApi } from '../services/api';

function Login({ onLoginSuccess }) {
  const [rolSeleccionado, setRolSeleccionado] = useState('');
  const [documento, setDocumento] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rolSeleccionado) {
      setError('Por favor seleccione un rol');
      return;
    }
    setError('');
    setCargando(true);
    try {
      // Valida contra la tabla usuarios de la base de datos
      const usuario = await authApi.login({
        rol: rolSeleccionado,
        documento,
        correo,
        password,
      });
      onLoginSuccess(rolSeleccionado, usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="w-full h-screen flex justify-center items-center bg-gray-100 font-sans">

        
      
      {/* contenedor principal */}
      <div className="w-[850px] h-[480px] flex bg-white rounded-2xl overflow-hidden shadow-[0_0_10px_rgba(0,0,0,0.3)] border border-gray-100">
          <div className=" w-1/2 bg-verde-oscuro flex items-center justify-center bg-verde-claro flex flex-col justify-center items-center text-white px-10 rounded-tr-[50%] rounded-br-[50%]">
            <div className="max-w-[285px] text-center flex flex-col gap-3">
              <h3 className="text-4xl font-bold tracking-tight m-0">¡ Bienvenido !</h3>
              <p className="text-s  leading-relaxed m-0">
                Al portal institucional de gestión de ambientes
              </p>
            </div>
          </div>

        {/* mitad izquierda: formulario */}
        <div className="w-1/2 h-full flex flex-col justify-center items-center px-12 bg-white">
          
          {/* Título */}
          <div className="flex gap-[20px] justify-center">
            <img 
                      src={logo} 
                      alt="Logo AmbiGest" 
                      className="h-8 w-10 object-contain" // Controla la altura y proporciones del logo
                    />
            <h2 className="text-3xl font-normal text-gray-800 mb-8 tracking-tight">
                Ambi<span className="text-verde-oscuro font-bold">Gest</span>
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="w-full flex flex-col items-center max-w-[280px]">
            
            {/* input: rol */}
            <div className="w-full h-9 mb-3 flex items-center gap-2 px-3 bg-gray-100/80 rounded border border-gray-200 focus-within:border-verde-oscuro focus-within:bg-white transition-all">
              <MdIcons.MdAccountBox className="text-gray-500 text-lg flex-shrink-0" />
              <select 
                value={rolSeleccionado}
                onChange={(e) => setRolSeleccionado(e.target.value)}
                required
                className="w-full h-full bg-transparent border-none outline-hidden text-sm text-gray-500 cursor-pointer"
              >
                <option value="" disabled>Seleccione su rol</option>
                <option value="administrador">Administrador</option>
                <option value="instructor">Instructor</option>
              </select>
            </div>

            {/* input: documento */}
            <div className="w-full h-9 mb-3 flex items-center gap-2 px-3 bg-gray-100/80 rounded border border-gray-200 focus-within:border-verde-oscuro focus-within:bg-white transition-all">
              <MdIcons.MdBadge className="text-gray-500 text-lg flex-shrink-0" />
              <input 
                required 
                type="text" 
                inputMode="numeric" 
                pattern="[0-9]{6,10}" 
                maxLength={10}
                placeholder="Documento"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className="w-full h-full bg-transparent border-none outline-hidden text-sm text-gray-800 placeholder-gray-400"
              />
            </div>

            {/* input: correo */}
            <div className="w-full h-9 mb-3 flex items-center gap-2 px-3 bg-gray-100/80 rounded border border-gray-200 focus-within:border-verde-oscuro focus-within:bg-white transition-all">
              <MdIcons.MdMail className="text-gray-500 text-lg flex-shrink-0" />
              <input 
                type="email" 
                placeholder="Correo" 
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="w-full h-full bg-transparent border-none outline-hidden text-sm text-gray-800 placeholder-gray-400"
              />
            </div>

            {/* para admin: contraseña */}
            <div className={`w-full flex flex-col items-center overflow-hidden transition-all duration-300 ${
              rolSeleccionado === 'administrador' ? 'max-h-20 opacity-100 mb-3' : 'max-h-0 opacity-0 pointer-events-none'
            }`}>
              <div className="w-full h-9 flex items-center gap-2 px-3 bg-gray-100/80 rounded border border-gray-200 focus-within:border-verde-oscuro focus-within:bg-white transition-all">
                <MdIcons.MdLock className="text-gray-500 text-lg flex-shrink-0" />
                <input 
                  type="password" 
                  placeholder="Contraseña" 
                  required={rolSeleccionado === 'administrador'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-full bg-transparent border-none outline-hidden text-sm text-gray-600 placeholder-gray-400"
                />
              </div>
              <div className="w-full flex justify-center pl-1">
                <a href="#" className="text-xs text-gray-500 hover:text-verde-oscuro no-underline transition-colors mt-2 text">¿Olvidaste tu contraseña?</a>
              </div>
            </div>

            
            {error && (
              <p className="w-full text-center text-xs text-red-500 font-semibold bg-red-50 border border-red-200 py-1.5 px-2 rounded mt-2">{error}</p>
            )}
            <button type="submit" disabled={cargando} className="px-5 h-9 bg-verde-medio hover:bg-verde-oscuro text-white font-medium text-sm rounded transition-all cursor-pointer shadow-xs mt-4">
              Iniciar sesión
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

export default Login;
