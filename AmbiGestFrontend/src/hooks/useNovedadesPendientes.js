import { useState, useEffect, useRef } from 'react';
import { novedadesApi } from '../services/api';

const CADA_CUANTO = 15 * 1000; // consulta al backend cada 15 segundos (en milisegundos)

// Mantiene al administrador enterado de las novedades que reportan los instructores:
//   pendientes -> cuántas están sin atender (número de la campana y del menú)
//   nueva      -> datos de la última novedad que llegó MIENTRAS tenía la sesión abierta (para el aviso emergente)
//   refrescar  -> vuelve a consultar de inmediato (se usa al cambiar el estado de una novedad)
// "activo" es true solo para el administrador; el instructor no necesita consultar nada.
function useNovedadesPendientes(activo) {
  const [pendientes, setPendientes] = useState(0);
  const [nueva, setNueva] = useState(null);
  const ultimoVisto = useRef(null); // id de la última novedad que ya conocíamos (null = aún no se ha consultado)
  const consultar = useRef(null);   // guarda la función de consulta para poder llamarla desde afuera

  useEffect(() => {
    if (!activo) return;

    const cargar = async () => {
      try {
        const r = await novedadesApi.resumen();
        setPendientes(r.pendientes);
        // La primera consulta solo "memoriza" el último id: no avisa por novedades que ya existían.
        // Después, si el último id subió, es que un instructor acaba de reportar una nueva.
        if (ultimoVisto.current !== null && r.ultimoId > ultimoVisto.current && r.ultima) {
          setNueva(r.ultima);
        }
        ultimoVisto.current = r.ultimoId;
      } catch {
        // Si falla (backend apagado) no se molesta al usuario: se reintenta en el siguiente ciclo
      }
    };
    consultar.current = cargar;

    cargar(); // primera consulta al entrar
    const intervalo = setInterval(cargar, CADA_CUANTO); // y luego, una vez cada 15 s

    // Al volver a esta pestaña se actualiza de inmediato
    const alVolver = () => { if (document.visibilityState === 'visible') cargar(); };
    document.addEventListener('visibilitychange', alVolver);

    // Limpieza: al cerrar sesión se detiene el temporizador y se borra lo que había
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
      consultar.current = null;
      ultimoVisto.current = null;
      setPendientes(0);
      setNueva(null);
    };
  }, [activo]);

  return {
    pendientes,
    nueva,
    cerrarAviso: () => setNueva(null),
    refrescar: () => { if (consultar.current) consultar.current(); },
  };
}

export default useNovedadesPendientes;
