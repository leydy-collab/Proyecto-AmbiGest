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

function App() {

  const [sidebarColapsado, setSidebarColapsado] = useState(false);

  const [rol, setRol] = useState('administrador');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLoginSuccess = (rolAsignado) => {
    setRol(rolAsignado);
    setIsLoggedIn(true);
  };

  const handleLogout = () =>{
    setIsLoggedIn(false);
  };

  if(!isLoggedIn){
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

return (
  <Router>
    {/* pasar estado y funcion */}
    <Header onLogout={handleLogout} sidebarColapsado={sidebarColapsado} setSidebarColapsado={setSidebarColapsado} />

    {/* contenedor principal */}
    <div className="flex w-full">
      {/* pasar rol y estado actual */}
      <SideBar rol={rol} sidebarColapsado={sidebarColapsado} />
      
      {/* El contenido se adapta automáticamente segun se reduzca el sidebar gracias a w-full y flex-1 */}
      <div className="flex-1 bg-gray-50 py-6 px-10 min-h-[calc(100vh-56px)] overflow-y-auto transition-all duration-300">
        <Routes>
          <Route path="/" element={<Inicio rol={rol} />} />
          <Route path="/ambientes" element={rol === 'administrador' ? <Ambientes /> : <Inicio rol={rol} />} />
          <Route path="/instructores" element={rol === 'administrador' ? <Instructores /> : <Inicio rol={rol} />} />
          <Route path="/fichas" element={rol === 'administrador' ? <Fichas /> : <Inicio rol={rol} />} />
          <Route path="/agenda" element={<Agenda rol={rol} />} />
          <Route path="/novedades" element={<Novedades rol={rol} />} />
        </Routes>
      </div>
    </div>
  </Router>
);
}

export default App;
