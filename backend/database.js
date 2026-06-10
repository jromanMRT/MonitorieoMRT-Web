const sqlite3 = require("sqlite3").verbose();

const path = require("path");

const db = new sqlite3.Database(
    path.join(__dirname, "data", "monitoreo.db")
);

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS historial(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT,
      sitio TEXT,
      ip TEXT,
      estado TEXT,
      latencia INTEGER
    )
  `);

});

module.exports = db;