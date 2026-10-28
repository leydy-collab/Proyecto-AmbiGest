import React from 'react';

// Componente para las tarjetas de colores dentro de cada día
export function BloqueHorario({ ficha, hora, onClick }) {
  return (
    <div 
      onClick={(e) => {
        e.stopPropagation(); // Evita que el clic propague eventos indeseados
        if (onClick) onClick();
      }}
      className="text-[10px] p-1 rounded border border-verde-oscuro bg-white font-semibold flex flex-col items-center leading-tight shadow-xs cursor-pointer hover:bg-gray-50 transition-all"
    >
      <span>{ficha}</span>
      <span className="opacity-80 text-[9px] text-center">{hora}</span>
    </div>
  );
}

// Componente para el cuadro del día completo
export function CeldaDia({ numero, esMesActual = true, horarios = [], onSeleccionarTarjeta }) {
  return (
    <div className={`min-h-[115px] border border-gray-100 bg-white p-1.5 flex flex-col gap-1 rounded transition-all hover:bg-[#74f8814b] hover:border-verde-oscuro ${
      !esMesActual ? 'opacity-30 bg-gray-50 pointer-events-none' : ''
    }`}>
      <span className="text-xs font-bold text-gray-400 self-start ps-0.5">{numero}</span>
      <div className="flex flex-col gap-1 w-full">
        {/* Límite de máximo 2 agendas */}
        {horarios.slice(0, 2).map((item, index) => (
          <BloqueHorario 
            key={index} 
            ficha={item.ficha} 
            hora={item.hora} 
            color={item.color}
            onClick={() => onSeleccionarTarjeta && onSeleccionarTarjeta(item)} 
          />
        ))}
      </div>
    </div>
  );
}