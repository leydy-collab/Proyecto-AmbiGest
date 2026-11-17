import { NavLink } from 'react-router-dom';
import * as FaIcons from 'react-icons/fa';
import * as GoIcons from 'react-icons/go';
import * as IoIcons from 'react-icons/io';

const SideBar = ({ rol, sidebarColapsado, pendientes = 0 }) => {
    // Solo el administrador ve cuántas novedades están pendientes
    const hayPendientes = rol === 'administrador' && pendientes > 0;
    //Justify-center centra el icono si está colapsado
    const baseLinksClass = "rounded py-2.5 w-full flex items-center transition-all duration-300 no-underline text-lg px-3 overflow-hidden";
    const activeLinkClass = "bg-verde-oscuro text-white shadow-sm font-bold";
    const inactiveLinkClass = "text-verde-oscuro hover:bg-gray-100";

    return (
        // w-60 si está abierto, w-18 si está colapsado.
        <div className={`h-[calc(100vh-52px)] border-r border-gris-borde bg-white transition-all duration-300 ease-in-out ${
            sidebarColapsado ? 'w-18' : 'w-60'
        }`}>
            <ul className="list-none p-3 m-0 flex flex-col gap-2">
                <li>
                    <NavLink to="/" className={({ isActive }) => `${baseLinksClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                        <GoIcons.GoHomeFill className="text-xl flex-shrink-0 min-w-[24px] text-center"/>
                        {/* ocultam el texto suavemente */}
                        <span className={`pl-3 transition-all duration-200 text-sm whitespace-nowrap ${sidebarColapsado ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-40'}`}>Inicio</span>
                    </NavLink>
                </li>
                {rol === 'administrador' && (
                    <li>
                        <NavLink to="/ambientes" className={({ isActive }) => `${baseLinksClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                            <FaIcons.FaBuilding className="text-lg flex-shrink-0 min-w-[24px] text-center"/>
                            <span className={`pl-3 transition-all duration-200 text-sm whitespace-nowrap ${sidebarColapsado ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-40'}`}>Ambientes</span>
                        </NavLink>
                    </li>
                )}
                {rol === 'administrador' && (
                    <li>
                        <NavLink to="/instructores" className={({ isActive }) => `${baseLinksClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                            <FaIcons.FaUserFriends className="text-lg flex-shrink-0 min-w-[24px] text-center"/>
                            <span className={`pl-3 transition-all duration-200 text-sm whitespace-nowrap ${sidebarColapsado ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-40'}`}>Instructores</span>
                        </NavLink>
                    </li>
                )}
                {rol === 'administrador' && (
                    <li>
                        <NavLink to="/fichas" className={({ isActive }) => `${baseLinksClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                            <IoIcons.IoMdSchool className="text-lg flex-shrink-0 min-w-[24px] text-center"/>
                            <span className={`pl-3 transition-all duration-200 text-sm whitespace-nowrap ${sidebarColapsado ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-40'}`}>Fichas</span>
                        </NavLink>
                    </li>
                )}
                <li>
                    <NavLink to="/agenda" className={({ isActive }) => `${baseLinksClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                        <FaIcons.FaCalendarAlt className="text-lg flex-shrink-0 min-w-[24px] text-center"/>
                        <span className={`pl-3 transition-all duration-200 text-sm whitespace-nowrap ${sidebarColapsado ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-40'}`}>Agenda</span>
                    </NavLink>
                </li>
                <li>
                    <NavLink to="/novedades" className={({ isActive }) => `${baseLinksClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>
                        <span className="relative flex-shrink-0">
                            <IoIcons.IoMdNotifications className="text-lg min-w-[24px] text-center"/>
                            {/* menú colapsado: solo un punto rojo sobre el icono */}
                            {hayPendientes && sidebarColapsado && (
                                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rojo-alerta rounded-full border-2 border-white"></span>
                            )}
                        </span>
                        <span className={`pl-3 transition-all duration-200 text-sm whitespace-nowrap ${sidebarColapsado ? 'opacity-0 max-w-0 pointer-events-none' : 'opacity-100 max-w-40'}`}>Novedades</span>
                        {/* menú abierto: el número de pendientes al lado del texto */}
                        {hayPendientes && !sidebarColapsado && (
                            <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-rojo-alerta text-white text-[11px] font-bold rounded-full flex items-center justify-center">
                                {pendientes > 99 ? '99+' : pendientes}
                            </span>
                        )}
                    </NavLink>
                </li>
            </ul>
        </div>
    );
}

export default SideBar;

