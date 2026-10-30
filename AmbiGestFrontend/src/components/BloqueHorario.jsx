import React from 'react';

export function BloqueHorario({ ficha, hora, onClick }) { // propiedades
  return (
    <div
      onClick={(e) => {
        e.stopPropagation(); // Evita que el clic propague eventos indeseados, o sea, solo activa el click en la tarjeta no en la celda del día
        if (onClick) onClick(); //valida que la funcion OnClick fue enviada como prop antes de llamarla   
      }}
      className="text-[10px] p-1 rounded border border-verde-oscuro bg-white font-semibold flex flex-col items-center leading-tight shadow-xs cursor-pointer hover:bg-gray-50 transition-all"
    >
      <span>{ficha}</span>
      <span className="opacity-80 text-[9px] text-center">{hora}</span>
    </div>
  );
}

// Máximo de tarjetas visibles por día: hay hasta tres jornadas (mañana, tarde y noche)
const MAX_TARJETAS = 3;

// Cuadro del día completo (sirve igual para lunes a viernes que para sábado y domingo)
export function CeldaDia({ numero, esMesActual = true, horarios = [], onSeleccionarTarjeta }) {
  const visibles = horarios.slice(0, MAX_TARJETAS); // toma los primeros 3 elementos del arreglo horarios
  const ocultas = horarios.length - visibles.length; // para saber cuantas agendas quedan ocultas

  return (
    <div className={`min-h-[130px] border border-gray-100 bg-white p-1.5 flex flex-col gap-1 rounded transition-all hover:bg-[#74f8814b] hover:border-verde-oscuro ${
      !esMesActual ? 'opacity-30 bg-gray-50 pointer-events-none' : ''
    }`}>
      <span className="text-xs font-bold text-gray-400 self-start ps-0.5">{numero}</span>
      <div className="flex flex-col gap-1 w-full">
        {visibles.map((item, index) => (
          <BloqueHorario
            key={item.id ?? index}
            ficha={item.ficha}
            hora={item.hora}
            onClick={() => onSeleccionarTarjeta && onSeleccionarTarjeta(item)}
          />
        ))}
        {/* Por si algún día llegara a tener más de tres agendas */}
        {ocultas > 0 && (
          <span className="text-[9px] text-gray-400 text-center">+{ocultas} más</span>
        )}
      </div>
    </div>
  );
}
