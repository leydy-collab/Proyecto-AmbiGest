import React from 'react';

function TarjetaInfo({ titulo, valor, tipo = 'normal' }) {
  const estilosPorTipo = {
    normal: 'bg-white border-gray-300 text-gray-800',
    ocupado: 'bg-rojo-alerta border-[#a00000] text-white',
    disponible: 'bg-verde-claro border-verde-oscuro text-gray-900',
  };

  return (
    <div className={`w-full max-w-[310px] border rounded-xl px-6 py-5 shadow-xs m-0
      hover:-translate-y-1 hover:shadow-md hover:scale-[1.02]        
      cursor-pointer transition-all duration-200 ease-in-out 
      ${estilosPorTipo[tipo]}`}
    >
      <p className="text-sm font-medium tracking-wide opacity-90 m-0">{titulo}</p>
      <p className="text-2xl font-bold mt-2 capitalize m-0">{valor}</p>
    </div>
  );
}

export default TarjetaInfo;

