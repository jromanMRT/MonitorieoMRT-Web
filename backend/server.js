const express = require("express");
const cors = require("cors");
const ping = require("ping");
const db = require("./database");
const app = express();
const { exec } = require("child_process");

app.use(cors());
app.use(express.json());


const sitios = {
  "ADR LAB": [
    {
      nombre: "LABORATORIO",
      ip: "192.168.30.1"
    },
    {
      nombre: "NVR1",
      ip: "192.168.30.217"
    },
    {
      nombre: "NVR2",
      ip: "192.168.30.17"
    }
  ],

  OLIVOS: [
    {
      nombre: "PLANTA",
      ip: "192.168.20.1"
    },
    {
      nombre: "NVR",
      ip: "192.168.20.9"
    }
  ],

  "CIENEGUITA PLANTA": [
    {
      nombre: "PLANTA",
      ip: "192.168.10.1"
    },
    {
      nombre: "NVR PLANTA",
      ip: "192.168.10.91"
    }
  ],

  "CIENEGUITA MINA": [
    {
      nombre: "MINA",
      ip: "192.168.40.1"
    },
    {
      nombre: "NVR MINA",
      ip: "192.168.40.14"
    },
    {
      nombre: "NVR BASCULA",
      ip: "192.168.40.25"
    }
  ],

  "CIENEGUITA ALMACEN": [
    {
      nombre: "ALMACEN",
      ip: "192.168.80.1"
    },
    {
      nombre: "NVR ALMACEN",
      ip: "192.168.80.71"
    }
  ],

  "VILLA MATAMOROS": [
    {
      nombre: "PLANTA",
      ip: "192.168.70.1"
    },
    {
      nombre: "NVR PLANTA",
      ip: "192.168.70.240"
    },
    {
      nombre: "NVR CASETA",
      ip: "192.168.70.239"
    }
  ]
};

app.get("/api/monitoreo", async (req, res) => {

  const resultado = [];

  for (const sitio in sitios) {

    let activos = 0;
    let total = sitios[sitio].length;

    for (const equipo of sitios[sitio])
{
    const r =
        await ping.promise.probe(
            equipo.ip
        );

      if (r.alive)
        activos++;

      db.run(
        `
        INSERT INTO historial
        (
          fecha,
          sitio,
          ip,
          estado,
          latencia
        )
        VALUES
        (
          datetime('now'),
          ?,
          ?,
          ?,
          ?
        )
        `,
        [
          sitio,
          equipo.ip,
          r.alive ? "OK" : "ERROR",
          Number(r.time) || 0
        ]
      );
    }

    let estado = "OK";

if (activos === 0)
{
  estado = "ERROR";
}
else if (activos < total)
{
  estado = "PARCIAL";
}

resultado.push({
  sitio,
  activos,
  total,
  estado
});
  }

  res.json(resultado);
});

app.get("/api/historial", (req, res) => {

    db.all(
        `
        SELECT *
        FROM historial
        ORDER BY id DESC
        LIMIT 500
        `,
        [],
        (err, rows) => {

            if (err)
            {
                return res.status(500).json({
                    error: err.message
                });
            }

            res.json(rows);
        }
    );

});

app.get("/api/sitio/:nombre", async (req, res) => {

    const nombre = req.params.nombre;

    if (!sitios[nombre]) {
        return res.status(404).json({
            error: "Sitio no encontrado"
        });
    }

    const resultado = [];

    for (const equipo of sitios[nombre]) {

        const r = await ping.promise.probe(equipo.ip);

        resultado.push({
            ip: equipo.ip,
            nombre: equipo.nombre,
            online: r.alive,
            latencia: Number(r.time) || null
        });
    }

    res.json(resultado);
});

app.get(
    "/api/traceroute/:ip",
    (req, res) =>
    {
        const ip = req.params.ip;

        exec(
            `tracert -d ${ip}`,
            {
                timeout: 30000
            },
            (error, stdout) =>
            {
                if (error)
                {
                    return res.status(500).json({
                        error: error.message
                    });
                }

                const lineas =
                    stdout.split("\n");

                const saltos = [];

                for (const linea of lineas)
                {
                    const limpia =
                        linea.trim();

                    if (
                        !/^\d+/.test(limpia)
                    )
                    {
                        continue;
                    }

                    const partes =
                        limpia.split(/\s+/);

                    if (partes.length >= 8)
                    {
                        saltos.push({
                            salto: partes[0],
                            intento1:
                                partes[1] +
                                " " +
                                partes[2],
                            intento2:
                                partes[3] +
                                " " +
                                partes[4],
                            intento3:
                                partes[5] +
                                " " +
                                partes[6],
                            ip:
                                partes[7]
                        });
                    }
                }

                res.json({
                    saltos
                });
            }
        );
    }
);

app.get("/api/equipos", (req, res) =>
{
    const lista = [];

    for (const sitio in sitios)
    {
        for (const equipo of sitios[sitio])
        {
            lista.push({
                sitio,
                nombre: equipo.nombre,
                ip: equipo.ip
            });
        }
    }

    res.json(lista);
});

app.listen(3001, () => {
  console.log(
    "Servidor iniciado en puerto 3001"
  );
});