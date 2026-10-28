import React from 'react';
import * as IoIcons from 'react-icons/io';
import * as FiIcons from 'react-icons/fi';
import logo from '../assets/logo.png';

// recibir propiedades de control
const Header = ({ onLogout, sidebarColapsado, setSidebarColapsado }) => {
  return (
    <header className="w-full h-14 bg-white border-b border-gray-200 flex justify-between items-center px-6">
      
      {/* logo como botón para poder ocultar el sidebar */}
      <button 
        onClick={() => setSidebarColapsado(!sidebarColapsado)}
        className="flex items-center gap-3 bg-transparent border-none outline-hidden cursor-pointer hover:scale-105 transition-all duration-200 text-left p-0"
        title={sidebarColapsado ? "Expandir menú" : "Colapsar menú"}
      >
        <img 
          src={logo} 
          alt="Logo AmbiGest" 
          className="h-8 w-8 object-contain" 
        />
        {/* Ocultamos sutilmente las letras AmbiGest con una transición si el menú está colapsado */}
        <span className={`text-2xl font-bold tracking-tight text-gray-800 transition-all duration-300 overflow-hidden whitespace-nowrap ${
          sidebarColapsado ? 'max-w-0 opacity-0' : 'max-w-40 opacity-100'
        }`}>
          Ambi<span className="text-verde-oscuro">Gest</span>
        </span>
      </button>

      {/* notificaciones y cerrar sesión*/}
      <div className="flex items-center gap-6">
        <button className="relative p-2 text-gray-500 hover:text-verde-oscuro rounded-full hover:bg-gray-100 transition-all duration-200 cursor-pointer">
          <IoIcons.IoMdNotifications className="text-2xl" />
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rojo-alerta rounded-full border-2 border-white"></span>
        </button>

        <button onClick={onLogout} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-rojo-alerta border border-transparent hover:border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer">
          <FiIcons.FiLogOut className="text-lg" />
          <span>Cerrar sesión</span>
        </button>
      </div>
      
    </header>
  );
};

export default Header;
