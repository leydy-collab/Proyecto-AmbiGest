// ==========================================
// HELPERS GENERALES DE AMBIGEST
// ==========================================


// ==========================================
// 1. MANEJO DE ERRORES DE LAS RUTAS
// ==========================================

export function ruta(fn, mensajes = {}) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      console.error('Error en la petición:', error);

      // Error 1062 de MySQL: se intentó guardar un dato que debe ser único (llave UNIQUE o PRIMARY KEY repetida)
      if (
        error.code === 'ER_DUP_ENTRY' &&
        mensajes.duplicado
      ) {
        const mensaje =
          typeof mensajes.duplicado === 'function'
            ? mensajes.duplicado(error)
            : mensajes.duplicado;

        return res.status(409).json({
          error: mensaje
        });
      }

      // Errores 1451/1452 de MySQL: una llave foránea (FOREIGN KEY) impide borrar o cambiar el registro
      // porque otros registros dependen de él (por ejemplo, una ficha con agendas)
      if (
        (
          error.code === 'ER_ROW_IS_REFERENCED' ||
          error.code === 'ER_ROW_IS_REFERENCED_2'
        ) &&
        mensajes.referenciado
      ) {
        return res.status(409).json({
          error: mensajes.referenciado
        });
      }

      // Mensaje de un trigger o procedimiento de la BD (SIGNAL SQLSTATE '45000')
      if (error.sqlState === '45000') {
        return res.status(400).json({ error: error.sqlMessage });
      }

      // Cualquier otro error de MySQL (conexión rechazada, tabla o columna inexistente, etc.)
      return res.status(500).json({
        error: error.sqlMessage || error.message || 'Error interno del servidor.'
      });
    }
  };
}


// ==========================================
// 2. FORMATO DE FECHAS
// ==========================================

export function fechaLarga(fecha) {
  if (!fecha) return '';

  const fechaObj = new Date(`${fecha}T00:00:00`);

  if (Number.isNaN(fechaObj.getTime())) {
    return fecha;
  }

  return fechaObj.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}


export function fechaCorta(fecha) {
  if (!fecha) return '';

  const fechaObj = new Date(`${fecha}T00:00:00`);

  if (Number.isNaN(fechaObj.getTime())) {
    return fecha;
  }

  return fechaObj.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit'
  });
}


// ==========================================
// 3. FORMATO DE HORA
// ==========================================

export function hora12(hora) {
  if (!hora) return '';

  const partes = String(hora).split(':');

  const horas = Number(partes[0]);
  const minutos = partes[1] || '00';

  if (Number.isNaN(horas)) {
    return hora;
  }

  const periodo = horas >= 12 ? 'PM' : 'AM';

  let hora12 = horas % 12;

  if (hora12 === 0) {
    hora12 = 12;
  }

  return `${hora12}:${minutos} ${periodo}`;
}


// ==========================================
// 4. NIVELES DE FORMACIÓN
// ==========================================

export const NIVEL_A_DB = {
  'Técnico': 'Tecnico',
  'Tecnólogo': 'Tecnologo',
  'Tecnologo': 'Tecnologo',
  'Técnico Profesional': 'Tecnico',
  'Operario': 'Operario',
  'Auxiliar': 'Auxiliar'
};


export const NIVEL_A_UI = {
  'Tecnico': 'Técnico',
  'Tecnologo': 'Tecnólogo',
  'Operario': 'Operario',
  'Auxiliar': 'Auxiliar'
};


export const NIVEL_TEXTO = {
  'Tecnico': 'Técnico',
  'Tecnologo': 'Tecnólogo',
  'Operario': 'Operario',
  'Auxiliar': 'Auxiliar'
};


// ==========================================
// 5. FORMATO DE CÓDIGOS DE AMBIENTES
// ==========================================

export function pad3(valor) {
  return String(valor).padStart(3, '0');
}


// ==========================================
// 6. HORARIOS DE LAS JORNADAS
// ==========================================

export const HORARIO_JORNADA = {
  'Mañana': {
    inicio: '06:00',
    fin: '12:00'
  },

  'Tarde': {
    inicio: '12:00',
    fin: '18:00'
  },

  'Noche': {
    inicio: '18:00',
    fin: '22:00'
  },

  'FDS': {
    inicio: '06:00',
    fin: '18:00'
  }
};