import React from 'react';
import TarjetaInfo from '../components/TarjetaInfo';

function Inicio({ rol }) { 
  //JS
  const ahora = new Date()
  const mes = ahora.toLocaleString('es-CO', { month: 'long' })
  const hora = ahora.getHours()

  let jornada = 'Noche'
  if (hora < 12) jornada = 'Mañana'
  else if (hora < 18) jornada = 'Tarde'

  // html y tailwind
  return (
    <div className="animate-fadeIn flex flex-col items-center">
      <h1 className="text-[36px] font-normal text-gray-800 leading-tight">
        Bienvenid@ a <span className="text-verde-oscuro font-bold">AmbiGest</span>
      </h1>
      <p className="text-[18px] text-gray-500 mt-1.5 font-light">
        Sistema de Gestión de Ambientes
      </p>

      {/* grid de tarjetas */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-10 max-w-[950px] justify-center justify-items-center">
        
        {/* tarjetas compartidas (ambos roles) */}
        <TarjetaInfo titulo="Jornada actual:" valor={jornada} />
        <TarjetaInfo titulo="Mes:" valor={mes} />

        {/* segun rol */}
        {rol === 'administrador' ? (
          /* admin */
          <>
            <TarjetaInfo titulo="Formaciones en curso:" valor={15} />
            <TarjetaInfo titulo="Ambientes ocupados:" valor={14} tipo="ocupado" />
            <TarjetaInfo titulo="Ambientes disponibles:" valor={4} tipo="disponible" />
          </>
        ) : (
          /* instru */
          <>
            <TarjetaInfo titulo="Agendas para hoy:" valor={2} tipo="normal" />
            <TarjetaInfo titulo="Ficha actual:" valor="3237822" tipo="disponible" />
            <TarjetaInfo titulo="Ambiente:" valor="301" tipo="disponible" />
          </>
        )}
        
      </div>
    </div>
  )
}

export default Inicio;


