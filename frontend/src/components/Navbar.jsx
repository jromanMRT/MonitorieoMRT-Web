import { Link, useLocation } from "react-router-dom";

export default function Navbar({ isDark, setIsDark, isSoundEnabled, setIsSoundEnabled }) {
  const location = useLocation();

  const activeClass = (path) =>
    location.pathname === path
      ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white"
      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white";

  return (
    <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
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

          <div className="flex items-center space-x-4">
            {/* Control rápido de sonido */}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-600 dark:text-slate-400">
              <input
                type="checkbox"
                checked={isSoundEnabled}
                onChange={(e) => setIsSoundEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
              />
              <span>{isSoundEnabled ? "🔊 Sonido Activo" : "🔇 Silenciado"}</span>
            </label>

            {/* Selector de modo oscuro */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95 cursor-pointer"
              title="Alternar Tema"
            >
              {isDark ? "☀️ Claro" : "🌙 Oscuro"}
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
