// Punto único de comunicación con el backend (AmbiGestBackend)
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
//import.meta.. es la forma en que Vite(empaquetadro del frontend) lee las varibales de entorno de .env
//|| si la variable de entorno no existe (porque esta corriendo de forma local) usa por defecto localhost3000 que es donde corre el backend
async function request(ruta, opciones = {}) {//la ruta por ejemplo /ambientes, y opciones de la peticion
  let res;
  try {
    res = await fetch(`${API}${ruta}`, {//realiza la petición HTTP nativa del navegadro combinando la URL base y la ruta
      headers: { 'Content-Type': 'application/json' },//le avisa al servidor que todos los datos que enviamos van en formato estadar JSON
      ...opciones, //(.. se llama operador spread) expande cualquier propiedad adicional que le mandemos como el metodo POST
    });
  } catch {//si el fecth nativo genera error critico
    throw new Error('No se pudo conectar con el servidor. ¿Está encendido el backend?');
  }
  const data = await res.json().catch(() => ({})); //res.json convierte la respuesta binaria del servidor en
  //un objeto o arreglo de JS legible. Si el servidor responde con un error y el cuerpo viene vacio el catch evita q la app se rompa
  if (!res.ok) throw new Error(data.error || 'Error en la petición');
  // revisa el codigo de estado HTTP (res.ok es verdadero si el codigo esta entre 200 y 299)
  //si hubo un error del servidor(400 0 500) extra el mensaje de error que mandó el backend(data.error)
  //lanza una excepción para que el componente que llamó a la función se entere y lo muestre en pantalla
  return data;//si todo esta bien, devuelve los datos puros listos para ser usados por React
}

const enviar = (metodo, cuerpo) => ({ method: metodo, body: JSON.stringify(cuerpo) });
// es una pequeña función de utilidad para ahorrase repetir código al hacer peticiones
//tipo POST(crear) o PUT(editar)
// esta funcion recibe el metodo HTTP y un objeto con los datos(cuerpo )
//devuelve un objeto listo con el metodo configurado y transformando los datos a texto JSON usando stringify
//ya que las redes no pueden enviar objetos de JS puros, solo texto


// desde aqui el archivo exporta objetos organizados por cada modulo de la app.
//Cada uno utiliza la función maestra request de arriba

export const authApi = {
  login: (datos) => request('/auth/login', enviar('POST', datos)),
};
//envia los datos del usuario (correo, contraseña) mediante un metodo POST a la ruta /auth/login para iniciar sesión

export const instructoresApi = {
  listar: () => request('/instructores'),//peticion GET estadar (/instructores) para traer la lista completa
  crear: (d) => request('/instructores', enviar('POST', d)),//peticion POST empaquetando los datos nuevos del instructor(d)
  editar: (id, d) => request(`/instructores/${id}`, enviar('PUT', d)),//peticion PUT inyectando el ID del instructor en la url (/instructores/5) junto con los datos actualizados
  eliminar: (id) => request(`/instructores/${id}`, { method: 'DELETE' }),//peticion DELETE enviando el id especifico a eliminar (/instructores/5)
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
  //si se le pasa un id de instructor muestra las agendas de solo ese instructor, sino se le pasa nada se ven todas (admin)
  crear: (d) => request('/agenda', enviar('POST', d)),
};

export const novedadesApi = {
  listar: (instructorId) => request(`/novedades${instructorId ? `?instructor=${instructorId}` : ''}`),
  crear: (d) => request('/novedades', enviar('POST', d)),
};

//conjunto de peticiones GET (lectura) para llenar los menus desplegables estaticos del sistema
export const catalogosApi = {
  tiposNovedad: () => request('/catalogos/tipos-novedad'),
  categorias: () => request('/catalogos/categorias'),
  edificios: () => request('/catalogos/edificios'),
  jornadas: () => request('/catalogos/jornadas'),
};
