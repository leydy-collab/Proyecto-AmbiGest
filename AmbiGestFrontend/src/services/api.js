// Punto único de comunicación con el backend (AmbiGestBackend)
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(ruta, opciones = {}) {
  let res;
  try {
    res = await fetch(`${API}${ruta}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opciones,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error en la petición');
  return data;
}

const enviar = (metodo, cuerpo) => ({ method: metodo, body: JSON.stringify(cuerpo) });

export const authApi = {
  login: (datos) => request('/auth/login', enviar('POST', datos)),
};

export const instructoresApi = {
  listar: () => request('/instructores'),
  crear: (d) => request('/instructores', enviar('POST', d)),
  editar: (id, d) => request(`/instructores/${id}`, enviar('PUT', d)),
  eliminar: (id) => request(`/instructores/${id}`, { method: 'DELETE' }),
};

export const ambientesApi = {
  listar: () => request('/ambientes'),
  crear: (d) => request('/ambientes', enviar('POST', d)),
  editar: (id, d) => request(`/ambientes/${id}`, enviar('PUT', d)),
  eliminar: (id) => request(`/ambientes/${id}`, { method: 'DELETE' }),
};

export const fichasApi = {
  listar: () => request('/fichas'),
  crear: (d) => request('/fichas', enviar('POST', d)),
  editar: (numero, d) => request(`/fichas/${numero}`, enviar('PUT', d)),
  eliminar: (numero) => request(`/fichas/${numero}`, { method: 'DELETE' }),
};

export const agendaApi = {
  listar: (instructorId) => request(`/agenda${instructorId ? `?instructor=${instructorId}` : ''}`),
  crear: (d) => request('/agenda', enviar('POST', d)),
};

export const novedadesApi = {
  listar: (instructorId) => request(`/novedades${instructorId ? `?instructor=${instructorId}` : ''}`),
  crear: (d) => request('/novedades', enviar('POST', d)),
};

export const catalogosApi = {
  tiposNovedad: () => request('/catalogos/tipos-novedad'),
  categorias: () => request('/catalogos/categorias'),
  edificios: () => request('/catalogos/edificios'),
  jornadas: () => request('/catalogos/jornadas'),
};
