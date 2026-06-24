import { useState, useEffect, useCallback } from "react";

const DEFAULT_API_URL = import.meta.env.VITE_MRT_API_URL || "http://localhost:3001";

// ─── Hook de datos ────────────────────────────────────────────────────────────

function useMRTData({ mode, refreshInterval, apiUrl, apiKey }) {
  const [globalData, setGlobalData] = useState(null);
  const [fullData, setFullData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const headers = apiKey ? { "X-MRT-API-Key": apiKey } : {};
  const base = `${apiUrl}/api/status`;

  const fetchData = useCallback(async () => {
    try {
      if (mode === "global" || mode === "summary") {
        const res = await fetch(`${base}/global`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setGlobalData(await res.json());
      } else if (mode === "sites") {
        const res = await fetch(`${base}/full`, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setFullData(await res.json());
      } else if (mode === "dashboard") {
        const [gRes, fRes] = await Promise.all([
          fetch(`${base}/global`, { headers }),
          fetch(`${base}/full`, { headers }),
        ]);
        if (!gRes.ok || !fRes.ok) throw new Error("Error al obtener datos");
        const [g, f] = await Promise.all([gRes.json(), fRes.json()]);
        setGlobalData(g);
        setFullData(f);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [mode, base, apiKey]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, refreshInterval);
    return () => clearInterval(id);
  }, [fetchData, refreshInterval]);

  return { globalData, fullData, loading, error };
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

const STATUS_STYLES = {
  ok:       { dot: "bg-green-500",  shadow: "shadow-green-500/60"  },
  warning:  { dot: "bg-yellow-500", shadow: "shadow-yellow-500/60" },
  critical: { dot: "bg-red-500",    shadow: "shadow-red-500/60"    },
  inestable:{ dot: "bg-orange-500", shadow: "shadow-orange-500/60" },
};

function StatusDot({ status, size = "md" }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.ok;
  const sz = { sm: "w-2 h-2", md: "w-2.5 h-2.5", lg: "w-3 h-3" }[size];
  return (
    <span
      className={`inline-block flex-shrink-0 rounded-full animate-pulse ${sz} ${s.dot} shadow-[0_0_7px_2px] ${s.shadow}`}
    />
  );
}

function GlobalMode({ data }) {
  const map = {
    ok:       { label: "Operativo",          bg: "bg-green-50 dark:bg-green-500/10",  border: "border-green-200 dark:border-green-500/20",  text: "text-green-700 dark:text-green-400"  },
    warning:  { label: "Problemas Parciales",bg: "bg-yellow-50 dark:bg-yellow-500/10",border: "border-yellow-200 dark:border-yellow-500/20",text: "text-yellow-700 dark:text-yellow-400" },
    critical: { label: "Falla Crítica",      bg: "bg-red-50 dark:bg-red-500/10",      border: "border-red-200 dark:border-red-500/20",      text: "text-red-700 dark:text-red-400"      },
  };
  const s = map[data.status] || map.ok;
  return (
    <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-xl border ${s.bg} ${s.border} transition-all duration-300`}>
      <StatusDot status={data.status} />
      <span className={`font-bold text-sm ${s.text}`}>{s.label}</span>
    </div>
  );
}

function SummaryMode({ data }) {
  return (
    <div className="inline-block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm min-w-[180px] space-y-2.5">
      <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-none">Estado MRT</h4>
      <div className="space-y-1.5">
        {[
          { status: "ok",       label: "Operativos", value: data.operativos },
          { status: "warning",  label: "Parciales",  value: data.parciales  },
          { status: "critical", label: "Caídos",     value: data.caidos     },
        ].map(({ status, label, value }) => (
          <div key={status} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <StatusDot status={status} size="sm" />
            <span>{label}: <strong className="text-slate-800 dark:text-white">{value}</strong></span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400">
        Act: {new Date(data.ultimaActualizacion).toLocaleTimeString()}
      </p>
    </div>
  );
}

function SiteItem({ site, showTooltip, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors duration-150 text-xs font-semibold text-slate-700 dark:text-slate-200 select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <StatusDot status={site.estado} size="sm" />
      <span className="truncate">{site.sitio}</span>

      {showTooltip && hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-48 bg-slate-900 text-white text-[10px] rounded-xl px-3 py-2.5 shadow-2xl pointer-events-none leading-relaxed border border-slate-700">
          <div className="font-bold text-xs mb-1 text-white">{site.sitio}</div>
          <div className="space-y-0.5 text-slate-300">
            <div>Estado: <span className="font-semibold text-white">{site.estado.toUpperCase()}</span></div>
            <div>Equipos: {site.equiposActivos}/{site.equiposTotales}</div>
            <div>Disponibilidad: {site.disponibilidad ?? 100}%</div>
            <div>Latencia: {site.latenciaPromedio ?? 0} ms</div>
          </div>
        </div>
      )}
    </div>
  );
}

function SitesMode({ data, showTooltip, onSiteClick }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        Lista de Sitios
      </h4>
      <div className="grid grid-cols-2 gap-1.5">
        {data.map((site) => (
          <SiteItem
            key={site.sitio}
            site={site}
            showTooltip={showTooltip}
            onClick={() => onSiteClick(site)}
          />
        ))}
      </div>
    </div>
  );
}

function DashboardMode({ globalData, fullData, showTooltip, onSiteClick }) {
  const globalLabels = { ok: "Operativo", warning: "Parcial", critical: "Sin Servicio" };
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm max-w-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
        <strong className="text-sm text-slate-800 dark:text-white">Monitoreo MRT</strong>
        <div className="flex items-center gap-1.5">
          <StatusDot status={globalData.status} size="sm" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            {globalLabels[globalData.status]}
          </span>
        </div>
      </div>

      {/* Contadores */}
      <div className="flex gap-4 mb-3">
        {[
          { status: "ok",       value: globalData.operativos },
          { status: "warning",  value: globalData.parciales  },
          { status: "critical", value: globalData.caidos     },
        ].map(({ status, value }) => (
          <span key={status} className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <StatusDot status={status} size="sm" />
            <strong className="text-slate-700 dark:text-slate-200">{value}</strong>
          </span>
        ))}
      </div>

      {/* Sitios */}
      <div className="grid grid-cols-2 gap-1">
        {fullData.map((site) => (
          <SiteItem
            key={site.sitio}
            site={site}
            showTooltip={showTooltip}
            onClick={() => onSiteClick(site)}
          />
        ))}
      </div>

      <p className="text-[9px] text-slate-400 mt-3 text-right">
        {new Date(globalData.ultimaActualizacion).toLocaleString()}
      </p>
    </div>
  );
}

function SiteModal({ site, onClose }) {
  if (!site) return null;
  const equipos = site.equipos || [];

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <StatusDot status={site.estado} />
            <h3 className="font-bold text-slate-900 dark:text-white">{site.sitio}</h3>
            <span className="text-xs text-slate-400 font-mono">
              {site.equiposActivos}/{site.equiposTotales} equipos
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Cuerpo del modal */}
        <div className="p-5 max-h-80 overflow-y-auto space-y-1.5">
          {equipos.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Sin equipos disponibles</p>
          ) : (
            equipos.map((eq, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {eq.nombre}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400">{eq.ip}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <div className="flex items-center gap-1.5 justify-end mb-0.5">
                    <StatusDot
                      status={eq.estado === "inestable" ? "warning" : eq.estado}
                      size="sm"
                    />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {eq.estado.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    {eq.latencia} ms · {eq.disponibilidad}%
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[10px] text-slate-400">
            Disponibilidad: <strong className="text-blue-500">{site.disponibilidad}%</strong> ·
            Latencia: <strong className="text-slate-600 dark:text-slate-300">{site.latenciaPromedio} ms</strong>
          </span>
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal exportable ─────────────────────────────────────────

/**
 * MRTStatusWidget — Componente React embebible del sistema de monitoreo MRT.
 *
 * Props:
 *  mode            "global" | "summary" | "sites" | "dashboard"  (default: "global")
 *  refreshInterval Milisegundos entre actualizaciones             (default: 30000)
 *  showTooltip     Mostrar tooltip al pasar el mouse             (default: true)
 *  theme           "auto" | "light" | "dark"                     (default: "auto")
 *  apiUrl          URL base de la API MRT                        (default: VITE_MRT_API_URL o localhost:3001)
 *  apiKey          API key opcional                              (default: "")
 *
 * Ejemplo:
 *  <MRTStatusWidget mode="sites" refreshInterval={15000} />
 */
export default function MRTStatusWidget({
  mode = "global",
  refreshInterval = 30000,
  showTooltip = true,
  theme = "auto",
  apiUrl = DEFAULT_API_URL,
  apiKey = "",
}) {
  const { globalData, fullData, loading, error } = useMRTData({
    mode,
    refreshInterval,
    apiUrl,
    apiKey,
  });

  const [selectedSite, setSelectedSite] = useState(null);

  // Envolver en div con clase dark si el tema es forzado
  const themeClass = theme === "dark" ? "dark" : "";

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs animate-pulse">
        <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" />
        Cargando MRT...
      </div>
    );
  }

  if (error) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs border border-red-200 dark:border-red-500/20">
        ⚠️ Sin conexión con MRT
      </div>
    );
  }

  return (
    <div className={themeClass}>
      {mode === "global"    && globalData && <GlobalMode data={globalData} />}
      {mode === "summary"   && globalData && <SummaryMode data={globalData} />}
      {mode === "sites"     && fullData   && (
        <SitesMode data={fullData} showTooltip={showTooltip} onSiteClick={setSelectedSite} />
      )}
      {mode === "dashboard" && globalData && fullData && (
        <DashboardMode
          globalData={globalData}
          fullData={fullData}
          showTooltip={showTooltip}
          onSiteClick={setSelectedSite}
        />
      )}

      <SiteModal site={selectedSite} onClose={() => setSelectedSite(null)} />
    </div>
  );
}
