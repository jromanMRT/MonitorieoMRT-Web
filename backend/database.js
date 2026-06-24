const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const db = new sqlite3.Database(
    path.join(__dirname, "data", "monitoreo.db")
);

db.serialize(() => {
  // Tabla para pings crudos (historial_ping)
  db.run(`
    CREATE TABLE IF NOT EXISTS historial(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT,
      sitio TEXT,
      equipo TEXT,
      ip TEXT,
      estado TEXT,
      latencia INTEGER
    )
  `);

  // Migración para bases de datos existentes: agregar columna equipo si no existe
  db.run(`ALTER TABLE historial ADD COLUMN equipo TEXT`, (err) => {
    if (err) {
      // Ignorar error si la columna ya existe
    }
  });

  // Tabla para eventos de estado, flapping y traceroutes
  db.run(`
    CREATE TABLE IF NOT EXISTS eventos(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT,
      sitio TEXT,
      equipo TEXT,
      ip TEXT,
      estado_anterior TEXT,
      estado_nuevo TEXT,
      duracion INTEGER,
      traceroute TEXT,
      tipo TEXT
    )
  `);

  // Tabla para configuraciones persistentes
  db.run(`
    CREATE TABLE IF NOT EXISTS configuracion(
      id INTEGER PRIMARY KEY,
      intervalo_monitoreo INTEGER,
      intentos_caida INTEGER,
      alerta_sonido INTEGER,
      alerta_telegram INTEGER,
      telegram_token TEXT,
      telegram_chat_id TEXT,
      alerta_notificaciones INTEGER
    )
  `);

  // Insertar configuraciones por defecto
  db.run(`
    INSERT OR IGNORE INTO configuracion (
      id, 
      intervalo_monitoreo, 
      intentos_caida, 
      alerta_sonido, 
      alerta_telegram, 
      telegram_token, 
      telegram_chat_id, 
      alerta_notificaciones
    ) VALUES (1, 10, 3, 1, 0, '', '', 1)
  `);

  // Tabla para la lista dinámica de equipos de monitoreo
  db.run(`
    CREATE TABLE IF NOT EXISTS equipos_monitoreo(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sitio TEXT,
      nombre TEXT,
      ip TEXT UNIQUE,
      activo INTEGER DEFAULT 1
    )
  `);

  // Migración: agregar columna activo si no existe (para bases de datos previas)
  db.run(`ALTER TABLE equipos_monitoreo ADD COLUMN activo INTEGER DEFAULT 1`, (err) => {
    if (err) {
      // Ignorar error si la columna ya existe
    } else {
      // Si se agregó la columna, activar todos los equipos existentes
      db.run(`UPDATE equipos_monitoreo SET activo = 1 WHERE activo IS NULL`);
    }
  });

  // Sembrar (seed) la tabla equipos_monitoreo con los datos del archivo estático sitios.js si está vacía
  db.get("SELECT COUNT(*) as count FROM equipos_monitoreo", (err, row) => {
    if (!err && row && row.count === 0) {
      console.log("Sembrando equipos de monitoreo iniciales desde sitios.js...");
      try {
        const sitiosDefecto = require("./sitios");
        for (const sitio in sitiosDefecto) {
          for (const eq of sitiosDefecto[sitio]) {
            db.run(
              "INSERT OR IGNORE INTO equipos_monitoreo (sitio, nombre, ip, activo) VALUES (?, ?, ?, 1)",
              [sitio, eq.nombre, eq.ip]
            );
          }
        }
      } catch (e) {
        console.error("Error al sembrar equipos iniciales:", e);
      }
    }
  });
});

module.exports = db;