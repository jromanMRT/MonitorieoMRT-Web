import { Link } from "react-router-dom";

export default function TarjetaSitio({ sitio })
{
    let color = "bg-green-100";
    let texto = "🟢 Operativo";

    if (sitio.activos === 0)
    {
        color = "bg-red-100";
        texto = "🔴 Sin Servicio";
    }
    else if (sitio.activos < sitio.total)
    {
        color = "bg-yellow-100";
        texto = "🟡 Parcial";
    }

    return (

        <Link
            to={`/sitio/${sitio.sitio}`}
        >

            <div
                className={`
                    ${color}
                    rounded-xl
                    shadow-lg
                    p-5
                    border
                    hover:shadow-xl
                    transition
                    cursor-pointer
                `}
            >

                <h2 className="text-xl font-bold">
                    {sitio.sitio}
                </h2>

                <div className="mt-3">
                    {texto}
                </div>

                <div className="mt-2">

                    Equipos activos:

                    <strong>
                        {" "}
                        {sitio.activos}/{sitio.total}
                    </strong>

                </div>

            </div>

        </Link>

    );
}