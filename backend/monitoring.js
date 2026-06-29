const ping = require("ping");
const { exec } = require("child_process");
const db = require("./database");
const { enviarMensajeTelegram } = require("./telegram");

// Estado en memoria para rastrear variables dinámicas
let statusState = {};
let monitoringTimeout = null;
let currentIntervalSeconds = 10;
let currentIntentosCaida = 3;

/**
 * Carga la lista de equipos activos desde la base de datos.
 */
function cargarEquiposDesdeDB() {
  return new Promise((resolve) => {
    db.all("SELECT * FROM equipos_monitoreo WHERE activo = 1", (err, rows) => {
      if (err) {
        console.error("Error al cargar equipos desde la DB en el monitor:", err);
        resolve([]);
      } else {
        resolve(rows || []);
      }
    });
  });
}

/**
 * Inicializa el estado en memoria para todos los equipos configurados en la DB.
 */
async function inicializarEstado() {
  const equipos = await cargarEquiposDesdeDB();
  const nuevoEstado = {};
  for (const equipo of equipos) {
    // Si ya existía, conservar estadísticas históricas
    const key = `${equipo.sitio}_${equipo.ip}`;
    const previo = statusState[key];

    nuevoEstado[key] = {
      sitio: equipo.sitio,
      nombre: equipo.nombre,
      ip: equipo.ip,
      online: previo ? previo.online : true,
      estadoActual: previo ? previo.estadoActual : "OK", // "OK", "ERROR", "FLAPPING"
      consecutiveFailures: previo ? previo.consecutiveFailures : 0,
      caidoDesde: previo ? previo.caidoDesde : null,
      // Latencia estadísticas
      pingMin: previo ? previo.pingMin : Infinity,
      pingMax: previo ? previo.pingMax : 0,
      pingSuma: previo ? previo.pingSuma : 0,
      pingCantidad: previo ? previo.pingCantidad : 0,
      pingActual: previo ? previo.pingActual : 0,
      lastSuccessTime: previo ? previo.lastSuccessTime : null,
      // Flapping
      cambiosEstado: previo ? previo.cambiosEstado : [],
      lastRawAlive: previo ? previo.lastRawAlive : true
    };
  }
  statusState = nuevoEstado;
}

/**
 * Carga la configuración activa desde la base de datos.
 */
function cargarConfiguracion() {
  return new Promise((resolve) => {
    db.get("SELECT * FROM configuracion WHERE id = 1", (err, row) => {
      if (err || !row) {
        console.error("Error al cargar configuración de la DB, usando valores por defecto.");
        resolve({
          intervalo_monitoreo: 10,
          intentos_caida: 3
        });
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * Ejecuta el traceroute automático para una IP y asocia el resultado al evento especificado.
 */
function ejecutarTracerouteAutomatico(ip, eventId) {
  console.log(`[Traceroute] Iniciando traceroute automático para ${ip} (Evento ID: ${eventId})...`);
  const esWindows = process.platform === "win32";
  const comando = esWindows ? `tracert -d ${ip}` : `traceroute -n ${ip}`;

  exec(comando, { timeout: 45000 }, (error, stdout, stderr) => {
    let resultado = "";
    if (error) {
      resultado = `Error ejecutando traceroute: ${error.message}\n${stderr}`;
    } else {
      resultado = stdout;
    }

    db.run("UPDATE eventos SET traceroute = ? WHERE id = ?", [resultado, eventId], (err) => {
      if (err) {
        console.error(`Error al guardar traceroute para el evento ${eventId}:`, err);
      } else {
        console.log(`[Traceroute] Guardado exitosamente para Evento ID: ${eventId}`);
      }
    });
  });
}

/**
 * Realiza un ciclo de monitoreo ping a todas las IPs.
 */
async function cicloMonitoreo() {
  const config = await cargarConfiguracion();
  currentIntervalSeconds = config.intervalo_monitoreo || 10;
  currentIntentosCaida = config.intentos_caida || 3;

  const promesas = [];

  for (const key in statusState) {
    const eq = statusState[key];
    promesas.push(
      (async () => {
        try {
          const r = await ping.promise.probe(eq.ip, { timeout: 3 });
          const alive = r.alive;
          const latencia = Number(r.time) || 0;
          const fechaStr = new Date().toISOString();

          // 1. Guardar en tabla historial (pings crudos)
          db.run(
            `INSERT INTO historial (fecha, sitio, equipo, ip, estado, latencia) 
             VALUES (datetime('now', 'localtime'), ?, ?, ?, ?, ?)`
          , [eq.sitio, eq.nombre, eq.ip, alive ? "OK" : "ERROR", latencia]);

          // 2. Procesar latencia en memoria si tiene éxito
          if (alive) {
            eq.pingActual = latencia;
            eq.pingCantidad++;
            eq.pingSuma += latencia;
            eq.pingMax = Math.max(eq.pingMax, latencia);
            eq.pingMin = Math.min(eq.pingMin, latencia);
            eq.lastSuccessTime = new Date().toLocaleString();
          }

          // 3. Flapping (cambio rápido de conectividad cruda)
          if (alive !== eq.lastRawAlive) {
            eq.cambiosEstado.push(Date.now());
            eq.lastRawAlive = alive;
          }

          // Filtrar cambios en los últimos 10 minutos (600,000 ms)
          const diezMinutosAtras = Date.now() - 10 * 60 * 1000;
          eq.cambiosEstado = eq.cambiosEstado.filter(t => t > diezMinutosAtras);

          // Determinar estado de flapping
          let isFlapping = eq.cambiosEstado.length > 3;

          // 4. Lógica de transiciones de estado
          if (alive) {
            // Se recuperó de una caída
            if (!eq.online) {
              const caidoDesdeTs = eq.caidoDesde || Date.now();
              const duracionSegundos = Math.floor((Date.now() - caidoDesdeTs) / 1000);

              eq.online = true;
              eq.caidoDesde = null;
              eq.consecutiveFailures = 0;
              eq.estadoActual = isFlapping ? "FLAPPING" : "OK";

              // Registrar evento de recuperación
              db.run(`
                INSERT INTO eventos (fecha, sitio, equipo, ip, estado_anterior, estado_nuevo, duracion, traceroute, tipo)
                VALUES (datetime('now', 'localtime'), ?, ?, ?, 'Offline', ?, ?, NULL, 'CAMBIO_ESTADO')
              `, [eq.sitio, eq.nombre, eq.ip, eq.estadoActual === "FLAPPING" ? "Inestable" : "Online", duracionSegundos]);

              // Alerta Telegram de Recuperación
              const msg = `✅ <b>Equipo recuperado</b>\n\n<b>Sitio:</b> ${eq.sitio}\n<b>Equipo:</b> ${eq.nombre}\n<b>IP:</b> ${eq.ip}\n<b>Estado:</b> OPERATIVO\n<b>Duración Caída:</b> ${formatearDuracion(duracionSegundos)}\n<b>Hora:</b> ${new Date().toLocaleString()}`;
              enviarMensajeTelegram(msg);
            } else {
              // Estaba online y sigue online. ¿Cambió a Flapping?
              if (isFlapping && eq.estadoActual !== "FLAPPING") {
                eq.estadoActual = "FLAPPING";
                
                db.run(`
                  INSERT INTO eventos (fecha, sitio, equipo, ip, estado_anterior, estado_nuevo, duracion, traceroute, tipo)
                  VALUES (datetime('now', 'localtime'), ?, ?, ?, 'Online', 'Inestable', NULL, NULL, 'FLAPPING')
                `, [eq.sitio, eq.nombre, eq.ip]);

                const msg = `⚠ <b>Conexión Inestable (Flapping)</b>\n\n<b>Sitio:</b> ${eq.sitio}\n<b>Equipo:</b> ${eq.nombre}\n<b>IP:</b> ${eq.ip}\n<b>Estado:</b> INESTABLE\n<b>Hora:</b> ${new Date().toLocaleString()}`;
                enviarMensajeTelegram(msg);
              } else if (!isFlapping && eq.estadoActual === "FLAPPING") {
                eq.estadoActual = "OK";
              }
            }
          } else {
            // Falla
            eq.consecutiveFailures++;

            if (eq.consecutiveFailures >= currentIntentosCaida) {
              // Si estaba online y se declara caída oficial
              if (eq.online) {
                eq.online = false;
                eq.caidoDesde = Date.now();
                eq.estadoActual = isFlapping ? "FLAPPING" : "ERROR";

                // Registrar evento de caída
                db.run(`
                  INSERT INTO eventos (fecha, sitio, equipo, ip, estado_anterior, estado_nuevo, duracion, traceroute, tipo)
                  VALUES (datetime('now', 'localtime'), ?, ?, ?, 'Online', ?, NULL, NULL, 'CAMBIO_ESTADO')
                `, [eq.sitio, eq.nombre, eq.ip, eq.estadoActual === "FLAPPING" ? "Inestable" : "Offline"], function (err) {
                  if (!err) {
                    const eventId = this.lastID;
                    // Trigger traceroute automático asíncrono
                    ejecutarTracerouteAutomatico(eq.ip, eventId);
                  }
                });

                // Alerta Telegram de Caída
                const msg = `🚨 <b>ALERTA MRT</b>\n\n<b>Sitio:</b> ${eq.sitio}\n<b>Equipo:</b> ${eq.nombre}\n<b>IP:</b> ${eq.ip}\n<b>Estado:</b> SIN SERVICIO\n<b>Hora:</b> ${new Date().toLocaleString()}`;
                enviarMensajeTelegram(msg);
              } else {
                // Sigue offline. ¿Cambió a Flapping?
                if (isFlapping && eq.estadoActual !== "FLAPPING") {
                  eq.estadoActual = "FLAPPING";
                  
                  db.run(`
                    INSERT INTO eventos (fecha, sitio, equipo, ip, estado_anterior, estado_nuevo, duracion, traceroute, tipo)
                    VALUES (datetime('now', 'localtime'), ?, ?, ?, 'Offline', 'Inestable', NULL, NULL, 'FLAPPING')
                  `, [eq.sitio, eq.nombre, eq.ip]);

                  const msg = `⚠ <b>Conexión Inestable (Flapping)</b>\n\n<b>Sitio:</b> ${eq.sitio}\n<b>Equipo:</b> ${eq.nombre}\n<b>IP:</b> ${eq.ip}\n<b>Estado:</b> INESTABLE\n<b>Hora:</b> ${new Date().toLocaleString()}`;
                  enviarMensajeTelegram(msg);
                } else if (!isFlapping && eq.estadoActual === "FLAPPING") {
                  eq.estadoActual = "ERROR";
                }
              }
            }
          }
        } catch (e) {
          console.error(`Error en ciclo de monitoreo para IP ${eq.ip}:`, e);
        }
      })()
    );
  }

  // Esperar a que se realicen todos los pings
  await Promise.all(promesas);

  // Agendar el siguiente tick
  monitoringTimeout = setTimeout(cicloMonitoreo, currentIntervalSeconds * 1000);
}

/**
 * Formatea duración en segundos a HH:MM:SS
 */
function formatearDuracion(segundosTotales) {
  if (!segundosTotales || segundosTotales < 0) return "00:00:00";
  const horas = Math.floor(segundosTotales / 3600);
  const minutos = Math.floor((segundosTotales % 3600) / 60);
  const segundos = segundosTotales % 60;
  return [
    horas.toString().padStart(2, "0"),
    minutos.toString().padStart(2, "0"),
    segundos.toString().padStart(2, "0")
  ].join(":");
}

/**
 * Inicia el motor de monitoreo.
 */
async function start() {
  await inicializarEstado();
  console.log("Iniciando motor de monitoreo en segundo plano...");
  cicloMonitoreo();
}

/**
 * Detiene y reinicia el ciclo de monitoreo con la nueva configuración.
 */
async function restart() {
  if (monitoringTimeout) {
    clearTimeout(monitoringTimeout);
  }
  await inicializarEstado();
  cicloMonitoreo();
}

/**
 * Devuelve el estado en memoria de los equipos.
 */
function getEstadoActual() {
  return statusState;
}

module.exports = {
  start,
  restart,
  getEstadoActual,
  formatearDuracion
};
