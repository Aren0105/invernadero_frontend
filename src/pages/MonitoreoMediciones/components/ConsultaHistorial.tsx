import { useCallback } from 'react'
import Boton from '../../../components/ui/Boton'
import GraficaHistorial from './GraficaHistorial'
import { Texto } from '../../../components/ui/Tipografia'
import { useConsulta } from '../../../hooks/useConsulta'
import { servicioHistorial } from '../../../services/historial'
import { nombresSensor, type Sensor } from '../../../types/equipos'
import type { ConsultaHistorial as Consulta } from '../../../types/historial'
import type { PeriodoHistorial } from '../../../types/mediciones'
import ResumenHistorial from './ResumenHistorial'
import PaginacionHistorial from './PaginacionHistorial'
import { generarDatosSimulados } from './datosSimulados'

type Props = { sensor: Sensor; consulta: Consulta; periodo: PeriodoHistorial; onPagina: (pagina: number) => void }

/** Se monta con una clave por filtro y página: al cambiar la selección se cancelan y ocultan los resultados anteriores. */
export default function ConsultaHistorial({ sensor, consulta, periodo, onPagina }: Props) {
  const modoDemostracion = true
const consultar = useCallback(
  async (signal: AbortSignal) => {
    if (modoDemostracion) {
      return generarDatosSimulados(sensor, consulta)
    }

    return servicioHistorial.consultar(sensor, consulta, signal)
  },
  [sensor, consulta, modoDemostracion]
)
  const { datos, cargando, error, recargar } = useConsulta(consultar)
  if (cargando) return <Texto role="status" className="py-10 text-center text-sm text-[#64766A]">Cargando historial…</Texto>
  if (error) return <div className="space-y-3 py-6"><Texto role="alert" className="text-sm text-red-700">{error}</Texto><Boton type="button" variante="verde" onClick={recargar}>Reintentar consulta</Boton></div>
  if (!datos) return null
  const agrupado = datos.agrupacion === 'hour'
  const sinLecturas = datos.resumen.cantidad === '0'
  return <div className="space-y-4">
  {modoDemostracion && (
    <Texto className="text-center text-xs text-[#64766A]">
      Datos simulados para demostración
    </Texto>
  )}

  <ResumenHistorial pagina={datos} />
    {sinLecturas && <Texto role="status" className="text-center text-sm text-[#64766A]">No hay lecturas para este período.</Texto>}
    {!sinLecturas && !datos.lecturas.length && <Texto role="status" className="text-sm text-[#64766A]">Esta página ya no tiene registros. Vuelve a la primera página o actualiza el período.</Texto>}
    <div className="overflow-hidden rounded-2xl border border-[#D8DEDA] bg-white p-2 shadow-sm [&_figure]:border-0 [&_figure]:bg-white">
  <GraficaHistorial
    lecturas={datos.lecturas}
    nombre={nombresSensor[sensor.tipo]}
    unidad={sensor.unidad}
    periodo={periodo}
    promedios={agrupado}
    alcance={`Gráfica de la página ${datos.paginacion.pagina}; ${agrupado ? 'cada punto es un promedio horario' : 'orden de más antiguas a más recientes'}`}
    mensajeVacio={sinLecturas ? 'Sin lecturas para este período' : 'Sin registros en esta página'}
  />
</div>
    <PaginacionHistorial paginacion={datos.paginacion} agrupado={agrupado} onPagina={onPagina} />
    {datos.paginacion.pagina > 1 && <Boton type="button" onClick={() => onPagina(1)} className="min-h-11 w-full text-sm underline">Volver a la primera página</Boton>}
  </div>
}
