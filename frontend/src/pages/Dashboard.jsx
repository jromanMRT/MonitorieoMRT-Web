import TarjetaSitio from "../components/TarjetaSitio";
import { Link } from "react-router-dom";

export default function Dashboard({
    sitios,
    errorConexion,
    ultimaActualizacion
})
{
    const operativos =
        sitios.filter(
            s => s.activos === s.total
        ).length;

    const problemas =
        sitios.length - operativos;

    return (

        <div className="min-h-screen bg-slate-100">

            <div className="max-w-7xl mx-auto p-6">

                <h1 className="text-4xl font-bold mb-6">
                    Monitoreo MRT
                </h1>

                <div
    className="
    bg-white
    rounded-lg
    shadow
    p-3
    mb-4
    "
>

    <strong>
        Última actualización:
    </strong>

    {" "}

    {
        ultimaActualizacion
            ? ultimaActualizacion.toLocaleString()
            : "Sin datos"
    }

</div>

                <div className="flex gap-4 mb-4">

                    <Link
                        to="/historial"
                        className="
                        bg-blue-600
                        text-white
                        px-4
                        py-2
                        rounded
                        active:scale-99
                        "
                    >
                        Historial
                    </Link>

                    <Link
                        to="/traceroute"
                        className="
                        bg-green-600
                        text-white
                        px-4
                        py-2
                        rounded
                        active:scale-99
                        "
                    >
                        Traceroute
                    </Link>

                </div>

                <div className="flex gap-6 mb-6">

                    <div className="font-semibold">
                        🟢 Operativos: {operativos}
                    </div>

                    <div className="font-semibold">
                        🔴 Con Problemas: {problemas}
                    </div>

                </div>

                {
                    errorConexion &&
                    (
                        <div
                            className="
                            bg-red-600
                            text-white
                            p-4
                            rounded
                            mb-4
                            "
                        >
                            ⚠ No se pudo conectar con el servidor de monitoreo
                        </div>
                    )
                }

                <div
                    className="
                    grid
                    grid-cols-1
                    md:grid-cols-2
                    lg:grid-cols-4
                    gap-4
                    "
                >

                    {sitios.map((sitio) => (

                        <TarjetaSitio
                            key={sitio.sitio}
                            sitio={sitio}
                        />

                    ))}

                </div>

            </div>

        </div>

    );
}