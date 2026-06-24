import { useEffect, useState } from "react";
import axios from "axios";

export default function Configuracion({ onConfigChange }) {
  // Configuración general del sistema
  const [config, setConfig] = useState({
    intervalo_monitoreo: 10,
    intentos_caida: 3,
    alerta_sonido: true,
    alerta_telegram: false,
    telegram_token: "",
    telegram_chat_id: "",
    alerta_notificaciones: true
  });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSavedSuccess, setConfigSavedSuccess] = useState(false);

  // Gestión de equipos (CRUD)
  const [equipos, setEquipos] = useState([]);
  const [loadingEquipos, setLoadingEquipos] = useState(true);
  
  // Estado del formulario de equipos
  const [sitioInput, setSitioInput] = useState("");
  const [nombreInput, setNombreInput] = useState("");
  const [ipInput, setIpInput] = useState("");
  const [editingId, setEditingId] = useState(null); // ID del equipo que se está editando
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Cargar configuración general
  const cargarConfig = async () => {
    try {
      const r = await axios.get("http://localhost:3001/api/config");
      if (r.data) {
        setConfig({
          intervalo_monitoreo: r.data.intervalo_monitoreo,
          intentos_caida: r.data.intentos_caida,
          alerta_sonido: r.data.alerta_sonido === 1,
          alerta_telegram: r.data.alerta_telegram === 1,
          telegram_token: r.data.telegram_token || "",
          telegram_chat_id: r.data.telegram_chat_id || "",
          alerta_notificaciones: r.data.alerta_notificaciones === 1
        });
      }
      setLoadingConfig(false);
    } catch (err) {
      console.error("Error al obtener configuración:", err);
    }
  };

  // Cargar lista de equipos
  const cargarEquipos = async () => {
    try {
      const r = await axios.get("http://localhost:3001/api/equipos-config");
      setEquipos(r.data || []);
      setLoadingEquipos(false);
    } catch (err) {
      console.error("Error al obtener equipos de la DB:", err);
    }
  };

  useEffect(() => {
    cargarConfig();
    cargarEquipos();
  }, []);

  const handleConfigChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const guardarConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigSavedSuccess(false);

    try {
      await axios.post("http://localhost:3001/api/config", config);
      setConfigSavedSuccess(true);
      if (onConfigChange) {
        onConfigChange(); // Sincronizar intervalo en el componente principal
      }
      setTimeout(() => setConfigSavedSuccess(false), 4000);
    } catch (err) {
      alert("Error al guardar la configuración del sistema");
    } finally {
      setSavingConfig(false);
    }
  };

  // Enviar formulario de equipo (Creación / Modificación)
  const handleEquipoSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    const sitio = sitioInput.trim();
    const nombre = nombreInput.trim();
    const ip = ipInput.trim();

    if (!sitio || !nombre || !ip) {
      setFormError("Todos los campos son obligatorios.");
      return;
    }

    // Validar formato de IP o Hostname básico
    const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
    if (!ipPattern.test(ip)) {
      setFormError("Dirección IP o Hostname con formato inválido.");
      return;
    }

    try {
      if (editingId) {
        // Actualizar equipo
        await axios.put(`http://localhost:3001/api/equipos-config/${editingId}`, { sitio, nombre, ip });
        setFormSuccess("Equipo actualizado exitosamente.");
        setEditingId(null);
      } else {
        // Crear equipo
        await axios.post("http://localhost:3001/api/equipos-config", { sitio, nombre, ip });
        setFormSuccess("Nuevo equipo agregado y en monitoreo.");
      }

      // Resetear campos del formulario
      setSitioInput("");
      setNombreInput("");
      setIpInput("");
      
      // Recargar lista y avisar al dashboard de inmediato
      cargarEquipos();
      if (onConfigChange) onConfigChange();
      setTimeout(() => setFormSuccess(""), 4000);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setFormError(err.response.data.error);
      } else {
        setFormError("Error al procesar la solicitud de equipos.");
      }
    }
  };

  // Cargar equipo en el formulario para editar
  const iniciarEdicion = (eq) => {
    setEditingId(eq.id);
    setSitioInput(eq.sitio);
    setNombreInput(eq.nombre);
    setIpInput(eq.ip);
    setFormError("");
    setFormSuccess("");
  };

  // Cancelar modo de edición
  const cancelarEdicion = () => {
    setEditingId(null);
    setSitioInput("");
    setNombreInput("");
    setIpInput("");
    setFormError("");
  };

  // Eliminar equipo de monitoreo
  const eliminarEquipo = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar "${nombre}" del monitoreo? Se perderán las estadísticas activas en memoria de este dispositivo.`)) {
      return;
    }
    try {
      await axios.delete(`http://localhost:3001/api/equipos-config/${id}`);
      setFormSuccess("Equipo eliminado del monitoreo.");
      cargarEquipos();
      if (onConfigChange) onConfigChange();
      setTimeout(() => setFormSuccess(""), 4000);
    } catch (err) {
      alert("Error al eliminar el equipo.");
    }
  };

  // Activar o desactivar equipo (sin eliminarlo)
  const toggleEquipo = async (eq) => {
    try {
      await axios.patch(`http://localhost:3001/api/equipos-config/${eq.id}/toggle`);
      setFormSuccess(eq.activo === 1 ? `"${eq.nombre}" pausado. Ya no recibirá pings.` : `"${eq.nombre}" reactivado y en monitoreo.`);
      cargarEquipos();
      if (onConfigChange) onConfigChange();
      setTimeout(() => setFormSuccess(""), 4000);
    } catch (err) {
      alert("Error al cambiar el estado del equipo.");
    }
  };

  // Extraer lista de sitios únicos para sugerencia en el input de Sitio
  const sitiosSugeridos = [...new Set(equipos.map((e) => e.sitio))];

  const solicitarPermisosNotificaciones = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        alert(
          permission === "granted"
            ? "✅ ¡Permiso concedido exitosamente!"
            : "❌ Permiso rechazado. Actívalo en la configuración de tu navegador."
        );
      });
    } else {
      alert("Tu navegador no soporta notificaciones de escritorio.");
    }
  };

  if (loadingConfig || loadingEquipos) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-2 text-slate-500">
        <div className="animate-spin text-3xl">⚙️</div>
        <span>Cargando datos de configuración...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Título de la sección */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Configuración e Inventario
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Administra las opciones generales y gestiona dinámicamente los lugares y equipos monitoreados.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PARTE IZQUIERDA: GESTION DE EQUIPOS (CRUD) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Formulario Agregar/Modificar */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              {editingId ? "✏️ Editar Equipo" : "➕ Agregar Lugar o Equipo"}
            </h2>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 p-3 rounded-xl text-xs font-semibold">
                ⚠️ {formError}
              </div>
            )}
            {formSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 p-3 rounded-xl text-xs font-semibold">
                ✔️ {formSuccess}
              </div>
            )}

            <form onSubmit={handleEquipoSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sitio Input con datalist de sugerencias */}
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Lugar / Sitio</label>
                  <input
                    type="text"
                    list="sitios-datalist"
                    value={sitioInput}
                    onChange={(e) => setSitioInput(e.target.value)}
                    placeholder="Ej: ADR LAB o VILLA MATAMOROS"
                    required
                    className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                  <datalist id="sitios-datalist">
                    {sitiosSugeridos.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>

                {/* Nombre de Equipo */}
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Nombre del Equipo</label>
                  <input
                    type="text"
                    value={nombreInput}
                    onChange={(e) => setNombreInput(e.target.value)}
                    placeholder="Ej: NVR PLANTA o LABORATORIO"
                    required
                    className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                </div>
              </div>

              {/* IP / Hostname */}
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Dirección IP o Hostname</label>
                <input
                  type="text"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  placeholder="Ej: 192.168.30.17 o sub.dominio.com"
                  required
                  className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white font-mono"
                />
              </div>

              <div className="flex gap-2 justify-end">
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelarEdicion}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs active:scale-95 cursor-pointer"
                >
                  {editingId ? "💾 Guardar Cambios" : "➕ Agregar al Monitoreo"}
                </button>
              </div>
            </form>
          </div>

          {/* Tabla Listado de Equipos */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="font-extrabold text-sm dark:text-white">
                📋 Inventario de Dispositivos ({equipos.length})
              </span>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                  Activos: {equipos.filter(e => e.activo === 1).length}
                </span>
                <span className="flex items-center gap-1 text-slate-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
                  Pausados: {equipos.filter(e => e.activo !== 1).length}
                </span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3">Estado</th>
                    <th className="p-3">Lugar/Sitio</th>
                    <th className="p-3">Nombre Equipo</th>
                    <th className="p-3">IP / Destino</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {equipos.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-400">
                        No hay equipos registrados. Agrega uno usando el formulario de arriba.
                      </td>
                    </tr>
                  ) : (
                    equipos.map((eq) => {
                      const estaActivo = eq.activo === 1;
                      return (
                        <tr
                          key={eq.id}
                          className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition ${
                            estaActivo
                              ? "text-slate-700 dark:text-slate-300"
                              : "text-slate-400 dark:text-slate-600 bg-slate-50/50 dark:bg-slate-800/20"
                          }`}
                        >
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                estaActivo
                                  ? "bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/5 dark:text-green-400 dark:border-green-500/10"
                                  : "bg-slate-200/60 text-slate-500 border-slate-300/50 dark:bg-slate-700/40 dark:text-slate-500 dark:border-slate-700"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${estaActivo ? "bg-green-500" : "bg-slate-400"}`}></span>
                              {estaActivo ? "Activo" : "Pausado"}
                            </span>
                          </td>
                          <td className={`p-3 font-bold ${!estaActivo ? "line-through opacity-50" : ""}`}>{eq.sitio}</td>
                          <td className={`p-3 ${!estaActivo ? "opacity-50" : ""}`}>{eq.nombre}</td>
                          <td className={`p-3 font-mono text-slate-500 ${!estaActivo ? "opacity-50" : ""}`}>{eq.ip}</td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Editar - solo disponible si está activo */}
                              <button
                                onClick={() => iniciarEdicion(eq)}
                                disabled={!estaActivo}
                                title="Editar equipo"
                                className="px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-md transition active:scale-90 font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                ✏️
                              </button>

                              {/* Pausar / Reactivar */}
                              <button
                                onClick={() => toggleEquipo(eq)}
                                title={estaActivo ? "Pausar monitoreo (no se elimina)" : "Reactivar monitoreo"}
                                className={`px-2 py-1 rounded-md transition active:scale-90 font-bold text-xs ${
                                  estaActivo
                                    ? "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:hover:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400"
                                    : "bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400"
                                }`}
                              >
                                {estaActivo ? "⏸" : "▶"}
                              </button>

                              {/* Eliminar definitivamente */}
                              <button
                                onClick={() => eliminarEquipo(eq.id, eq.nombre)}
                                title="Eliminar definitivamente"
                                className="px-2 py-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-md transition active:scale-90 font-bold"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* PARTE DERECHA: CONFIGURACIÓN GENERAL DEL SISTEMA */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={guardarConfig} className="space-y-6">
            
            {/* Parámetros del Motor */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                ⚙️ Motor de Monitoreo
              </h2>

              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Intervalo (segundos)</label>
                <input
                  type="number"
                  name="intervalo_monitoreo"
                  value={config.intervalo_monitoreo}
                  onChange={handleConfigChange}
                  min="5"
                  max="300"
                  required
                  className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-500 mb-1.5 uppercase">Intentos de Caída</label>
                <input
                  type="number"
                  name="intentos_caida"
                  value={config.intentos_caida}
                  onChange={handleConfigChange}
                  min="1"
                  max="10"
                  required
                  className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
            </div>

            {/* Configuración de Notificaciones */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                🔔 Canales de Alerta
              </h2>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="alerta_sonido"
                    checked={config.alerta_sonido}
                    onChange={handleConfigChange}
                    className="w-5 h-5 rounded-sm border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">Activar Sonido</span>
                    <span className="text-xs text-slate-500">Pitidos de alarma de red local.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="alerta_notificaciones"
                    checked={config.alerta_notificaciones}
                    onChange={handleConfigChange}
                    className="w-5 h-5 rounded-sm border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 mt-0.5"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white block">Notificaciones Web</span>
                    <span className="text-xs text-slate-500">Avisos flotantes de escritorio.</span>
                  </div>
                </label>

                <button
                  type="button"
                  onClick={solicitarPermisosNotificaciones}
                  className="w-full py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold rounded-lg transition active:scale-95 cursor-pointer"
                >
                  🔑 Probar / Solicitar Permisos
                </button>
              </div>
            </div>

            {/* Telegram config */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                ✈️ Telegram
              </h2>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="alerta_telegram"
                  checked={config.alerta_telegram}
                  onChange={handleConfigChange}
                  className="w-5 h-5 rounded-sm border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500 mt-0.5"
                />
                <div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white block">Notificaciones Telegram</span>
                  <span className="text-xs text-slate-500">Integración con Bot.</span>
                </div>
              </label>

              {config.alerta_telegram && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase">Token de Bot</label>
                    <input
                      type="password"
                      name="telegram_token"
                      value={config.telegram_token}
                      onChange={handleConfigChange}
                      required={config.alerta_telegram}
                      className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                  </div>

                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 mb-1.5 uppercase">ID de Chat</label>
                    <input
                      type="text"
                      name="telegram_chat_id"
                      value={config.telegram_chat_id}
                      onChange={handleConfigChange}
                      required={config.alerta_telegram}
                      className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Guardar */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingConfig}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl transition shadow-xs hover:shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {savingConfig ? "Guardando..." : "💾 Guardar Ajustes Generales"}
              </button>
            </div>
            
            {configSavedSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 p-3 rounded-xl text-center text-xs font-bold">
                ¡Ajustes generales guardados correctamente!
              </div>
            )}
          </form>
        </div>
        
      </div>
    </div>
  );
}
