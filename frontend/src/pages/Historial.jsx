import { useEffect, useState } from "react";
import axios from "axios";

export default function Historial() {
  const [eventos, setEventos] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(15);

  // Filtros y búsquedas
  const [sitiosList, setSitiosList] = useState([]);
  const [equiposList, setEquiposList] = useState([]); // Todos los equipos
  const [equiposFiltrados, setEquiposFiltrados] = useState([]); // Equipos del sitio seleccionado

  const [filtroSitio, setFiltroSitio] = useState("");
  const [filtroEquipo, setFiltroEquipo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroFechaInicio, setFiltroFechaInicio] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");
  const [busqueda, setBusqueda] = useState("");

  // Ordenamiento
  const [sortCol, setSortCol] = useState("fecha");
  const [sortDir, setSortDir] = useState("DESC");

  // Modal para ver traceroute
  const [selectedTraceroute, setSelectedTraceroute] = useState(null);
  const [tracerouteLoading, setTracerouteLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Cargar lista de equipos y sitios únicos para los filtros
  const cargarFiltrosIniciales = async () => {
    try {
      const r = await axios.get("http://localhost:3001/api/equipos");
      setEquiposList(r.data);

      // Extraer sitios únicos
      const sitiosUnicos = [...new Set(r.data.map((e) => e.sitio))];
      setSitiosList(sitiosUnicos);
    } catch (err) {
      console.error("Error al cargar equipos para filtros:", err);
    }
  };

  // Cargar eventos del historial
  const cargarEventos = async () => {
    try {
      const params = {
        page: currentPage,
        limit,
        sitio: filtroSitio,
        equipo: filtroEquipo,
        estado: filtroEstado,
        fecha_inicial: filtroFechaInicio,
        fecha_final: filtroFechaFin,
        buscar: busqueda,
        sort_col: sortCol,
        sort_dir: sortDir
      };

      const r = await axios.get("http://localhost:3001/api/historial", { params });
      setEventos(r.data.datos);
      setTotalPages(r.data.paginas);
      setTotalRecords(r.data.total);
    } catch (err) {
      console.error("Error cargando eventos de historial:", err);
    }
  };

  // Filtrar equipos dropdown cuando cambia el sitio seleccionado
  useEffect(() => {
    if (filtroSitio) {
      const filtrados = equiposList.filter((e) => e.sitio === filtroSitio);
      setEquiposFiltrados(filtrados);
    } else {
      setEquiposFiltrados([]);
    }
    setFiltroEquipo(""); // Resetear equipo seleccionado
  }, [filtroSitio, equiposList]);

  // Cargar datos
  useEffect(() => {
    cargarFiltrosIniciales();
  }, []);

  // Recargar eventos cuando cambian filtros, ordenación o página
  useEffect(() => {
    cargarEventos();
  }, [currentPage, filtroSitio, filtroEquipo, filtroEstado, filtroFechaInicio, filtroFechaFin, sortCol, sortDir]);

  // Manejar el cambio de ordenación de columnas
  const alternarOrden = (columna) => {
    if (sortCol === columna) {
      setSortDir(sortDir === "ASC" ? "DESC" : "ASC");
    } else {
      setSortCol(columna);
      setSortDir("DESC");
    }
    setCurrentPage(1);
  };

  // Consultar y abrir traceroute asociado
  const verTraceroute = async (eventoId) => {
    setTracerouteLoading(true);
    setSelectedTraceroute(null);
    setModalOpen(true);
    try {
      const r = await axios.get(`http://localhost:3001/api/traceroute/evento/${eventoId}`);
      setSelectedTraceroute(r.data.traceroute || "Traceroute vacío o no registrado.");
    } catch (err) {
      setSelectedTraceroute("No se pudo obtener el traceroute para este evento.");
    } finally {
      setTracerouteLoading(false);
    }
  };

  // Formatear segundos de caída a HH:MM:SS
  const formatearDuracion = (segundos) => {
    if (!segundos || segundos < 0) return "-";
    const hrs = Math.floor(segundos / 3600);
    const mins = Math.floor((segundos % 3600) / 60);
    const segs = segundos % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${segs.toString().padStart(2, "0")}`;
  };

  // Ejecutar búsqueda por texto
  const handleBuscar = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    cargarEventos();
  };

  return (
    <div className="space-y-6">
      {/* Título de la sección */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Historial Avanzado
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Histórico detallado de eventos de conectividad, caídas e inestabilidades.
        </p>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Filtro Sitio */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Sitio</label>
            <select
              value={filtroSitio}
              onChange={(e) => {
                setFiltroSitio(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="">Todos los sitios</option>
              {sitiosList.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Equipo */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Equipo</label>
            <select
              value={filtroEquipo}
              onChange={(e) => {
                setFiltroEquipo(e.target.value);
                setCurrentPage(1);
              }}
              disabled={!filtroSitio}
              className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white disabled:opacity-50"
            >
              <option value="">Todos los equipos</option>
              {equiposFiltrados.map((eq) => (
                <option key={eq.ip} value={eq.nombre}>
                  {eq.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Estado */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Estado Nuevo</label>
            <select
              value={filtroEstado}
              onChange={(e) => {
                setFiltroEstado(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
            >
              <option value="">Todos los estados</option>
              <option value="Online">🟢 Online</option>
              <option value="Offline">🔴 Offline</option>
              <option value="Inestable">🟡 Inestable</option>
            </select>
          </div>

          {/* Fecha Inicial */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Fecha Inicial</label>
            <input
              type="date"
              value={filtroFechaInicio}
              onChange={(e) => {
                setFiltroFechaInicio(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>

          {/* Fecha Final */}
          <div className="flex flex-col">
            <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Fecha Final</label>
            <input
              type="date"
              value={filtroFechaFin}
              onChange={(e) => {
                setFiltroFechaFin(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
            />
          </div>
        </div>

        {/* Buscador de Texto */}
        <form onSubmit={handleBuscar} className="flex gap-2">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por Sitio, Equipo o IP..."
            className="flex-1 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition active:scale-95 cursor-pointer"
          >
            🔍 Buscar
          </button>
        </form>
      </div>

      {/* Tabla de Eventos */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 font-semibold select-none">
                <th onClick={() => alternarOrden("fecha")} className="p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                  Fecha y Hora {sortCol === "fecha" && (sortDir === "ASC" ? "🔼" : "🔽")}
                </th>
                <th onClick={() => alternarOrden("sitio")} className="p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                  Sitio {sortCol === "sitio" && (sortDir === "ASC" ? "🔼" : "🔽")}
                </th>
                <th onClick={() => alternarOrden("equipo")} className="p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                  Equipo {sortCol === "equipo" && (sortDir === "ASC" ? "🔼" : "🔽")}
                </th>
                <th onClick={() => alternarOrden("ip")} className="p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                  IP {sortCol === "ip" && (sortDir === "ASC" ? "🔼" : "🔽")}
                </th>
                <th onClick={() => alternarOrden("estado_anterior")} className="p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                  Estado Ant. {sortCol === "estado_anterior" && (sortDir === "ASC" ? "🔼" : "🔽")}
                </th>
                <th onClick={() => alternarOrden("estado_nuevo")} className="p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                  Estado Nuevo {sortCol === "estado_nuevo" && (sortDir === "ASC" ? "🔼" : "🔽")}
                </th>
                <th onClick={() => alternarOrden("duracion")} className="p-4 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                  Tiempo Caída {sortCol === "duracion" && (sortDir === "ASC" ? "🔼" : "🔽")}
                </th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {eventos.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    No se encontraron registros en el historial.
                  </td>
                </tr>
              ) : (
                eventos.map((ev) => {
                  let badge = "bg-green-500/10 text-green-700 dark:bg-green-500/5 dark:text-green-400";
                  if (ev.estado_nuevo === "Offline") {
                    badge = "bg-red-500/10 text-red-700 dark:bg-red-500/5 dark:text-red-400";
                  } else if (ev.estado_nuevo === "Inestable") {
                    badge = "bg-orange-500/10 text-orange-700 dark:bg-orange-500/5 dark:text-orange-400";
                  }

                  return (
                    <tr key={ev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition text-slate-700 dark:text-slate-300">
                      <td className="p-4 font-mono text-xs">{new Date(ev.fecha).toLocaleString()}</td>
                      <td className="p-4 font-bold">{ev.sitio}</td>
                      <td className="p-4">{ev.equipo}</td>
                      <td className="p-4 font-mono text-xs text-slate-500">{ev.ip}</td>
                      <td className="p-4">{ev.estado_anterior || "-"}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge}`}>
                          {ev.estado_nuevo === "Online" ? "🟢 OK" : ev.estado_nuevo === "Offline" ? "🔴 ERROR" : "🟡 Inestable"}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-xs text-red-600 dark:text-red-400 font-bold">
                        {formatearDuracion(ev.duracion)}
                      </td>
                      <td className="p-4 text-center">
                        {ev.estado_nuevo === "Offline" || ev.traceroute ? (
                          <button
                            onClick={() => verTraceroute(ev.id)}
                            className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 rounded-md transition active:scale-95 cursor-pointer"
                          >
                            🔍 Ver Traceroute
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Mostrando página <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong> de{" "}
              <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong> ({totalRecords} registros)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-lg transition disabled:opacity-40 cursor-pointer"
              >
                ◀ Anterior
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-lg transition disabled:opacity-40 cursor-pointer"
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Traceroute */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden transform scale-100 transition-all duration-300">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Resultado de Traceroute Automático</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold transition"
              >
                ✕
              </button>
            </div>
            <div className="p-6 bg-slate-950 text-slate-200 font-mono text-xs overflow-y-auto max-h-96 min-h-48 rounded-b-2xl">
              {tracerouteLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2 text-slate-400">
                  <div className="animate-spin text-2xl">⚙️</div>
                  <span>Obteniendo log de saltos...</span>
                </div>
              ) : selectedTraceroute ? (
                <pre className="whitespace-pre-wrap leading-relaxed">{selectedTraceroute}</pre>
              ) : (
                <div className="text-slate-500 py-12 text-center">No hay traceroute disponible para este incidente.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}