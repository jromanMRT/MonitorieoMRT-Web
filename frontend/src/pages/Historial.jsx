import { useEffect, useState } from "react";
import axios from "axios";

export default function Historial() {

    const [datos, setDatos] = useState([]);

    const cargar = async () => {

        const r = await axios.get(
            "http://localhost:3001/api/historial"
        );

        setDatos(r.data);
    };

    useEffect(() => {
        cargar();
    }, []);

    return (

        <div className="p-6">

            <h1 className="text-3xl font-bold mb-4">
                Historial
            </h1>

            <table className="w-full border">

                <thead>

                    <tr className="bg-slate-200">

                        <th>Fecha</th>
                        <th>Sitio</th>
                        <th>IP</th>
                        <th>Estado</th>
                        <th>Latencia</th>

                    </tr>

                </thead>

                <tbody>

                    {datos.map((d) => (

                        <tr key={d.id}>

                            <td>{d.fecha}</td>

                            <td>{d.sitio}</td>

                            <td>{d.ip}</td>

                            <td>
                                {d.estado === "OK"
                                    ? "🟢 OK"
                                    : "🔴 ERROR"}
                            </td>

                            <td>{d.latencia}</td>

                        </tr>

                    ))}

                </tbody>

            </table>

        </div>

    );
}