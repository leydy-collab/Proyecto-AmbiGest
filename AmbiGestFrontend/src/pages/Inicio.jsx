// import React from 'react';
// import TarjetaInfo from '../components/TarjetaInfo';

// function Inicio({ rol }) { 
//   //JS
//   const ahora = new Date()
//   const mes = ahora.toLocaleString('es-CO', { month: 'long' })
//   const hora = ahora.getHours()

//   let jornada = 'Noche'
//   if (hora < 12) jornada = 'Mañana'
//   else if (hora < 18) jornada = 'Tarde'

//   // html y tailwind
//   return (
//     <div className="animate-fadeIn flex flex-col items-center">
//       <h1 className="text-[36px] font-normal text-gray-800 leading-tight">
//         Bienvenid@ a <span className="text-verde-oscuro font-bold">AmbiGest</span>
//       </h1>
//       <p className="text-[18px] text-gray-500 mt-1.5 font-light">
//         Sistema de Gestión de Ambientes
//       </p>

//       {/* grid de tarjetas */}
//       <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-10 max-w-[950px] justify-center justify-items-center">
        
//         {/* tarjetas compartidas (ambos roles) */}
//         <TarjetaInfo titulo="Jornada actual:" valor={jornada} />
//         <TarjetaInfo titulo="Mes:" valor={mes} />

//         {/* segun rol */}
//         {rol === 'administrador' ? (
//           /* admin */
//           <>
//             <TarjetaInfo titulo="Formaciones en curso:" valor={15} />
//             <TarjetaInfo titulo="Ambientes ocupados:" valor={14} tipo="ocupado" />
//             <TarjetaInfo titulo="Ambientes disponibles:" valor={4} tipo="disponible" />
//           </>
//         ) : (
//           /* instru */
//           <>
//             <TarjetaInfo titulo="Agendas para hoy:" valor={2} tipo="normal" />
//             <TarjetaInfo titulo="Ficha actual:" valor="3237822" tipo="disponible" />
//             <TarjetaInfo titulo="Ambiente:" valor="301" tipo="disponible" />
//           </>
//         )}
        
//       </div>
//     </div>
//   )
// }

// export default Inicio;

// import React, { useState, useEffect } from 'react';
// import TarjetaInfo from '../components/TarjetaInfo';
// import ErrorCarga from '../components/ErrorCarga';
// import { inicioApi } from '../services/api';

// function Inicio({ rol, usuario }) {
//   const ahora = new Date();
//   const mes = ahora.toLocaleString('es-CO', { month: 'long' });
//   const hora = ahora.getHours();

//   let jornada = 'Noche';
//   if (hora < 12) jornada = 'Mañana';
//   else if (hora < 18) jornada = 'Tarde';

//   const [resumen, setResumen] = useState(null);   // null = todavía cargando
//   const [errorCarga, setErrorCarga] = useState('');

//   useEffect(() => {
//     const cargar = async () => {
//       try {
//         // El administrador pide el resumen general; el instructor, el suyo
//         const datos = await inicioApi.resumen(rol === 'administrador' ? undefined : usuario?.id);
//         setResumen(datos);
//         setErrorCarga('');
//       } catch (e) {
//         setErrorCarga(e.message);
//       }
//     };
//     cargar();
//   }, [rol, usuario?.id]);

//   // Mientras llega la respuesta (o si falla) se muestra un guion
//   const v = (valor) => (resumen ? valor : '—');

//   return (
//     <div className="animate-fadeIn flex flex-col items-center">
//       <h1 className="text-[36px] font-normal text-gray-800 leading-tight">
//         Bienvenid@ a <span className="text-verde-oscuro font-bold">AmbiGest</span>
//       </h1>
//       <p className="text-[18px] text-gray-500 mt-1.5 font-light">
//         Sistema de Gestión de Ambientes
//       </p>

//       <div className="w-full max-w-[950px] mt-6">
//         <ErrorCarga mensaje={errorCarga} />
//       </div>

//       <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4 max-w-[950px] justify-center justify-items-center">
//         <TarjetaInfo titulo="Jornada actual:" valor={jornada} />
//         <TarjetaInfo titulo="Mes:" valor={mes} />

//         {rol === 'administrador' ? (
//           <>
//             <TarjetaInfo titulo="Formaciones en curso:" valor={v(resumen?.formaciones)} />
//             <TarjetaInfo titulo="Ambientes ocupados:" valor={v(resumen?.ocupados)} tipo="ocupado" />
//             <TarjetaInfo titulo="Ambientes disponibles:" valor={v(resumen?.disponibles)} tipo="disponible" />
//           </>
//         ) : (
//           <>
//             <TarjetaInfo titulo="Agendas para hoy:" valor={v(resumen?.agendasHoy)} tipo="normal" />
//             <TarjetaInfo titulo="Ficha actual:" valor={v(resumen?.ficha)} tipo="disponible" />
//             <TarjetaInfo titulo="Ambiente:" valor={v(resumen?.ambiente)} tipo="disponible" />
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// export default Inicio;

import React, { useState, useEffect } from 'react';
import TarjetaInfo from '../components/TarjetaInfo';
import ErrorCarga from '../components/ErrorCarga';
import { inicioApi } from '../services/api';

const CADA_CUANTO = 30 * 1000; // se actualiza cada 30 segundos (en milisegundos)

function Inicio({ rol, usuario }) {
  const [resumen, setResumen] = useState(null);   // null = todavía cargando
  const [errorCarga, setErrorCarga] = useState('');
  const [ahora, setAhora] = useState(new Date()); // hora de la última actualización

  useEffect(() => {
    const cargar = async () => {
      setAhora(new Date()); // refresca jornada y mes aunque el servidor falle
      try {
        const datos = await inicioApi.resumen(rol === 'administrador' ? undefined : usuario?.id);
        setResumen(datos);//no se vuelve a poner en null: las tarjetas no parpadean al actualizar
        setErrorCarga('');
      } catch (e) {
        setErrorCarga(e.message);
      }
    };

    cargar(); // primera carga al entrar
    const intervalo = setInterval(cargar, CADA_CUANTO); // y luego, una vez cada 30 s

    // Al volver a esta pestaña se actualiza de inmediato
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVolver);

    // Limpieza: al salir de Inicio se detiene el temporizador (si no, seguiría pidiendo datos)
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [rol, usuario?.id]);

  // Jornada y mes salen de "ahora", que se renueva con cada ciclo
  const mes = ahora.toLocaleString('es-CO', { month: 'long' });
  const hora = ahora.getHours();
  let jornada = 'Noche';
  if (hora < 12) jornada = 'Mañana';
  else if (hora < 18) jornada = 'Tarde';

  const horaActualizacion = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  const v = (valor) => (resumen ? valor : '—');

  return (
    <div className="animate-fadeIn flex flex-col items-center">
      <h1 className="text-[36px] font-normal text-gray-800 leading-tight">
        Bienvenid@ a <span className="text-verde-oscuro font-bold">AmbiGest</span>
      </h1>
      <p className="text-[18px] text-gray-500 mt-1.5 font-light">
        Sistema de Gestión de Ambientes
      </p>

      <div className="w-full max-w-[950px] mt-6">
        <ErrorCarga mensaje={errorCarga} />
      </div>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-4 max-w-[950px] justify-center justify-items-center">
        <TarjetaInfo titulo="Jornada actual:" valor={jornada} />
        <TarjetaInfo titulo="Mes:" valor={mes} />

        {rol === 'administrador' ? (
          <>
            <TarjetaInfo titulo="Formaciones en curso:" valor={v(resumen?.formaciones)} />
            <TarjetaInfo titulo="Ambientes ocupados:" valor={v(resumen?.ocupados)} tipo="ocupado" />
            <TarjetaInfo titulo="Ambientes disponibles:" valor={v(resumen?.disponibles)} tipo="disponible" />
          </>
        ) : (
          <>
            <TarjetaInfo titulo="Agendas para hoy:" valor={v(resumen?.agendasHoy)} tipo="normal" />
            <TarjetaInfo titulo="Ficha actual:" valor={v(resumen?.ficha)} tipo="disponible" />
            <TarjetaInfo titulo="Ambiente:" valor={v(resumen?.ambiente)} tipo="disponible" />
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-6">Actualizado a las {horaActualizacion}</p>
    </div>
  );
}

export default Inicio;

