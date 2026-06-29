import { useEffect, useState } from "react";
import axios from "axios";

export default function Traceroute() {
  const [equipos, setEquipos] = useState([]);
  const [ip, setIp] = useState("");
  const [saltos, setSaltos] = useState([]);
  const [ejecutando, setEjecutando] = useState(false);

  const ultimoSalto = saltos.length > 0 ? saltos[saltos.length - 1].ip : null;

  const cargarEquipos = async () => {
    try {
      const r = await axios.get("/api/api/equipos");
      setEquipos(r.data);
      if (r.data.length > 0) {
        setIp(r.data[0].ip);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    cargarEquipos();
  }, []);

  const ejecutar = async () => {
    setEjecutando(true);
    setSaltos([]);
    try {
      const r = await axios.get(`/api/api/traceroute/${ip}`);
      setSaltos(r.data.saltos);
    } catch {
      alert("Error ejecutando traceroute");
    } finally {
      setEjecutando(false);
    }
  };

  const equipoSeleccionado = equipos.find((e) => e.ip === ip);

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Traceroute Manual
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Analiza la ruta de red y saltos hacia cualquier IP o equipo remoto.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel Izquierdo: Configuración */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            ⚙️ Destino
          </h2>

          <div className="flex flex-col space-y-3">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Seleccionar Equipo</label>
              <select
                className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
              >
                {equipos.map((equipo) => (
                  <option key={equipo.ip} value={equipo.ip}>
                    [{equipo.sitio}] {equipo.nombre} ({equipo.ip})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase">O ingresar IP / Hostname</label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="Ej: 192.168.1.1 o google.com"
                className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
            </div>

            {equipoSeleccionado && (
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div>
                  Sitio: <strong className="text-slate-800 dark:text-white">{equipoSeleccionado.sitio}</strong>
                </div>
                <div>
                  Equipo: <strong className="text-slate-800 dark:text-white">{equipoSeleccionado.nombre}</strong>
                </div>
                <div>
                  IP: <strong className="text-slate-800 dark:text-white">{ip}</strong>
                </div>
              </div>
            )}

            <button
              onClick={ejecutar}
              disabled={ejecutando || !ip}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl transition shadow-xs hover:shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {ejecutando ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚙️</span> Analizando ruta...
                </span>
              ) : (
                "🚀 Ejecutar Traceroute"
              )}
            </button>
          </div>
        </div>

        {/* Panel Derecho: Resultados */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col min-h-96">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-4">
            🖥️ Consola de Saltos
          </h2>

          {ejecutando && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-slate-500 py-12">
              <div className="animate-spin text-3xl">⚙️</div>
              <span className="text-sm font-semibold">Trazando ruta de red en el servidor...</span>
              <span className="text-xs text-slate-400">Este proceso puede demorar hasta 30 segundos.</span>
            </div>
          )}

          {!ejecutando && saltos.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-slate-400 py-12 text-sm">
              Presiona "Ejecutar Traceroute" para iniciar el trazado de saltos.
            </div>
          )}

          {!ejecutando && saltos.length > 0 && (
            <div className="space-y-4 flex-1 flex flex-col">
              {ultimoSalto && (
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 p-3 rounded-xl text-xs font-semibold">
                  🏁 Último salto recibido exitosamente de: <strong>{ultimoSalto}</strong>
                </div>
              )}

              <div className="flex-1 bg-slate-950 text-slate-100 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-slate-800">
                <div className="grid grid-cols-12 border-b border-slate-800 pb-2 mb-2 font-bold text-slate-400">
                  <div className="col-span-2">Salto</div>
                  <div className="col-span-2">Intento 1</div>
                  <div className="col-span-2">Intento 2</div>
                  <div className="col-span-2">Intento 3</div>
                  <div className="col-span-4">Dirección IP</div>
                </div>

                <div className="space-y-1.5">
                  {saltos.map((s) => (
                    <div key={s.salto} className="grid grid-cols-12 hover:bg-slate-900 py-0.5 rounded transition">
                      <div className="col-span-2 text-slate-500 font-bold">{s.salto}</div>
                      <div className="col-span-2">{s.intento1}</div>
                      <div className="col-span-2">{s.intento2}</div>
                      <div className="col-span-2">{s.intento3}</div>
                      <div className="col-span-4 text-green-400 font-bold">{s.ip}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}