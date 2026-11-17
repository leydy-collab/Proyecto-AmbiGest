import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as IoIcons from 'react-icons/io';
import * as FiIcons from 'react-icons/fi';

const DURACION = 10 * 1000; // el aviso se cierra solo a los 10 segundos

// Aviso emergente (esquina superior derecha) que le sale al administrador cuando un instructor reporta una novedad
function AvisoNovedad({ novedad, onCerrar }) {
  const navigate = useNavigate();

  // Cada novedad nueva reinicia el temporizador de cierre automático
  useEffect(() => {
    if (!novedad) return;
    const t = setTimeout(onCerrar, DURACION);
    return () => clearTimeout(t);
  }, [novedad, onCerrar]);

  if (!novedad) return null;

  const verNovedad = () => {
    onCerrar();
    navigate('/novedades');
  };

  return (
    <div className="fixed top-16 right-6 z-50 w-[340px] bg-white border border-gray-200 border-l-4 border-l-rojo-alerta rounded-xl shadow-lg p-4 animate-slideDown">
      <div className="flex items-start gap-3">
        <IoIcons.IoMdNotifications className="text-2xl text-rojo-alerta flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-800 m-0">Nueva novedad reportada</p>
          <p className="text-xs text-gray-600 mt-1 m-0 leading-relaxed">
            <span className="font-semibold">{novedad.instructor}</span> reportó una novedad en{' '}
            <span className="font-semibold">{novedad.ambiente}</span>
            {novedad.tipo && <> ({novedad.tipo})</>}.
          </p>
          <button
            onClick={verNovedad}
            className="mt-2 text-xs font-bold text-verde-oscuro hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            Ver novedad
          </button>
        </div>
        <button
          onClick={onCerrar}
          className="text-gray-400 hover:text-gray-600 bg-transparent border-none p-0 cursor-pointer"
          title="Cerrar"
        >
          <FiIcons.FiX className="text-lg" />
        </button>
      </div>
    </div>
  );
}

export default AvisoNovedad;
