import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { valorMedicion, type PaginaHistorial } from '../../../types/historial'

/** Las estadísticas abarcan el período completo, independientemente de la página o agrupación de la gráfica. */
export default function ResumenHistorial({ pagina }: { pagina: PaginaHistorial }) {
  const { resumen, sensor } = pagina
  return <section aria-labelledby="resumen-historial" className="rounded-xl bg-[#E8F3EC] p-4">
    <Titulo nivel={2} id="resumen-historial" className="text-sm font-semibold">Resumen del período completo</Titulo>
    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
      <div><dt className="text-[#64766A]">Promedio</dt><dd className="mt-1 text-lg font-semibold">{valorMedicion(resumen.promedio, sensor.unidad)}</dd></div>
      <div><dt className="text-[#64766A]">Mediciones</dt><dd className="mt-1 text-lg font-semibold">{BigInt(resumen.cantidad).toLocaleString('es-PE')}</dd></div>
      <div><dt className="text-[#64766A]">Mínimo</dt><dd>{valorMedicion(resumen.minimo, sensor.unidad)}</dd></div>
      <div><dt className="text-[#64766A]">Máximo</dt><dd>{valorMedicion(resumen.maximo, sensor.unidad)}</dd></div>
    </dl>
    <Texto className="mt-3 text-xs text-[#64766A]">Las horas sin muestras se omiten; no se rellenan con ceros.</Texto>
  </section>
}
