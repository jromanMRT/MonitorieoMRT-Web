import axios from "axios";
import { useEffect, useState } from "react";

export default function Traceroute() {
    const [equipos, setEquipos] = useState([]);
    const [ip, setIp] = useState("");
    const [saltos, setSaltos] =
        useState([]);
    const ultimoSalto =
        saltos.length > 0
            ? saltos[saltos.length - 1].ip
            : null;
    const cargarEquipos = async () => {
        try {
            const r = await axios.get(
                "http://localhost:3001/api/equipos"
            );

            setEquipos(r.data);

            if (r.data.length > 0) {
                setIp(r.data[0].ip);
            }
        }
        catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        cargarEquipos();
    }, []);

    const ejecutar = async () => {
        try {
            const r = await axios.get(
                `http://localhost:3001/api/traceroute/${ip}`
            );

            setSaltos(r.data.saltos);
        }
        catch {
            alert("Error ejecutando traceroute");
        }
    };

    const equipoSeleccionado =
        equipos.find(
            e => e.ip === ip
        );

    return (
        <div className="p-6">

            <h1 className="text-3xl font-bold mb-4">
                Traceroute
            </h1>

            <input
                type="text"
                value={ip}
                onChange={(e) =>
                    setIp(e.target.value)
                }
                placeholder="IP o hostname"
                className="
    border
    p-2
    w-96
    mb-3
    "
            />

            <div className="mb-4">
                <label className="block mb-2 font-semibold">
                    Seleccionar equipo
                </label>

                <select
                    className="border p-2 w-96"
                    value={ip}
                    onChange={(e) =>
                        setIp(e.target.value)
                    }
                >
                    {equipos.map((equipo) => (

                        <option
                            key={equipo.ip}
                            value={equipo.ip}
                        >
                            [{equipo.sitio}]
                            {" "}
                            {equipo.nombre}
                            {" - "}
                            {equipo.ip}
                        </option>

                    ))}
                </select>
            </div>

            <div className="mb-4">
                <div className="mb-4">

                    <strong>
                        Equipo:
                    </strong>

                    {" "}

                    {
                        equipoSeleccionado
                            ?.nombre
                    }

                    <br />

                    <strong>
                        IP:
                    </strong>

                    {" "}

                    {ip}

                </div>
            </div>

            <button
    onClick={ejecutar}
    className="
        bg-green-600
        hover:bg-green-700
        text-white
        px-4
        py-2
        rounded
        mb-4

        shadow-lg
        transition-all
        duration-50

        active:scale-99

        cursor-pointer
        select-none
    "
>
    Ejecutar Traceroute
</button>

            <div>

                {
                    ultimoSalto &&
                    (
                        <div
                            className="
                bg-blue-100
                p-3
                rounded
                mb-4
                "
                        >
                            <strong>
                                Último salto recibido:
                            </strong>

                            <br />

                            {ultimoSalto}
                        </div>
                    )
                }

                <table
                    className="
    w-full
    border
    border-collapse
    "
                >

                    <thead>

                        <tr className="bg-slate-200">

                            <th className="border p-2">
                                Salto
                            </th>

                            <th className="border p-2">
                                Intento 1
                            </th>

                            <th className="border p-2">
                                Intento 2
                            </th>

                            <th className="border p-2">
                                Intento 3
                            </th>

                            <th className="border p-2">
                                IP
                            </th>

                        </tr>

                    </thead>

                    <tbody>

                        {saltos.map((salto) => (

                            <tr key={salto.salto}>

                                <td className="border p-2">
                                    {salto.salto}
                                </td>

                                <td className="border p-2">
                                    {salto.intento1}
                                </td>

                                <td className="border p-2">
                                    {salto.intento2}
                                </td>

                                <td className="border p-2">
                                    {salto.intento3}
                                </td>

                                <td className="border p-2">
                                    {salto.ip}
                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>
    );
}