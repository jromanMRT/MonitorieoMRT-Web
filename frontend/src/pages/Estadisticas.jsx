import { useEffect, useState } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

export default function Estadisticas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  // Detectar modo oscuro actual
  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkDark();

    // Listener para cambios de clases en html (modo oscuro)
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  const cargarDatos = async () => {
    try {
      const r = await axios.get("/api/estadisticas");
      setData(r.data);
      setLoading(false);
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-2 text-slate-500">
        <div className="animate-spin text-3xl">⚙️</div>
        <span>Calculando estadísticas y agregaciones...</span>
      </div>
    );
  }

  // Estilo global de textos para las gráficas según el tema
  const textClr = isDark ? "#94a3b8" : "#475569";
  const gridClr = isDark ? "rgba(148, 163, 184, 0.08)" : "rgba(71, 85, 105, 0.08)";

  const optionsCommon = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: textClr,
          font: { weight: "600", family: "Inter, sans-serif" }
        }
      }
    },
    scales: {
      x: {
        grid: { color: gridClr },
        ticks: { color: textClr, font: { family: "Inter, sans-serif" } }
      },
      y: {
        grid: { color: gridClr },
        ticks: { color: textClr, font: { family: "Inter, sans-serif" } }
      }
    }
  };

  // 1. Gráfica: Incidentes por Sitio (Doughnut)
  const chartIncidentesData = {
    labels: data.incidentesPorSitio.map((i) => i.sitio),
    datasets: [
      {
        label: "Incidentes",
        data: data.incidentesPorSitio.map((i) => i.count),
        backgroundColor: [
          "rgba(59, 130, 246, 0.65)", // Blue
          "rgba(249, 115, 22, 0.65)", // Orange
          "rgba(139, 92, 246, 0.65)", // Purple
          "rgba(239, 68, 68, 0.65)",  // Red
          "rgba(6, 182, 212, 0.65)",  // Cyan
          "rgba(16, 185, 129, 0.65)"  // Green
        ],
        borderColor: isDark ? "rgba(15, 23, 42, 0.8)" : "rgba(255, 255, 255, 0.9)",
        borderWidth: 2
      }
    ]
  };

  // 2. Gráfica: Disponibilidad por Sitio (Bar)
  const chartDisponibilidadData = {
    labels: data.disponibilidadPorSitio.map((d) => d.sitio),
    datasets: [
      {
        label: "Disponibilidad (%)",
        data: data.disponibilidadPorSitio.map((d) => d.disponibilidad),
        backgroundColor: "rgba(16, 185, 129, 0.65)", // Emerald
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 1.5,
        borderRadius: 8
      }
    ]
  };

  const optionsDisponibilidad = {
    ...optionsCommon,
    scales: {
      ...optionsCommon.scales,
      y: {
        ...optionsCommon.scales.y,
        min: 90, // Foco en el rango crítico (90% - 100%)
        max: 100
      }
    }
  };

  // 3. Gráfica: Latencia Promedio por Sitio (Bar)
  const chartLatenciaData = {
    labels: data.latenciaPorSitio.map((l) => l.sitio),
    datasets: [
      {
        label: "Latencia Promedio (ms)",
        data: data.latenciaPorSitio.map((l) => l.latencia),
        backgroundColor: "rgba(139, 92, 246, 0.65)", // Purple
        borderColor: "rgba(139, 92, 246, 1)",
        borderWidth: 1.5,
        borderRadius: 8
      }
    ]
  };

  // 4. Gráfica: Fallas por Día (Line)
  const chartFallasData = {
    labels: data.fallasPorDia.map((f) => f.dia),
    datasets: [
      {
        fill: true,
        label: "Caídas registradas",
        data: data.fallasPorDia.map((f) => f.fallas),
        backgroundColor: "rgba(239, 68, 68, 0.15)", // Coral/Red fill
        borderColor: "rgba(239, 68, 68, 1)",
        borderWidth: 2,
        tension: 0.3,
        pointBackgroundColor: "rgba(239, 68, 68, 1)"
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Estadísticas de Conectividad
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gráficos de rendimiento de red e incidencias consolidadas.
        </p>
      </div>

      {/* Grid de Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico 1: Incidentes por Sitio */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-96">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4">
            🔥 Incidentes por Sitio
          </h2>
          <div className="flex-1 relative flex items-center justify-center pb-4">
            <Doughnut
              data={chartIncidentesData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "right",
                    labels: { color: textClr, font: { weight: "600", family: "Inter" } }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Gráfico 2: Disponibilidad por Sitio */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-96">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4">
            📊 Disponibilidad Mensual por Sitio
          </h2>
          <div className="flex-1 relative">
            <Bar data={chartDisponibilidadData} options={optionsDisponibilidad} />
          </div>
        </div>

        {/* Gráfico 3: Latencia Promedio por Sitio */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-96">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4">
            ⚡ Latencia Promedio por Sitio
          </h2>
          <div className="flex-1 relative">
            <Bar data={chartLatenciaData} options={optionsCommon} />
          </div>
        </div>

        {/* Gráfico 4: Fallas por Día */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-96">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-4">
            📈 Caídas Diarias (Últimos 15 días)
          </h2>
          <div className="flex-1 relative">
            <Line data={chartFallasData} options={optionsCommon} />
          </div>
        </div>
      </div>
    </div>
  );
}
