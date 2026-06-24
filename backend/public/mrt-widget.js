(function () {
  // Configuración del Widget
  const widgetContainer = document.getElementById("mrt-widget");
  if (!widgetContainer) return;

  const mode = widgetContainer.getAttribute("data-mode") || "global"; // global, summary, sites, dashboard
  const refreshInterval = parseInt(widgetContainer.getAttribute("data-refresh"), 10) || 30000;
  const apiUrl = widgetContainer.getAttribute("data-api-url") || "http://localhost:3001";
  const apiKey = widgetContainer.getAttribute("data-api-key") || "";
  const themeAttr = widgetContainer.getAttribute("data-theme") || "auto"; // auto | light | dark

  // Determinar si aplicar tema oscuro: atributo explícito > prefers-color-scheme
  function isDarkMode() {
    if (themeAttr === "dark") return true;
    if (themeAttr === "light") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  // Inyectar estilos modernos y responsivos directamente en el head
  const css = `
    @keyframes mrt-pulse-dot {
      0%, 100% { opacity: 1; box-shadow: 0 0 8px currentColor; }
      50% { opacity: 0.65; box-shadow: 0 0 14px currentColor; }
    }
    .mrt-w-container {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      border-radius: 12px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(226, 232, 240, 0.8);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      backdrop-filter: blur(8px);
      transition: all 0.3s ease;
      color: #1e293b;
      max-width: 100%;
      box-sizing: border-box;
    }
    .mrt-w-container.mrt-dark {
      background: rgba(15, 23, 42, 0.92);
      border-color: rgba(51, 65, 85, 0.8);
      color: #f8fafc;
    }
    @media (prefers-color-scheme: dark) {
      .mrt-w-container:not(.mrt-light) {
        background: rgba(15, 23, 42, 0.92);
        border-color: rgba(51, 65, 85, 0.8);
        color: #f8fafc;
      }
    }
    .mrt-status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 700;
      font-size: 14px;
    }
    .mrt-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
      animation: mrt-pulse-dot 2s ease-in-out infinite;
    }
    .mrt-dot-ok       { color: #22c55e; background-color: #22c55e; box-shadow: 0 0 8px #22c55e; }
    .mrt-dot-warning  { color: #eab308; background-color: #eab308; box-shadow: 0 0 8px #eab308; }
    .mrt-dot-critical { color: #ef4444; background-color: #ef4444; box-shadow: 0 0 8px #ef4444; }
    
    /* Modo Lista de Sitios */
    .mrt-sites-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 8px;
      margin-top: 10px;
    }
    .mrt-site-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(241, 245, 249, 0.5);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      position: relative;
      transition: background 0.2s;
    }
    @media (prefers-color-scheme: dark) {
      .mrt-site-item {
        background: rgba(30, 41, 59, 0.5);
      }
    }
    .mrt-site-item:hover {
      background: rgba(226, 232, 240, 0.8);
    }
    @media (prefers-color-scheme: dark) {
      .mrt-site-item:hover {
        background: rgba(51, 65, 85, 0.8);
      }
    }
    
    /* Tooltips */
    .mrt-tooltip {
      visibility: hidden;
      position: absolute;
      bottom: 125%;
      left: 50%;
      transform: translateX(-50%);
      background-color: #0f172a;
      color: #fff;
      text-align: left;
      padding: 8px 12px;
      border-radius: 6px;
      z-index: 9999;
      width: 200px;
      font-size: 11px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
      line-height: 1.4;
    }
    .mrt-site-item:hover .mrt-tooltip {
      visibility: visible;
      opacity: 1;
    }
    
    /* Modal */
    .mrt-modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }
    .mrt-modal-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .mrt-modal {
      background: #fff;
      color: #0f172a;
      border-radius: 12px;
      max-width: 500px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      transform: scale(0.95);
      transition: transform 0.2s ease;
      overflow: hidden;
    }
    @media (prefers-color-scheme: dark) {
      .mrt-modal {
        background: #1e293b;
        color: #f8fafc;
      }
    }
    .mrt-modal-overlay.active .mrt-modal {
      transform: scale(1);
    }
    .mrt-modal-header {
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
    }
    @media (prefers-color-scheme: dark) {
      .mrt-modal-header { border-color: #334155; }
    }
    .mrt-modal-close {
      cursor: pointer;
      background: none;
      border: none;
      font-size: 18px;
      color: inherit;
    }
    .mrt-modal-body {
      padding: 16px;
      max-height: 350px;
      overflow-y: auto;
    }
    .mrt-modal-device {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 12px;
    }
    @media (prefers-color-scheme: dark) {
      .mrt-modal-device { border-color: rgba(51, 65, 85, 0.5); }
    }
  `;

  const styleEl = document.createElement("style");
  styleEl.innerHTML = css;
  document.head.appendChild(styleEl);

  // Aplicar clase de tema a contenedores generados
  function applyThemeClass(el) {
    if (themeAttr === "dark") el.classList.add("mrt-dark");
    if (themeAttr === "light") el.classList.add("mrt-light");
  }

  // Crear elementos para Modal global si no existen
  let overlay = document.getElementById("mrt-modal-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "mrt-modal-overlay";
    overlay.className = "mrt-modal-overlay";
    overlay.innerHTML = `
      <div class="mrt-modal">
        <div class="mrt-modal-header">
          <span id="mrt-modal-title">Detalle del Sitio</span>
          <button class="mrt-modal-close" onclick="document.getElementById('mrt-modal-overlay').classList.remove('active')">✕</button>
        </div>
        <div class="mrt-modal-body" id="mrt-modal-content">
          Cargando detalles...
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("active");
    });
  }

  // Helper para realizar llamadas a la API
  async function fetchStatus(endpoint) {
    const headers = {};
    if (apiKey) {
      headers["X-MRT-API-Key"] = apiKey;
    }
    const res = await fetch(`${apiUrl}/api/status/${endpoint}`, { headers });
    if (!res.ok) throw new Error("Error cargando API de MRT");
    return res.json();
  }

  // Formateadores visuales
  function getDotClass(status) {
    if (status === "ok") return "mrt-dot-ok";
    if (status === "warning") return "mrt-dot-warning";
    return "mrt-dot-critical";
  }

  function getStatusLabel(status) {
    if (status === "ok") return "🟢 Operativo";
    if (status === "warning") return "🟡 Problemas Parciales";
    return "🔴 Falla Crítica";
  }

  // Renderizadores de Modos
  function renderGlobal(data) {
    const dark = isDarkMode();
    const themeClass = dark ? "mrt-dark" : themeAttr === "light" ? "mrt-light" : "";
    return `
      <div class="mrt-w-container ${themeClass}" style="display:inline-block;">
        <span class="mrt-status-badge">
          <span class="mrt-dot ${getDotClass(data.status)}"></span>
          ${getStatusLabel(data.status)}
        </span>
      </div>
    `;
  }

  function renderSummary(data) {
    const dark = isDarkMode();
    const themeClass = dark ? "mrt-dark" : themeAttr === "light" ? "mrt-light" : "";
    const mutedColor = dark ? "#94a3b8" : "#64748b";
    return `
      <div class="mrt-w-container ${themeClass}">
        <h4 style="margin:0 0 10px 0;font-size:14px;font-weight:700;">Estado MRT</h4>
        <div style="font-size:12px;margin-bottom:10px;display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="mrt-dot mrt-dot-ok" style="width:8px;height:8px;"></span>
            Operativos: <strong>${data.operativos}</strong>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="mrt-dot mrt-dot-warning" style="width:8px;height:8px;"></span>
            Parciales: <strong>${data.parciales}</strong>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="mrt-dot mrt-dot-critical" style="width:8px;height:8px;"></span>
            Caídos: <strong>${data.caidos}</strong>
          </div>
        </div>
        <div style="font-size:10px;color:${mutedColor};">Act: ${new Date(data.ultimaActualizacion).toLocaleTimeString()}</div>
      </div>
    `;
  }

  function renderSites(data) {
    const dark = isDarkMode();
    const themeClass = dark ? "mrt-dark" : themeAttr === "light" ? "mrt-light" : "";
    const items = data.map(site => `
      <div class="mrt-site-item" data-site-name="${site.sitio}">
        <span class="mrt-dot ${getDotClass(site.estado)}" style="width:8px;height:8px;"></span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${site.sitio}</span>
        <div class="mrt-tooltip">
          <strong>${site.sitio}</strong><br/>
          Estado: ${site.estado.toUpperCase()}<br/>
          Equipos: ${site.equiposActivos}/${site.equiposTotales}<br/>
          Disponibilidad: ${site.disponibilidad != null ? site.disponibilidad : 100}%<br/>
          Latencia: ${site.latenciaPromedio || 0} ms
        </div>
      </div>
    `).join("");

    return `
      <div class="mrt-w-container ${themeClass}">
        <h4 style="margin:0 0 10px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;opacity:0.6;">Lista de Sitios</h4>
        <div class="mrt-sites-list">
          ${items}
        </div>
      </div>
    `;
  }

  function renderDashboard(global, sites) {
    const dark = isDarkMode();
    const themeClass = dark ? "mrt-dark" : themeAttr === "light" ? "mrt-light" : "";
    const sepColor = dark ? "rgba(51,65,85,0.6)" : "rgba(0,0,0,0.07)";
    const items = sites.map(site => `
      <div class="mrt-site-item" data-site-name="${site.sitio}" style="padding:4px 8px;font-size:11px;">
        <span class="mrt-dot ${getDotClass(site.estado)}" style="width:7px;height:7px;"></span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${site.sitio}</span>
        <div class="mrt-tooltip">
          <strong>${site.sitio}</strong><br/>
          Estado: ${site.estado.toUpperCase()}<br/>
          Equipos: ${site.equiposActivos}/${site.equiposTotales}<br/>
          Disponibilidad: ${site.disponibilidad != null ? site.disponibilidad : 100}%<br/>
          Latencia: ${site.latenciaPromedio || 0} ms
        </div>
      </div>
    `).join("");

    const globalLabel = global.status === "ok" ? "Operativo" : global.status === "warning" ? "Parcial" : "Sin Servicio";

    return `
      <div class="mrt-w-container ${themeClass}" style="max-width:320px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid ${sepColor};padding-bottom:10px;">
          <strong style="font-size:13px;">Monitoreo MRT</strong>
          <div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;opacity:0.8;">
            <span class="mrt-dot ${getDotClass(global.status)}" style="width:7px;height:7px;"></span>
            ${globalLabel}
          </div>
        </div>
        <div style="font-size:11px;display:flex;gap:14px;margin-bottom:12px;opacity:0.75;">
          <span style="display:flex;align-items:center;gap:5px;">
            <span class="mrt-dot mrt-dot-ok" style="width:7px;height:7px;"></span>${global.operativos}
          </span>
          <span style="display:flex;align-items:center;gap:5px;">
            <span class="mrt-dot mrt-dot-warning" style="width:7px;height:7px;"></span>${global.parciales}
          </span>
          <span style="display:flex;align-items:center;gap:5px;">
            <span class="mrt-dot mrt-dot-critical" style="width:7px;height:7px;"></span>${global.caidos}
          </span>
        </div>
        <div class="mrt-sites-list" style="grid-template-columns: 1fr 1fr;">
          ${items}
        </div>
        <div style="font-size:9px;opacity:0.45;text-align:right;margin-top:10px;">${new Date(global.ultimaActualizacion).toLocaleString()}</div>
      </div>
    `;
  }

  // Cargar modal detalle
  window.mrtOpenDetails = async (siteName) => {
    const content = document.getElementById("mrt-modal-content");
    const title = document.getElementById("mrt-modal-title");
    title.innerText = siteName;
    content.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.5;">Cargando equipos...</div>';
    overlay.classList.add("active");

    // Aplicar tema al modal
    const modal = overlay.querySelector(".mrt-modal");
    if (modal) {
      if (isDarkMode()) {
        modal.style.background = "#0f172a";
        modal.style.color = "#f8fafc";
        modal.style.borderColor = "#334155";
      } else {
        modal.style.background = "#fff";
        modal.style.color = "#0f172a";
      }
    }

    try {
      const fullData = await fetchStatus("full");
      const site = fullData.find(s => s.sitio === siteName);
      if (!site || !site.equipos) {
        content.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.5;">Sin detalles disponibles.</div>';
        return;
      }

      const dark = isDarkMode();
      const mutedColor = dark ? "#94a3b8" : "#64748b";
      const rowBg = dark ? "rgba(30,41,59,0.5)" : "rgba(241,245,249,0.6)";

      const footer = `
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid ${dark ? '#334155' : '#f1f5f9'};font-size:10px;color:${mutedColor};display:flex;justify-content:space-between;">
          <span>Disponibilidad: <strong style="color:#3b82f6;">${site.disponibilidad}%</strong></span>
          <span>Latencia prom: ${site.latenciaPromedio} ms</span>
        </div>
      `;

      content.innerHTML = site.equipos.map(eq => `
        <div class="mrt-modal-device" style="background:${rowBg};padding:8px 10px;border-radius:8px;margin-bottom:6px;">
          <div style="min-width:0;">
            <strong style="display:block;font-size:13px;">${eq.nombre}</strong>
            <span style="font-size:10px;color:${mutedColor};font-family:monospace;">${eq.ip}</span>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:8px;">
            <div style="display:flex;align-items:center;gap:5px;justify-content:flex-end;margin-bottom:2px;">
              <span class="mrt-dot ${getDotClass(eq.estado === 'inestable' ? 'warning' : eq.estado)}" style="width:7px;height:7px;"></span>
              <span style="font-weight:700;font-size:11px;color:${eq.estado === 'ok' ? '#22c55e' : eq.estado === 'inestable' ? '#eab308' : '#ef4444'}">
                ${eq.estado.toUpperCase()}
              </span>
            </div>
            <span style="font-size:10px;opacity:0.7;">${eq.latencia} ms · ${eq.disponibilidad}%</span>
          </div>
        </div>
      `).join("") + footer;
    } catch (e) {
      content.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444;">Error al obtener detalles.</div>';
    }
  };

  // Función principal de inicialización y actualización
  async function updateWidget() {
    try {
      if (mode === "global") {
        const data = await fetchStatus("global");
        widgetContainer.innerHTML = renderGlobal(data);
      } else if (mode === "summary") {
        const data = await fetchStatus("global");
        widgetContainer.innerHTML = renderSummary(data);
      } else if (mode === "sites") {
        const data = await fetchStatus("full");
        widgetContainer.innerHTML = renderSites(data);
      } else if (mode === "dashboard") {
        const [global, full] = await Promise.all([fetchStatus("global"), fetchStatus("full")]);
        widgetContainer.innerHTML = renderDashboard(global, full);
      }

      // Añadir manejadores de clics para los items de la lista
      widgetContainer.querySelectorAll(".mrt-site-item").forEach(item => {
        item.addEventListener("click", () => {
          const siteName = item.getAttribute("data-site-name");
          window.mrtOpenDetails(siteName);
        });
      });
    } catch (e) {
      widgetContainer.innerHTML = `
        <div style="color:#ef4444;font-size:11px;font-family:sans-serif;padding:8px;border:1px solid #fecaca;border-radius:6px;background:#fef2f2;">
          ⚠️ Error de Conectividad con MRT
        </div>
      `;
    }
  }

  // Bucle de refresco
  updateWidget();
  setInterval(updateWidget, refreshInterval);
})();
