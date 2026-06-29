import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function DetalleSitio()
{
    const { nombre } = useParams();

    const [equipos, setEquipos] =
        useState([]);

    const [
        ultimaActualizacion,
        setUltimaActualizacion
    ] = useState(null);

    const cargar = async () =>
    {
        try
        {
            const r = await axios.get(
                `/api/sitio/${nombre}`
            );

            setEquipos(r.data);

            setUltimaActualizacion(
                new Date()
            );
        }
        catch (error)
        {
            console.error(error);
        }
    };

    useEffect(() =>
    {
        cargar();

        const intervalo =
            setInterval(
                cargar,
                5000
            );

        return () =>
            clearInterval(intervalo);

    }, [nombre]);

    return (

        <div className="p-6">

            <h1 className="text-3xl font-bold mb-4">
                {nombre}
            </h1>

            <div
                className="
                bg-slate-100
                p-3
                rounded
                mb-4
                "
            >
                <strong>
                    Última actualización:
                </strong>

                {" "}

                {
                    ultimaActualizacion
                        ?
                        ultimaActualizacion
                            .toLocaleString()
                        :
                        "-"
                }
            </div>

            <table
                className="
                w-full
                border
                border-collapse
                "
            >

                <thead>

                    <tr
                        className="
                        bg-slate-200
                        "
                    >
                        <th className="border p-2">
                            IP
                        </th>

                        <th className="border p-2">
                            Nombre
                        </th>

                        <th className="border p-2">
                            Estado
                        </th>

                        <th className="border p-2">
                            Latencia
                        </th>
                    </tr>

                </thead>

                <tbody>

                    {equipos.map((e) => (

                        <tr key={e.ip}>

                            <td className="border p-2">
                                {e.ip}
                            </td>

                            <td className="border p-2">
                                {e.nombre}
                            </td>

                            <td
                                className={
                                    `
                                    border
                                    p-2
                                    font-bold
                                    ${
                                        e.online
                                            ? "text-green-600"
                                            : "text-red-600"
                                    }
                                    `
                                }
                            >
                                {
                                    e.online
                                        ? "🟢 OK"
                                        : "🔴 ERROR"
                                }
                            </td>

                            <td className="border p-2">

                                {
                                    e.online
                                        ? `${e.latencia} ms`
                                        : "-"
                                }

                            </td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>
    );
}