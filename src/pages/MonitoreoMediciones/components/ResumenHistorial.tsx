
import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { valorMedicion, type PaginaHistorial } from '../../../types/historial'

/** Las estadísticas abarcan el período completo, independientemente de la página o agrupación de la gráfica. */
export default function ResumenHistorial({ pagina }: { pagina: PaginaHistorial }) {
  const { resumen, sensor } = pagina

  return (
    <section
      aria-labelledby="resumen-historial"
      className="rounded-2xl border border-[#D8DEDA] bg-[#E8F3EC] p-4 shadow-sm"
    >

      <Titulo
        nivel={2}
        id="resumen-historial"
        className="text-sm font-semibold text-[#233D32]"
      >
        Resumen del período completo
      </Titulo>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">

        <div className="rounded-xl border border-[#D8DEDA] bg-white p-3">
          <dt className="text-[#64766A]">Promedio</dt>
          <dd className="mt-1 text-lg font-semibold text-[#245B40]">
            {valorMedicion(resumen.promedio, sensor.unidad)}
          </dd>
        </div>

        <div className="rounded-xl border border-[#D8DEDA] bg-white p-3">
          <dt className="text-[#64766A]">Mediciones</dt>
          <dd className="mt-1 text-lg font-semibold text-[#245B40]">
            {BigInt(resumen.cantidad).toLocaleString('es-PE')}
          </dd>
        </div>

        <div className="rounded-xl border border-[#D8DEDA] bg-white p-3">
          <dt className="text-[#64766A]">Mínimo</dt>
          <dd className="mt-1 text-lg font-semibold text-[#245B40]">
            {valorMedicion(resumen.minimo, sensor.unidad)}
          </dd>
        </div>

        <div className="rounded-xl border border-[#D8DEDA] bg-white p-3">
          <dt className="text-[#64766A]">Máximo</dt>
          <dd className="mt-1 text-lg font-semibold text-[#245B40]">
            {valorMedicion(resumen.maximo, sensor.unidad)}
          </dd>
        </div>

      </dl>

      <Texto className="mt-3 text-xs text-[#64766A]">
        Las horas sin muestras se omiten; no se rellenan con ceros.
      </Texto>

    </section>
  )
}
