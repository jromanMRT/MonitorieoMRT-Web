import { useEffect, useState } from "react";
import axios from "axios";

export default function DrawerDetalleSitio({ nombreSitio, onClose }) {
  const [equipos, setEquipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [tracerouteLoading, setTracerouteLoading] = useState({});
  const [tracerouteResult, setTracerouteResult] = useState({});

  // Cargar detalles de los equipos
  const cargar = async () => {
    try {
      const r = await axios.get(`http://localhost:3001/api/sitio/${nombreSitio}`);
      setEquipos(r.data);
      setLoading(false);
    } catch (err) {
      console.error("Error al cargar detalle del sitio:", err);
    }
  };

  useEffect(() => {
    cargar();
    const interval = setInterval(cargar, 5000);
    return () => clearInterval(interval);
  }, [nombreSitio]);

  // Actualizar el tiempo actual cada segundo para el contador de caídas
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Función para formatear segundos a HH:MM:SS
  const formatearDuracion = (segundosTotales) => {
    if (!segundosTotales || segundosTotales < 0) return "00:00:00";
    const horas = Math.floor(segundosTotales / 3600);
    const minutos = Math.floor((segundosTotales % 3600) / 60);
    const segundos = segundosTotales % 60;
    return [
      horas.toString().padStart(2, "0"),
      minutos.toString().padStart(2, "0"),
      segundos.toString().padStart(2, "0")
    ].join(":");
  };

  // Ejecutar traceroute manual para un equipo
  const ejecutarTraceroute = async (ip) => {
    setTracerouteLoading((prev) => ({ ...prev, [ip]: true }));
    setTracerouteResult((prev) => ({ ...prev, [ip]: null }));
    try {
      const r = await axios.get(`http://localhost:3001/api/traceroute/${ip}`);
      setTracerouteResult((prev) => ({ ...prev, [ip]: r.data.saltos }));
    } catch {
      alert("Error ejecutando traceroute manual");
    } finally {
      setTracerouteLoading((prev) => ({ ...prev, [ip]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Panel deslizable */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col transition-transform duration-300 transform translate-x-0 border-l border-slate-200 dark:border-slate-800">
        {/* Cabecera */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Detalle del Sitio</span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{nombreSitio}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition active:scale-90 font-bold"
          >
            ✕ Cerrar
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-2 text-slate-500">
              <div className="animate-spin text-3xl">⚙️</div>
              <span>Obteniendo estados de equipos...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {equipos.map((e) => {
                let statusBadge = "bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/5 dark:text-green-400";
                let statusText = "🟢 En Línea";

                if (e.estadoActual === "ERROR" || !e.online) {
                  statusBadge = "bg-red-500/10 text-red-700 border-red-500/20 dark:bg-red-500/5 dark:text-red-400";
                  statusText = "🔴 Fuera de Servicio";
                } else if (e.estadoActual === "FLAPPING") {
                  statusBadge = "bg-orange-500/10 text-orange-700 border-orange-500/20 dark:bg-orange-500/5 dark:text-orange-400";
                  statusText = "⚠ Inestable (Flapping)";
                }

                // Cálculo del tiempo de caída en tiempo real
                let tiempoCaidaStr = "";
                if (!e.online && e.caidoDesde) {
                  const msCaido = currentTime - e.caidoDesde;
                  const segsCaido = Math.floor(msCaido / 1000);
                  tiempoCaidaStr = `Caído desde hace ${formatearDuracion(segsCaido)}`;
                }

                return (
                  <div
                    key={e.ip}
                    className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">{e.nombre}</h3>
                        <span className="text-xs text-slate-500 font-mono">{e.ip}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusBadge}`}>
                          {statusText}
                        </span>
                        {tiempoCaidaStr && (
                          <span className="text-xs text-red-600 dark:text-red-400 font-bold mt-1 animate-pulse">
                            {tiempoCaidaStr}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Métricas de latencia y disponibilidad */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-slate-500 block mb-0.5">Latencia Actual</span>
                        <strong className="text-sm dark:text-white">{e.online ? `${e.latencia} ms` : "-"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Min / Max</span>
                        <strong className="text-sm dark:text-white">
                          {e.online ? `${e.pingMin} / ${e.pingMax} ms` : "-"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Latencia Promedio</span>
                        <strong className="text-sm dark:text-white">{e.online ? `${e.pingPromedio} ms` : "-"}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block mb-0.5">Disponibilidad (30d)</span>
                        <strong className="text-sm text-blue-600 dark:text-blue-400 font-bold">
                          {e.disponibilidad}%
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Último éxito: <strong className="dark:text-slate-300">{e.lastSuccessTime}</strong></span>
                      <button
                        onClick={() => ejecutarTraceroute(e.ip)}
                        disabled={tracerouteLoading[e.ip]}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {tracerouteLoading[e.ip] ? "Analizando..." : "Traceroute Manual"}
                      </button>
                    </div>

                    {/* Contenedor de Traceroute */}
                    {tracerouteResult[e.ip] && (
                      <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-xs overflow-x-auto border border-slate-800 max-h-48">
                        <div className="font-bold border-b border-slate-800 pb-1.5 mb-1.5 text-blue-400">
                          Resultados del Traceroute manual para {e.ip}:
                        </div>
                        {tracerouteResult[e.ip].map((s) => (
                          <div key={s.salto} className="flex space-x-4">
                            <span className="text-slate-500 w-6">{s.salto}</span>
                            <span className="w-16">{s.intento1}</span>
                            <span className="w-16">{s.intento2}</span>
                            <span className="w-16">{s.intento3}</span>
                            <span className="text-green-400">{s.ip}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
