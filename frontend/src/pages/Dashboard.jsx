import { useState } from "react";
import TarjetaSitio from "../components/TarjetaSitio";
import DrawerDetalleSitio from "../components/DrawerDetalleSitio";

export default function Dashboard({ sitios, errorConexion, ultimaActualizacion }) {
  const [selectedSitio, setSelectedSitio] = useState(null);

  // Computar contadores agregados por sitio
  const operativos = sitios.filter((s) => s.activos === s.total && s.inestables === 0).length;
  const parciales = sitios.filter((s) => s.activos > 0 && s.activos < s.total && s.inestables === 0).length;
  const inestables = sitios.filter((s) => s.inestables > 0).length;
  const sinServicio = sitios.filter((s) => s.activos === 0).length;

  return (
    <div className="space-y-6">
      {/* Cabecera / Info Monitoreo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-300">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Panel de Monitoreo
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verificación automática y alertas en tiempo real.
          </p>
        </div>
        <div className="text-xs md:text-sm font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700">
          🔄 Última actualización:{" "}
          <strong className="text-slate-900 dark:text-white">
            {ultimaActualizacion ? ultimaActualizacion.toLocaleTimeString() : "Cargando..."}
          </strong>
        </div>
      </div>

      {/* Resumen de Estados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition duration-300">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center text-xl font-bold">
            🟢
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Operativos</span>
            <strong className="text-2xl font-black dark:text-white">{operativos}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition duration-300">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-600 flex items-center justify-center text-xl font-bold">
            🟡
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Parciales</span>
            <strong className="text-2xl font-black dark:text-white">{parciales}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition duration-300">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center text-xl font-bold">
            ⚡
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Inestables</span>
            <strong className="text-2xl font-black dark:text-white">{inestables}</strong>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4 transition duration-300">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-600 flex items-center justify-center text-xl font-bold">
            🔴
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Sin Servicio</span>
            <strong className="text-2xl font-black dark:text-white">{sinServicio}</strong>
          </div>
        </div>
      </div>

      {/* Alerta de error de conexión con el backend */}
      {errorConexion && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 p-4 rounded-2xl flex items-center gap-3 font-semibold text-sm animate-pulse">
          <span>⚠️</span> No se puede conectar con el servidor de monitoreo. Comprueba que el backend esté ejecutándose.
        </div>
      )}

      {/* Grid de Sitios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sitios.map((sitio) => (
          <TarjetaSitio
            key={sitio.sitio}
            sitio={sitio}
            onClick={() => setSelectedSitio(sitio.sitio)}
          />
        ))}
      </div>

      {/* Drawer lateral de detalles de sitio */}
      {selectedSitio && (
        <DrawerDetalleSitio
          nombreSitio={selectedSitio}
          onClose={() => setSelectedSitio(null)}
        />
      )}
    </div>
  );
}