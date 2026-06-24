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

  // Alerta sonora (guardado en LocalStorage)
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    const saved = localStorage.getItem("soundEnabled");
    return saved === null ? true : saved === "true";
  });

  // Intervalo de consulta (por defecto 10s, se actualiza desde la config)
  const [intervaloMonitoreo, setIntervaloMonitoreo] = useState(10);

  // Referencia para comparar estados de equipos y disparar alertas
  const prevEquipos = useRef(null);

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

  // Guardar estado del sonido
  useEffect(() => {
    localStorage.setItem("soundEnabled", isSoundEnabled);
  }, [isSoundEnabled]);

  // Solicitar permisos de notificación de navegador automáticamente
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Sonido de alerta usando Web Audio API (genera un pitido doble profesional sin archivos locales)
  const reproducirAlerta = () => {
    if (!isSoundEnabled) return;
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
      // Sonido de alarma de red doble beep
      emitirTono(880, 0.15, 0);
      emitirTono(880, 0.15, 0.2);
    } catch (e) {
      console.error("Error al reproducir audio:", e);
    }
  };

  // Lanzar notificación del navegador
  const dispararNotificacion = (titulo, cuerpo) => {
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

      // Comparar con estados previos para alertas en tiempo real
      if (prevEquipos.current !== null) {
        nuevosEquipos.forEach((eq) => {
          const eqPrevio = prevEquipos.current.find((p) => p.ip === eq.ip);
          if (eqPrevio) {
            // Caso 1: Estaba online y cae a offline
            if (eqPrevio.online && !eq.online) {
              dispararNotificacion("🚨 Equipo sin conexión", `Sitio: ${eq.sitio}\nEquipo: ${eq.nombre} (${eq.ip})`);
              reproducirAlerta();
            }
            // Caso 2: Estaba offline y se recupera
            else if (!eqPrevio.online && eq.online) {
              dispararNotificacion("✅ Equipo recuperado", `Sitio: ${eq.sitio}\nEquipo: ${eq.nombre} (${eq.ip})`);
            }
            // Caso 3: Entró en estado Flapping (Inestable)
            if (eq.estadoActual === "FLAPPING" && eqPrevio.estadoActual !== "FLAPPING") {
              dispararNotificacion("⚠ Conexión Inestable", `Flapping detectado en ${eq.nombre} (Sitio: ${eq.sitio})`);
              reproducirAlerta();
            }
          }
        });
      }

      // Actualizar referencia de estados previos
      prevEquipos.current = nuevosEquipos;
    } catch (err) {
      console.error(err);
      setErrorConexion(true);
    }
  };

  // Cargar datos al montar y programar bucle de actualización
  useEffect(() => {
    cargarConfig();
    cargarMonitoreo();
  }, []);

  // Reactivar bucle cuando cambia el intervalo de monitoreo
  useEffect(() => {
    const handleInterval = setInterval(cargarMonitoreo, intervaloMonitoreo * 1000);
    return () => clearInterval(handleInterval);
  }, [intervaloMonitoreo]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <Navbar
        isDark={isDark}
        setIsDark={setIsDark}
        isSoundEnabled={isSoundEnabled}
        setIsSoundEnabled={setIsSoundEnabled}
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