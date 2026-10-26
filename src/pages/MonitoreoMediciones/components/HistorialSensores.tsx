import { useMemo, useState } from 'react'
import { Radio, RefreshCw } from 'lucide-react'
import Boton from '../../../components/ui/Boton'
import Seleccion from '../../../components/ui/Seleccion'
import { Texto } from '../../../components/ui/Tipografia'
import { nombresSensor, type Sensor, type TipoSensor } from '../../../types/equipos'
import type { AgrupacionHistorial } from '../../../types/historial'
import { rangoHistorial, fechaLectura, type PeriodoHistorial } from '../../../types/mediciones'
import ConsultaHistorial from './ConsultaHistorial'

type Props = { sensores: Sensor[]; onTiempoReal: (tipo: TipoSensor) => void }

/** Controla filtros y ventana fija; cambia únicamente la página al recorrer el mismo intervalo de fechas. */
export default function HistorialSensores({ sensores, onTiempoReal }: Props) {
  const [seleccion, setSeleccion] = useState(() => ({
    sensorId: (sensores.find((sensor) => sensor.tipo === 'HumedadSuelo') ?? sensores[0]).id,
    periodo: 'hoy' as PeriodoHistorial, agrupacion: 'none' as AgrupacionHistorial,
    rango: rangoHistorial('hoy'), pagina: 1, limite: 100, revision: 0,
  }))
  const sensor = sensores.find((item) => item.id === seleccion.sensorId)!
  const consulta = useMemo(() => ({ rango: seleccion.rango, agrupacion: seleccion.agrupacion, pagina: seleccion.pagina, limite: seleccion.limite }), [seleccion])
  return <div className="space-y-4">
    <div>
      <label htmlFor="sensor-historial" className="mb-2 block text-sm font-semibold">Sensor</label>
      <Seleccion id="sensor-historial" value={seleccion.sensorId} onChange={(evento) => setSeleccion((actual) => ({ ...actual, sensorId: evento.target.value, pagina: 1 }))}>
        {sensores.map((item) => <option key={item.id} value={item.id}>{nombresSensor[item.tipo]} ({item.unidad})</option>)}
      </Seleccion>
    </div>
    <div role="group" aria-label="Período de consulta" className="flex rounded-full border border-[#D8DEDA] p-1">
      {(['hoy', 'semana'] as const).map((periodo) => <Boton key={periodo} type="button" variante="segmento" aria-pressed={seleccion.periodo === periodo}
        onClick={() => setSeleccion((actual) => ({ ...actual, periodo, rango: rangoHistorial(periodo), agrupacion: periodo === 'semana' ? 'hour' : 'none', pagina: 1, revision: actual.revision + 1 }))}
        className={seleccion.periodo === periodo ? 'bg-[#EDEEEE] font-medium' : 'text-[#68756D]'}>{periodo === 'hoy' ? 'Hoy' : 'Últimos 7 días'}</Boton>)}
    </div>
    <Texto className="text-xs text-[#64766A]">Consulta fijada: desde {fechaLectura(seleccion.rango.desde)} hasta {fechaLectura(seleccion.rango.hasta)}. Hora de Perú.</Texto>
    <div className="grid grid-cols-2 gap-3">
      <div><label htmlFor="agrupacion-historial" className="mb-2 block text-sm">Mostrar</label>
        <Seleccion id="agrupacion-historial" value={seleccion.agrupacion} onChange={(evento) => setSeleccion((actual) => ({ ...actual, agrupacion: evento.target.value as AgrupacionHistorial, pagina: 1 }))}>
          <option value="none">Lecturas</option><option value="hour">Promedios por hora</option>
        </Seleccion>
      </div>
      <div><label htmlFor="limite-historial" className="mb-2 block text-sm">Por página</label>
        <Seleccion id="limite-historial" value={seleccion.limite} onChange={(evento) => setSeleccion((actual) => ({ ...actual, limite: Number(evento.target.value), pagina: 1 }))}>
          {[50, 100, 200, 500].map((limite) => <option key={limite} value={limite}>{limite}</option>)}
        </Seleccion>
      </div>
    </div>
    <Boton type="button" onClick={() => setSeleccion((actual) => ({ ...actual, rango: rangoHistorial(actual.periodo), pagina: 1, revision: actual.revision + 1 }))}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D8DEDA] px-4 text-sm"><RefreshCw className="h-4 w-4" aria-hidden="true" />Actualizar lecturas</Boton>
    <ConsultaHistorial key={`${sensor.id}:${JSON.stringify(consulta)}:${seleccion.revision}`} sensor={sensor} consulta={consulta} periodo={seleccion.periodo}
      onPagina={(pagina) => setSeleccion((actual) => ({ ...actual, pagina }))} />
    <Texto className="text-xs text-[#64766A]">Cuando una lectura no tiene hora de medición se utiliza su hora de recepción. Los datos enviados con retraso pueden actualizar el historial; Actualizar lecturas inicia una consulta nueva.</Texto>
    <Boton type="button" variante="verde" onClick={() => onTiempoReal(sensor.tipo)}><Radio className="h-5 w-5" aria-hidden="true" />Abrir pantalla de tiempo real</Boton>
    <Texto className="text-center text-xs text-[#64766A]">La conexión en vivo se implementará por separado.</Texto>
  </div>
}
