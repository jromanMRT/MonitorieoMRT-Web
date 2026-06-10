import { useEffect, useState } from "react";
import axios from "axios";

import { Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import DetalleSitio from "./pages/DetalleSitio";
import Historial from "./pages/Historial";
import Traceroute from "./pages/Traceroute";

export default function App()
{
    const [sitios, setSitios] = useState([]);
  const [ultimaActualizacion, setUltimaActualizacion] =
    useState(null);
    const [errorConexion, setErrorConexion] =
        useState(false);

    const cargar = async () =>
    {
        try
        {
            const r =
                await axios.get(
                    "http://localhost:3001/api/monitoreo"
                );

            setSitios(r.data);

setUltimaActualizacion(
    new Date()
);

setErrorConexion(false);
        }
        catch
        {
            setErrorConexion(true);
        }
    };

    useEffect(() =>
    {
        cargar();

        const intervalo =
            setInterval(cargar, 10000);

        return () =>
            clearInterval(intervalo);

    }, []);

    return (

        <Routes>

            <Route
                path="/"
                element={
                    <Dashboard
    sitios={sitios}
    errorConexion={errorConexion}
    ultimaActualizacion={
        ultimaActualizacion
    }
/>
                }
            />

            <Route
                path="/sitio/:nombre"
                element={<DetalleSitio />}
            />

            <Route
                path="/historial"
                element={<Historial />}
            />

            <Route
                path="/traceroute"
                element={<Traceroute />}
            />

        </Routes>

    );
}