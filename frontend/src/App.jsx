import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import DetalleSitio from "./pages/DetalleSitio";
import Historial from "./pages/Historial";
import Traceroute from "./pages/Traceroute";
import Estadisticas from "./pages/Estadisticas";
import Configuracion from "./pages/Configuracion";

export default function App() {
  const [sitios, setSitios] = useState([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  const [errorConexion, setErrorConexion] = useState(false);

  // Tema Claro / Oscuro (guardado en LocalStorage)
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");

  // Alerta sonora (guardado en LocalStorage) — default: desactivado
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("soundEnabled");
    return saved === null ? false : saved === "true";
  });

  // Notificaciones del navegador (guardado en LocalStorage) — default: desactivado
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(() => {
    return localStorage.getItem("notificationsEnabled") === "true";
  });

  // Intervalo de consulta (por defecto 10s)
  const [intervaloMonitoreo, setIntervaloMonitoreo] = useState(10);

  // Referencia para comparar estados de equipos y disparar alertas
  const prevEquipos = useRef(null);

  // Refs que siempre tienen el valor actual — evitan stale closures en setInterval
  const isSoundRef = useRef(isSoundEnabled);
  const isNotifRef = useRef(isNotificationEnabled);

  useEffect(() => { isSoundRef.current = isSoundEnabled; }, [isSoundEnabled]);
  useEffect(() => { isNotifRef.current = isNotificationEnabled; }, [isNotificationEnabled]);

  // Sincronizar tema con elemento HTML
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Persistir preferencia de sonido
  useEffect(() => {
    localStorage.setItem("soundEnabled", isSoundEnabled);
  }, [isSoundEnabled]);

  // Persistir preferencia de notificaciones
  useEffect(() => {
    localStorage.setItem("notificationsEnabled", isNotificationEnabled);
  }, [isNotificationEnabled]);

  // Activar/desactivar notificaciones — solicita permiso al navegador solo cuando el usuario lo pide
  const handleToggleNotifications = async (enabled) => {
    if (!enabled) {
      setIsNotificationEnabled(false);
      return;
    }

    if (!("Notification" in window)) {
      alert("Tu navegador no soporta notificaciones del escritorio.");
      return;
    }

    if (Notification.permission === "denied") {
      alert(
        "Las notificaciones están bloqueadas en este navegador.\n" +
        "Para activarlas ve a: Configuración del navegador → Privacidad → Notificaciones → Permitir este sitio."
      );
      return;
    }

    if (Notification.permission === "default") {
      const resultado = await Notification.requestPermission();
      if (resultado !== "granted") {
        // El usuario rechazó el permiso — no activar
        return;
      }
    }

    // Permiso granted
    setIsNotificationEnabled(true);
  };

  // Sonido de alerta usando Web Audio API
  const reproducirAlerta = () => {
    // Lee siempre el valor actual desde el ref — nunca stale
    if (!isSoundRef.current) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const emitirTono = (frecuencia, duracion, retardo) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(frecuencia, audioCtx.currentTime + retardo);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime + retardo);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + retardo + duracion);
        osc.start(audioCtx.currentTime + retardo);
        osc.stop(audioCtx.currentTime + retardo + duracion);
      };
      emitirTono(880, 0.15, 0);
      emitirTono(880, 0.15, 0.2);
    } catch (e) {
      console.error("Error al reproducir audio:", e);
    }
  };

  // Lanzar notificación del navegador
  const dispararNotificacion = (titulo, cuerpo) => {
    // Lee siempre el valor actual desde el ref — nunca stale
    if (!isNotifRef.current) return;
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(titulo, { body: cuerpo, icon: "/favicon.ico" });
    }
  };

  // Cargar configuración de intervalo desde backend
  const cargarConfig = async () => {
    try {
      const r = await axios.get("http://localhost:3001/api/config");
      if (r.data) {
        setIntervaloMonitoreo(r.data.intervalo_monitoreo || 10);
      }
    } catch (err) {
      console.error("Error cargando configuración del backend:", err);
    }
  };

  // Cargar estado de monitoreo
  const cargarMonitoreo = async () => {
    try {
      const r = await axios.get("http://localhost:3001/api/monitoreo");
      const { sitios: nuevosSitios, equipos: nuevosEquipos } = r.data;

      setSitios(nuevosSitios);
      setUltimaActualizacion(new Date());
      setErrorConexion(false);

      if (prevEquipos.current !== null) {
        nuevosEquipos.forEach((eq) => {
          const eqPrevio = prevEquipos.current.find((p) => p.ip === eq.ip);
          if (eqPrevio) {
            if (eqPrevio.online && !eq.online) {
              dispararNotificacion("🚨 Equipo sin conexión", `Sitio: ${eq.sitio}\nEquipo: ${eq.nombre} (${eq.ip})`);
              reproducirAlerta();
            } else if (!eqPrevio.online && eq.online) {
              dispararNotificacion("✅ Equipo recuperado", `Sitio: ${eq.sitio}\nEquipo: ${eq.nombre} (${eq.ip})`);
            }
            if (eq.estadoActual === "FLAPPING" && eqPrevio.estadoActual !== "FLAPPING") {
              dispararNotificacion("⚠ Conexión Inestable", `Flapping detectado en ${eq.nombre} (Sitio: ${eq.sitio})`);
              reproducirAlerta();
            }
          }
        });
      }

      prevEquipos.current = nuevosEquipos;
    } catch (err) {
      console.error(err);
      setErrorConexion(true);
    }
  };

  // Carga inicial
  useEffect(() => {
    cargarConfig();
    cargarMonitoreo();
  }, []);

  // Bucle de actualización — se recrea solo cuando cambia el intervalo
  useEffect(() => {
    const id = setInterval(cargarMonitoreo, intervaloMonitoreo * 1000);
    return () => clearInterval(id);
  }, [intervaloMonitoreo]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <Navbar
        isDark={isDark}
        setIsDark={setIsDark}
        isSoundEnabled={isSoundEnabled}
        setIsSoundEnabled={setIsSoundEnabled}
        isNotificationEnabled={isNotificationEnabled}
        onToggleNotifications={handleToggleNotifications}
      />
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Routes>
          <Route
            path="/"
            element={
              <Dashboard
                sitios={sitios}
                errorConexion={errorConexion}
                ultimaActualizacion={ultimaActualizacion}
              />
            }
          />
          <Route path="/sitio/:nombre" element={<DetalleSitio />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="/estadisticas" element={<Estadisticas />} />
          <Route path="/traceroute" element={<Traceroute />} />
          <Route path="/configuracion" element={<Configuracion onConfigChange={cargarConfig} />} />
        </Routes>
      </main>
    </div>
  );
}
