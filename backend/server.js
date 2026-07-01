const express = require("express");
const cors = require("cors");
const { execFile } = require("child_process");
const db = require("./database");
const monitoring = require("./monitoring");

const path = require("path");

const app = express();

// Configuración de CORS
app.use(cors({
  origin: "*", // Permitir que cualquier sitio cargue el widget
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-MRT-API-Key"]
}));
app.use(express.json());

// Servir la carpeta public para el script del widget
app.use(express.static(path.join(__dirname, "public")));

// Iniciar monitoreo en segundo plano
monitoring.start();

// Rate limiter en memoria simple para endpoints de la API de estado
const rateLimitWindowMs = 60 * 1000; // 1 minuto
const rateLimitMax = 120; // 120 solicitudes por minuto
const ipRequests = new Map();

setInterval(() => {
  ipRequests.clear();
}, rateLimitWindowMs);

function rateLimiter(req, res, next) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const currentCount = ipRequests.get(ip) || 0;
  if (currentCount >= rateLimitMax) {
    return res.status(429).json({ error: "Demasiadas solicitudes. Por favor intente más tarde." });
  }
  ipRequests.set(ip, currentCount + 1);
  next();
}

// Middleware de autenticación con API key opcional
function checkApiKey(req, res, next) {
  const configuredApiKey = process.env.MRT_API_KEY;
  if (!configuredApiKey) {
    return next(); // Si no está configurada, la API es de libre acceso
  }
  const clientKey = req.headers["x-mrt-api-key"] || req.query.apiKey;
  if (clientKey !== configuredApiKey) {
    return res.status(401).json({ error: "No autorizado. API key inválida o no provista." });
  }
  next();
}

// Endpoints REST de la API de Estado (Fase 1)

/**
 * GET /api/status/global
 * Devuelve el estado global del sistema de monitoreo.
 */
app.get("/api/status/global", rateLimiter, checkApiKey, async (req, res) => {
  try {
    const memState = monitoring.getEstadoActual();
    const sitiosAgrupados = await cargarSitiosYEquipos();
    
    let operativos = 0;
    let parciales = 0;
    let caidos = 0;

    for (const sitio in sitiosAgrupados) {
      const equiposDelSitio = sitiosAgrupados[sitio];
      let activos = 0;
      let inestables = 0;
      const total = equiposDelSitio.length;

      for (const eq of equiposDelSitio) {
        const key = `${sitio}_${eq.ip}`;
        const state = memState[key];
        if (state) {
          if (state.online) activos++;
          if (state.estadoActual === "FLAPPING") inestables++;
        }
      }

      if (activos === 0) {
        caidos++;
      } else if (activos < total || inestables > 0) {
        parciales++;
      } else {
        operativos++;
      }
    }

    let globalStatus = "ok";
    if (caidos > 0) {
      globalStatus = "critical";
    } else if (parciales > 0) {
      globalStatus = "warning";
    }

    res.json({
      status: globalStatus,
      operativos,
      parciales,
      caidos,
      ultimaActualizacion: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/status/sites
 * Devuelve el estado de cada sitio de forma resumida.
 */
app.get("/api/status/sites", rateLimiter, checkApiKey, async (req, res) => {
  try {
    const memState = monitoring.getEstadoActual();
    const sitiosAgrupados = await cargarSitiosYEquipos();
    const resultado = [];
    let idx = 1;

    for (const sitio in sitiosAgrupados) {
      const equiposDelSitio = sitiosAgrupados[sitio];
      let activos = 0;
      let inestables = 0;
      const total = equiposDelSitio.length;

      for (const eq of equiposDelSitio) {
        const key = `${sitio}_${eq.ip}`;
        const state = memState[key];
        if (state) {
          if (state.online) activos++;
          if (state.estadoActual === "FLAPPING") inestables++;
        }
      }

      let estado = "ok";
      if (activos === 0) {
        estado = "critical";
      } else if (activos < total || inestables > 0) {
        estado = "warning";
      }

      resultado.push({
        id: idx++,
        nombre: sitio,
        estado: estado,
        equiposActivos: activos,
        equiposTotales: total
      });
    }

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/status/full
 * Devuelve información completa y detallada de los sitios y sus equipos.
 */
app.get("/api/status/full", rateLimiter, checkApiKey, async (req, res) => {
  try {
    const memState = monitoring.getEstadoActual();
    const sitiosAgrupados = await cargarSitiosYEquipos();
    const resultado = [];

    for (const sitio in sitiosAgrupados) {
      const equiposDelSitio = sitiosAgrupados[sitio];
      let activos = 0;
      let inestables = 0;
      const total = equiposDelSitio.length;
      let latenciaSuma = 0;
      let latenciaContador = 0;
      const equiposDetalle = [];

      for (const eq of equiposDelSitio) {
        const key = `${sitio}_${eq.ip}`;
        const state = memState[key];
        
        let online = true;
        let estadoActual = "OK";
        let latencia = 0;
        let lastSuccess = "Nunca";

        if (state) {
          online = state.online;
          estadoActual = state.estadoActual;
          latencia = state.pingActual;
          lastSuccess = state.lastSuccessTime || "Nunca";

          if (online) activos++;
          if (estadoActual === "FLAPPING") inestables++;
          if (latencia > 0) {
            latenciaSuma += latencia;
            latenciaContador++;
          }
        }

        // Obtener disponibilidad individual por equipo en los últimos 30 días
        const avail = await new Promise((resolve) => {
          db.get(
            `SELECT SUM(CASE WHEN estado='OK' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as avail 
             FROM historial 
             WHERE ip = ? AND fecha >= datetime('now', '-30 days', 'localtime')`,
            [eq.ip],
            (err, row) => {
              if (err || !row || row.avail === null) {
                resolve(100.0);
              } else {
                resolve(Number(row.avail.toFixed(2)));
              }
            }
          );
        });

        equiposDetalle.push({
          nombre: eq.nombre,
          ip: eq.ip,
          estado: online ? (estadoActual === "FLAPPING" ? "inestable" : "ok") : "critical",
          latencia,
          disponibilidad: avail,
          ultimaActualizacion: lastSuccess
        });
      }

      let estado = "ok";
      if (activos === 0) {
        estado = "critical";
      } else if (activos < total || inestables > 0) {
        estado = "warning";
      }

      // Disponibilidad mensual del sitio
      const availSitio = await new Promise((resolve) => {
        db.get(
          `SELECT SUM(CASE WHEN estado='OK' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as avail 
           FROM historial 
           WHERE sitio = ? AND fecha >= datetime('now', '-30 days', 'localtime')`,
          [sitio],
          (err, row) => {
            if (err || !row || row.avail === null) {
              resolve(100.0);
            } else {
              resolve(Number(row.avail.toFixed(2)));
            }
          }
        );
      });

      resultado.push({
        sitio,
        estado,
        equiposTotales: total,
        equiposActivos: activos,
        latenciaPromedio: latenciaContador > 0 ? Math.round(latenciaSuma / latenciaContador) : 0,
        disponibilidad: availSitio,
        ultimaActualizacion: new Date().toISOString(),
        equipos: equiposDetalle
      });
    }

    res.json(resultado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper para cargar equipos ACTIVOS agrupados por sitio (excluye pausados).
 */
function cargarSitiosYEquipos() {
  return new Promise((resolve, reject) => {
    // Solo se incluyen equipos con activo = 1
    db.all("SELECT * FROM equipos_monitoreo WHERE activo = 1", (err, rows) => {
      if (err) return reject(err);

      const sitiosAgrupados = {};
      (rows || []).forEach((row) => {
        if (!sitiosAgrupados[row.sitio]) {
          sitiosAgrupados[row.sitio] = [];
        }
        sitiosAgrupados[row.sitio].push({
          id: row.id,
          nombre: row.nombre,
          ip: row.ip
        });
      });
      resolve(sitiosAgrupados);
    });
  });
}

/**
 * Endpoint para obtener el estado del Dashboard con agregaciones de disponibilidad.
 */
app.get("/api/monitoreo", async (req, res) => {
  try {
    const memState = monitoring.getEstadoActual();
    const resultado = [];
    const equiposList = [];

    // Cargar estructura agrupada desde base de datos
    const sitiosAgrupados = await cargarSitiosYEquipos();

    for (const sitio in sitiosAgrupados) {
      const equiposDelSitio = sitiosAgrupados[sitio];
      let activos = 0;
      let inestables = 0;
      let total = equiposDelSitio.length;
      let latenciaSuma = 0;
      let latenciaContador = 0;

      for (const eq of equiposDelSitio) {
        const key = `${sitio}_${eq.ip}`;
        const state = memState[key];
        if (state) {
          if (state.online) {
            activos++;
          }
          if (state.estadoActual === "FLAPPING") {
            inestables++;
          }
          if (state.pingActual > 0) {
            latenciaSuma += state.pingActual;
            latenciaContador++;
          }
        }
      }

      let estado = "OK";
      if (activos === 0) {
        estado = "ERROR";
      } else if (activos < total) {
        estado = "PARCIAL";
      } else if (inestables > 0) {
        estado = "PARCIAL";
      }

      // Calcular disponibilidades usando base de datos de forma paralela asíncrona
      const getAvailability = (days) => {
        return new Promise((resolve) => {
          const filterDate = days === 1 ? "-1 day" : days === 7 ? "-7 days" : "-30 days";
          db.get(
            `SELECT SUM(CASE WHEN estado='OK' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as avail 
             FROM historial 
             WHERE sitio = ? AND fecha >= datetime('now', '${filterDate}', 'localtime')`,
            [sitio],
            (err, row) => {
              if (err || !row || row.avail === null) {
                resolve(100.0);
              } else {
                resolve(Number(row.avail.toFixed(2)));
              }
            }
          );
        });
      };

      const [diaria, semanal, mensual] = await Promise.all([
        getAvailability(1),
        getAvailability(7),
        getAvailability(30)
      ]);

      const latenciaPromedio = latenciaContador > 0 ? Math.round(latenciaSuma / latenciaContador) : 0;

      resultado.push({
        sitio,
        activos,
        total,
        inestables,
        estado,
        disponibilidadDiaria: diaria,
        disponibilidadSemanal: semanal,
        disponibilidadMensual: mensual,
        latenciaPromedio
      });
    }

    // Agregar lista detallada de equipos en memoria
    for (const key in memState) {
      const state = memState[key];
      equiposList.push({
        sitio: state.sitio,
        nombre: state.nombre,
        ip: state.ip,
        online: state.online,
        estadoActual: state.estadoActual,
        latencia: state.pingActual,
        pingMin: state.pingMin === Infinity ? 0 : state.pingMin,
        pingMax: state.pingMax,
        pingPromedio: state.pingCantidad > 0 ? Math.round(state.pingSuma / state.pingCantidad) : 0,
        caidoDesde: state.caidoDesde,
        lastSuccessTime: state.lastSuccessTime || "Nunca"
      });
    }

    res.json({ sitios: resultado, equipos: equiposList });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Historial Avanzado con filtros, ordenación y paginación.
 */
app.get("/api/historial", (req, res) => {
  const {
    sitio,
    equipo,
    estado,
    fecha_inicial,
    fecha_final,
    buscar,
    sort_col,
    sort_dir,
    page,
    limit
  } = req.query;

  const pagina = parseInt(page) || 1;
  const limite = parseInt(limit) || 20;
  const offset = (pagina - 1) * limite;

  let queryConds = [];
  let queryParams = [];

  if (sitio) {
    queryConds.push("sitio = ?");
    queryParams.push(sitio);
  }
  if (equipo) {
    queryConds.push("equipo = ?");
    queryParams.push(equipo);
  }
  if (estado) {
    if (estado === "Online") {
      queryConds.push("estado_nuevo = 'Online'");
    } else if (estado === "Offline") {
      queryConds.push("estado_nuevo = 'Offline'");
    } else if (estado === "Inestable") {
      queryConds.push("estado_nuevo = 'Inestable'");
    }
  }
  if (fecha_inicial) {
    queryConds.push("fecha >= ?");
    queryParams.push(fecha_inicial);
  }
  if (fecha_final) {
    queryConds.push("fecha <= ?");
    queryParams.push(fecha_final + " 23:59:59");
  }
  if (buscar) {
    queryConds.push("(sitio LIKE ? OR equipo LIKE ? OR ip LIKE ?)");
    const searchTerm = `%${buscar}%`;
    queryParams.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = queryConds.length > 0 ? "WHERE " + queryConds.join(" AND ") : "";

  // Ordenación
  const columnasValidas = ["fecha", "sitio", "equipo", "ip", "estado_anterior", "estado_nuevo", "duracion"];
  const sortCol = columnasValidas.includes(sort_col) ? sort_col : "id";
  const sortDir = sort_dir === "ASC" ? "ASC" : "DESC";

  const dataQuery = `
    SELECT * FROM eventos 
    ${whereClause} 
    ORDER BY ${sortCol} ${sortDir} 
    LIMIT ? OFFSET ?
  `;

  const countQuery = `
    SELECT COUNT(*) as total FROM eventos 
    ${whereClause}
  `;

  db.get(countQuery, queryParams, (err, countRow) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const total = countRow ? countRow.total : 0;
    const paginas = Math.ceil(total / limite);

    db.all(dataQuery, [...queryParams, limite, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        datos: rows,
        total,
        paginas,
        pagina
      });
    });
  });
});

/**
 * Detalle completo de equipos por Sitio (se lee de memoria del monitor + disponibilidad calculada).
 */
app.get("/api/sitio/:nombre", (req, res) => {
  const nombre = req.params.nombre;

  db.all("SELECT * FROM equipos_monitoreo WHERE sitio = ? AND activo = 1", [nombre], async (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Sitio no encontrado o sin equipos" });
    }

    try {
      const memState = monitoring.getEstadoActual();
      const resultado = [];

      for (const eq of rows) {
        const key = `${nombre}_${eq.ip}`;
        const state = memState[key];

        // Calcular disponibilidad del equipo (últimos 30 días)
        const getAvailability = () => {
          return new Promise((resolve) => {
            db.get(
              `SELECT SUM(CASE WHEN estado='OK' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as avail 
               FROM historial 
               WHERE ip = ? AND fecha >= datetime('now', '-30 days', 'localtime')`,
              [eq.ip],
              (err, row) => {
                if (err || !row || row.avail === null) {
                  resolve(100.0);
                } else {
                  resolve(Number(row.avail.toFixed(2)));
                }
              }
            );
          });
        };

        const disponibilidad = await getAvailability();

        if (state) {
          resultado.push({
            ip: state.ip,
            nombre: state.nombre,
            online: state.online,
            estadoActual: state.estadoActual,
            latencia: state.pingActual,
            pingMin: state.pingMin === Infinity ? 0 : state.pingMin,
            pingMax: state.pingMax,
            pingPromedio: state.pingCantidad > 0 ? Math.round(state.pingSuma / state.pingCantidad) : 0,
            caidoDesde: state.caidoDesde,
            lastSuccessTime: state.lastSuccessTime || "Nunca",
            disponibilidad
          });
        } else {
          resultado.push({
            ip: eq.ip,
            nombre: eq.nombre,
            online: true,
            estadoActual: "OK",
            latencia: 0,
            pingMin: 0,
            pingMax: 0,
            pingPromedio: 0,
            caidoDesde: null,
            lastSuccessTime: "Nunca",
            disponibilidad: 100.0
          });
        }
      }

      res.json(resultado);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

/**
 * Obtener configuración activa.
 */
app.get("/api/config", (req, res) => {
  db.get("SELECT * FROM configuracion WHERE id = 1", (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(row);
  });
});

/**
 * Actualizar configuración persistente.
 */
app.post("/api/config", (req, res) => {
  const {
    intervalo_monitoreo,
    intentos_caida,
    alerta_sonido,
    alerta_telegram,
    telegram_token,
    telegram_chat_id,
    alerta_notificaciones
  } = req.body;

  db.run(
    `UPDATE configuracion SET
      intervalo_monitoreo = ?,
      intentos_caida = ?,
      alerta_sonido = ?,
      alerta_telegram = ?,
      telegram_token = ?,
      telegram_chat_id = ?,
      alerta_notificaciones = ?
     WHERE id = 1`,
    [
      intervalo_monitoreo,
      intentos_caida,
      alerta_sonido ? 1 : 0,
      alerta_telegram ? 1 : 0,
      telegram_token,
      telegram_chat_id,
      alerta_notificaciones ? 1 : 0
    ],
    (err) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Reiniciar el motor de monitoreo con las nuevas opciones
      monitoring.restart();
      res.json({ success: true });
    }
  );
});

/**
 * Endpoint para obtener el Traceroute asociado a un evento.
 */
app.get("/api/traceroute/evento/:id", (req, res) => {
  const id = req.params.id;
  db.get("SELECT traceroute FROM eventos WHERE id = ?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Evento no encontrado o sin traceroute" });
    }
    res.json({ traceroute: row.traceroute });
  });
});

/**
 * Datos agregados para las gráficas de Chart.js
 */
app.get("/api/estadisticas", async (req, res) => {
  try {
    // 1. Incidentes por sitio (Offline o Flapping)
    const incidentesPorSitio = await new Promise((resolve, reject) => {
      db.all(
        `SELECT sitio, COUNT(*) as count 
         FROM eventos 
         WHERE estado_nuevo IN ('Offline', 'Inestable') 
         GROUP BY sitio`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    // 2. Disponibilidad mensual por sitio (últimos 30 días)
    const disponibilidadPorSitio = await new Promise((resolve, reject) => {
      db.all(
        `SELECT sitio, SUM(CASE WHEN estado='OK' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as disponibilidad 
         FROM historial 
         WHERE fecha >= datetime('now', '-30 days', 'localtime') 
         GROUP BY sitio`,
        (err, rows) => {
          if (err) reject(err);
          else {
            const mapped = rows.map(r => ({
              sitio: r.sitio,
              disponibilidad: Number(r.disponibilidad.toFixed(2))
            }));
            resolve(mapped);
          }
        }
      );
    });

    // 3. Latencia promedio por sitio (últimos 7 días)
    const latenciaPorSitio = await new Promise((resolve, reject) => {
      db.all(
        `SELECT sitio, AVG(latencia) as latencia 
         FROM historial 
         WHERE estado='OK' AND fecha >= datetime('now', '-7 days', 'localtime') 
         GROUP BY sitio`,
        (err, rows) => {
          if (err) reject(err);
          else {
            const mapped = rows.map(r => ({
              sitio: r.sitio,
              latencia: Number(r.latencia.toFixed(1))
            }));
            resolve(mapped);
          }
        }
      );
    });

    // 4. Fallas por día (últimos 15 días)
    const fallasPorDia = await new Promise((resolve, reject) => {
      db.all(
        `SELECT date(fecha) as dia, COUNT(*) as fallas 
         FROM eventos 
         WHERE estado_nuevo = 'Offline' AND fecha >= datetime('now', '-15 days', 'localtime') 
         GROUP BY date(fecha) 
         ORDER BY dia ASC`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    res.json({
      incidentesPorSitio,
      disponibilidadPorSitio,
      latenciaPorSitio,
      fallasPorDia
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

function parsearTracerouteOutput(output, esWindows) {
  const saltos = [];
  const lineas = output.split(/\r?\n/);

  for (const linea of lineas) {
    const limpia = linea.trim();
    if (!limpia) continue;

    const match = limpia.match(/^(\d+)\s+(.*)$/);
    if (!match) continue;

    const salto = match[1];
    const tokens = match[2].split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;

    let ip = "*";
    let intento1 = "* ms";
    let intento2 = "* ms";
    let intento3 = "* ms";

    if (esWindows) {
      if (tokens.length >= 7) {
        ip = tokens[6];
        intento1 = `${tokens[0]} ${tokens[1]}`;
        intento2 = `${tokens[2]} ${tokens[3]}`;
        intento3 = `${tokens[4]} ${tokens[5]}`;
      }
    } else {
      const primerToken = tokens[0];
      if (primerToken === "*" || primerToken === "ms") {
        ip = "*";
      } else {
        ip = primerToken;
      }

      const valores = tokens.slice(1);
      const formatoTiempo = (index) => {
        const valor = valores[index];
        if (!valor) return "* ms";
        if (valor === "*") return "* ms";
        const siguiente = valores[index + 1];
        if (siguiente && /^(ms|msec|msecs)$/i.test(siguiente)) {
          return `${valor} ${siguiente}`;
        }
        return `${valor} ms`;
      };

      intento1 = formatoTiempo(0);
      intento2 = formatoTiempo(2);
      intento3 = formatoTiempo(4);
    }

    saltos.push({ salto, intento1, intento2, intento3, ip });
  }

  return saltos;
}

/**
 * Traceroute manual interactivo
 */
app.get("/api/traceroute/:ip", (req, res) => {
  const ip = req.params.ip?.trim();

  if (!ip) {
    return res.status(400).json({ saltos: [], error: "Debes indicar una IP o hostname válido." });
  }

  const esWindows = process.platform === "win32";
  const baseArgs = esWindows ? ["-d", ip] : ["-n", "-I", "-w", "2", "-q", "2", "-m", "15", ip];

  const ejecutarComando = (comando, args) => new Promise((resolve) => {
    execFile(comando, args, { timeout: 20000 }, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout || "", stderr: stderr || "" });
    });
  });

  const procesar = async () => {
    const resultadoPrincipal = await ejecutarComando(esWindows ? "tracert" : "traceroute", baseArgs);
    let output = [resultadoPrincipal.stdout, resultadoPrincipal.stderr].filter(Boolean).join("\n").trim();
    let saltos = parsearTracerouteOutput(output, esWindows);

    if (saltos.length === 0 && !esWindows) {
      try {
        const resultadoFallback = await ejecutarComando("tracepath", ["-n", ip]);
        const outputFallback = [resultadoFallback.stdout, resultadoFallback.stderr].filter(Boolean).join("\n").trim();
        saltos = parsearTracerouteOutput(outputFallback, false);
        output = outputFallback || output;
      } catch (error) {
        // Ignorar fallback si no está disponible
      }
    }

    const errorMensaje = resultadoPrincipal.error && saltos.length === 0
      ? (resultadoPrincipal.error.code === "ETIMEDOUT" ? "El traceroute tardó demasiado y fue interrumpido." : resultadoPrincipal.error.message)
      : null;

    res.json({ saltos, error: errorMensaje, raw: output });
  };

  procesar().catch((error) => {
    res.status(500).json({ saltos: [], error: error.message });
  });
});

/**
 * Obtener lista de todos los equipos configurados en la DB.
 */
app.get("/api/equipos", (req, res) => {
  db.all("SELECT * FROM equipos_monitoreo ORDER BY sitio ASC, nombre ASC", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

/**
 * --- NUEVOS ENDPOINTS PARA GESTION DINAMICA (CRUD) ---
 */

/**
 * Obtener todos los equipos configurados.
 */
app.get("/api/equipos-config", (req, res) => {
  db.all("SELECT * FROM equipos_monitoreo ORDER BY sitio ASC, nombre ASC", (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows || []);
  });
});

/**
 * Crear un nuevo equipo de monitoreo.
 */
app.post("/api/equipos-config", (req, res) => {
  const { sitio, nombre, ip } = req.body;
  if (!sitio || !nombre || !ip) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  db.run(
    "INSERT INTO equipos_monitoreo (sitio, nombre, ip, activo) VALUES (?, ?, ?, 1)",
    [sitio.trim(), nombre.trim(), ip.trim()],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Esta dirección IP ya está registrada en otro equipo." });
        }
        return res.status(500).json({ error: err.message });
      }

      // Reiniciar motor de monitoreo para aplicar los cambios de inmediato
      monitoring.restart();
      res.json({ success: true, id: this.lastID });
    }
  );
});

/**
 * Actualizar datos de un equipo existente.
 */
app.put("/api/equipos-config/:id", (req, res) => {
  const id = req.params.id;
  const { sitio, nombre, ip } = req.body;

  if (!sitio || !nombre || !ip) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  db.run(
    "UPDATE equipos_monitoreo SET sitio = ?, nombre = ?, ip = ? WHERE id = ?",
    [sitio.trim(), nombre.trim(), ip.trim(), id],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Esta dirección IP ya está registrada en otro equipo." });
        }
        return res.status(500).json({ error: err.message });
      }

      // Reiniciar motor de monitoreo
      monitoring.restart();
      res.json({ success: true });
    }
  );
});

/**
 * Alternar estado activo/inactivo de un equipo (sin eliminarlo).
 */
app.patch("/api/equipos-config/:id/toggle", (req, res) => {
  const id = req.params.id;

  db.get("SELECT activo FROM equipos_monitoreo WHERE id = ?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: "Equipo no encontrado" });
    }

    const nuevoEstado = row.activo === 1 ? 0 : 1;

    db.run("UPDATE equipos_monitoreo SET activo = ? WHERE id = ?", [nuevoEstado, id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Reiniciar motor para aplicar el cambio inmediatamente
      monitoring.restart();
      res.json({ success: true, activo: nuevoEstado });
    });
  });
});

/**
 * Eliminar un equipo del monitoreo.
 */
app.delete("/api/equipos-config/:id", (req, res) => {
  const id = req.params.id;

  db.run("DELETE FROM equipos_monitoreo WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    // Reiniciar motor de monitoreo
    monitoring.restart();
    res.json({ success: true });
  });
});

app.listen(3001, () => {
  console.log("Servidor iniciado en puerto 3001");
});

// Evitar que el proceso muera por errores no capturados
process.on("uncaughtException", (err) => {
  console.error("[ERROR] Excepción no capturada:", err.message);
});

process.on("unhandledRejection", (reason) => {
  console.error("[ERROR] Promesa rechazada sin manejar:", reason);
});