import React, {useState} from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Header from './components/Header';
import SideBar from './components/SideBar';
import Inicio from './pages/Inicio';
import Ambientes from './pages/Ambientes';
import Instructores from './pages/Instructores';
import Fichas from './pages/Fichas';
import Agenda from './pages/Agenda';
import Novedades from './pages/Novedades';
import AvisoNovedad from './components/AvisoNovedad';
import useNovedadesPendientes from './hooks/useNovedadesPendientes';

function App() {

  const [sidebarColapsado, setSidebarColapsado] = useState(false);

  const [rol, setRol] = useState('administrador');
  const [usuario, setUsuario] = useState(null); // datos del usuario que inició sesión: { id, nombre, apellido, correo, rol }
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Solo el administrador consulta las novedades que reportan los instructores:
  // pendientes = número de la campana, nueva = aviso emergente cuando llega una
  const { pendientes, nueva, cerrarAviso, refrescar } = useNovedadesPendientes(isLoggedIn && rol === 'administrador');

  // Login.jsx llama a onLoginSuccess(rol, usuario): ahora SÍ se guarda el usuario (antes se descartaba),
  // porque el instructor lo necesita para registrar novedades y ver su propia agenda
  const handleLoginSuccess = (rolAsignado, usuarioLogueado) => {
    window.history.replaceState(null, '', '/'); // siempre empieza en Inicio
    setRol(rolAsignado);
    setUsuario(usuarioLogueado);
    setIsLoggedIn(true);
  };

  const handleLogout = () =>{
    setIsLoggedIn(false);
    setUsuario(null);
  };

  if(!isLoggedIn){
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

return (
  <Router>
    {/* pasar estado y funcion */}
    <Header onLogout={handleLogout} sidebarColapsado={sidebarColapsado} setSidebarColapsado={setSidebarColapsado} rol={rol} pendientes={pendientes} />

    {/* aviso emergente para el administrador cuando un instructor reporta una novedad */}
    <AvisoNovedad novedad={nueva} onCerrar={cerrarAviso} />

    {/* contenedor principal */}
    <div className="flex w-full">
      {/* pasar rol y estado actual */}
      <SideBar rol={rol} sidebarColapsado={sidebarColapsado} pendientes={pendientes} />
      
      {/* El contenido se adapta automáticamente segun se reduzca el sidebar gracias a w-full y flex-1 */}
      <div className="flex-1 bg-gray-50 py-6 px-10 min-h-[calc(100vh-56px)] overflow-y-auto transition-all duration-300">
        <Routes>
          <Route path="/" element={<Inicio rol={rol} usuario={usuario} />} />
          <Route path="/ambientes" element={rol === 'administrador' ? <Ambientes /> : <Inicio rol={rol} usuario={usuario} />} />
          <Route path="/instructores" element={rol === 'administrador' ? <Instructores /> : <Inicio rol={rol} usuario={usuario} />} />
          <Route path="/fichas" element={rol === 'administrador' ? <Fichas /> : <Inicio rol={rol} usuario={usuario} />} />
          <Route path="/agenda" element={<Agenda rol={rol} usuario={usuario} onColapsarMenu={() => setSidebarColapsado(true)} />} />
          <Route path="/novedades" element={<Novedades rol={rol} usuario={usuario} onCambio={refrescar} />} />
        </Routes>
      </div>
    </div>
  </Router>
);
}

export default App;
