export default function TarjetaSitio({ sitio, onClick }) {
  let color = "bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/5 dark:text-green-400 dark:border-green-500/10";
  let texto = "🟢 Operativo";

  if (sitio.activos === 0) {
    color = "bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/5 dark:text-red-400 dark:border-red-500/10";
    texto = "🔴 Sin Servicio";
  } else if (sitio.activos < sitio.total) {
    color = "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:bg-yellow-500/5 dark:text-yellow-400 dark:border-yellow-500/10";
    texto = "🟡 Parcial";
  }

  // Si hay equipos inestables (flapping), priorizar el aviso visual naranja
  if (sitio.inestables > 0) {
    color = "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:bg-orange-500/5 dark:text-orange-400 dark:border-orange-500/10";
    texto = "⚠ Conexión Inestable";
  }

  return (
    <div
      onClick={onClick}
      className={`
        ${color}
        rounded-xl
        shadow-sm
        p-5
        border
        hover:shadow-md
        transition-all
        duration-300
        hover:-translate-y-1
        cursor-pointer
        backdrop-blur-sm
        active:scale-98
        relative
        overflow-hidden
      `}
    >
      <div className="absolute top-0 right-0 p-3 opacity-20 text-4xl">
        {sitio.activos === 0 ? "⚠️" : sitio.inestables > 0 ? "⚡" : "✔️"}
      </div>

      <h2 className="text-xl font-extrabold tracking-tight dark:text-white">
        {sitio.sitio}
      </h2>

      <div className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <span>{texto}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-200/40 dark:border-slate-700/40 pt-3 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400 block">Equipos</span>
          <strong className="text-sm text-slate-800 dark:text-slate-200">
            {sitio.activos}/{sitio.total}
          </strong>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 block">Latencia Prom.</span>
          <strong className="text-sm text-slate-800 dark:text-slate-200">
            {sitio.latenciaPromedio} ms
          </strong>
        </div>
      </div>

      {/* Cálculo de Disponibilidad mensual */}
      <div className="mt-3 bg-slate-200/40 dark:bg-slate-800/40 rounded-lg p-2 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">Disponibilidad Mensual:</span>
        <strong className="text-blue-600 dark:text-blue-400 font-bold">
          {sitio.disponibilidadMensual}%
        </strong>
      </div>
    </div>
  );
}