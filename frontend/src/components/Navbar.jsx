import { Link, useLocation } from "react-router-dom";

export default function Navbar({
  isDark,
  setIsDark,
  isSoundEnabled,
  setIsSoundEnabled,
  isNotificationEnabled,
  onToggleNotifications,
}) {
  const location = useLocation();

  const activeClass = (path) =>
    location.pathname === path
      ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white";

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo + Links */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-2xl">📡</span>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Monitorieo MRT
              </span>
            </Link>
            <div className="hidden md:flex items-center space-x-2">
              <Link to="/" className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${activeClass("/")}`}>
                Dashboard
              </Link>
              <Link to="/historial" className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${activeClass("/historial")}`}>
                Historial
              </Link>
              <Link to="/estadisticas" className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${activeClass("/estadisticas")}`}>
                Estadísticas
              </Link>
              <Link to="/traceroute" className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${activeClass("/traceroute")}`}>
                Traceroute Manual
              </Link>
              <Link to="/configuracion" className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${activeClass("/configuracion")}`}>
                Configuración
              </Link>
            </div>
          </div>

          {/* Controles de la derecha */}
          <div className="flex items-center gap-3">

            {/* Toggle de sonido */}
            <label
              className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-slate-600 dark:text-slate-400 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isSoundEnabled ? "Desactivar alertas sonoras" : "Activar alertas sonoras"}
            >
              <input
                type="checkbox"
                checked={isSoundEnabled}
                onChange={(e) => setIsSoundEnabled(e.target.checked)}
                className="sr-only"
              />
              <span className={`text-base ${isSoundEnabled ? "opacity-100" : "opacity-40"}`}>
                {isSoundEnabled ? "🔊" : "🔇"}
              </span>
              <span className="hidden sm:inline">
                {isSoundEnabled ? "Sonido" : "Mute"}
              </span>
            </label>

            {/* Toggle de notificaciones */}
            <label
              className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-semibold text-slate-600 dark:text-slate-400 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={isNotificationEnabled ? "Desactivar notificaciones" : "Activar notificaciones del navegador"}
              onClick={(e) => {
                // Usar onClick en el label para manejar el flujo async
                e.preventDefault();
                onToggleNotifications(!isNotificationEnabled);
              }}
            >
              <span className={`text-base ${isNotificationEnabled ? "opacity-100" : "opacity-40"}`}>
                {isNotificationEnabled ? "🔔" : "🔕"}
              </span>
              <span className="hidden sm:inline">
                {isNotificationEnabled ? "Alertas" : "Sin alertas"}
              </span>
            </label>

            {/* Modo oscuro */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer text-xs font-semibold"
              title="Alternar tema claro/oscuro"
            >
              <span className="text-base">{isDark ? "☀️" : "🌙"}</span>
              <span className="hidden sm:inline">{isDark ? "Claro" : "Oscuro"}</span>
            </button>

          </div>
        </div>

        {/* Navbar móvil */}
        <div className="md:hidden flex justify-around border-t border-slate-100 dark:border-slate-800 py-2">
          <Link to="/" className={`px-2 py-1 rounded text-xs font-bold transition ${activeClass("/")}`}>
            Dashboard
          </Link>
          <Link to="/historial" className={`px-2 py-1 rounded text-xs font-bold transition ${activeClass("/historial")}`}>
            Historial
          </Link>
          <Link to="/estadisticas" className={`px-2 py-1 rounded text-xs font-bold transition ${activeClass("/estadisticas")}`}>
            Estadísticas
          </Link>
          <Link to="/configuracion" className={`px-2 py-1 rounded text-xs font-bold transition ${activeClass("/configuracion")}`}>
            Config
          </Link>
        </div>
      </div>
    </nav>
  );
}
