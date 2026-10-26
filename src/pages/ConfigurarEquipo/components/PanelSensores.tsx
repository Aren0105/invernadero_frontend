import { useState } from 'react'
import isLength from 'validator/lib/isLength'
import Entrada from '../../../components/ui/Entrada'
import Seleccion from '../../../components/ui/Seleccion'
import Boton from '../../../components/ui/Boton'
import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { nombresSensor, tiposSensor, type Sensor, type TipoSensor } from '../../../types/equipos'

type Props = { sensores: Sensor[]; deshabilitado: boolean; onAgregar: (tipo: TipoSensor, unidad: string) => Promise<boolean> }

/** Lista los sensores reales y permite un registro por tipo; no configura pines ni valores de medición. */
export default function PanelSensores({ sensores, deshabilitado, onAgregar }: Props) {
  const [tipo, setTipo] = useState<TipoSensor>('HumedadAmbiental')
  const [unidad, setUnidad] = useState('%')
  const [error, setError] = useState('')
  const disponibles = tiposSensor.filter((opcion) => !sensores.some((sensor) => sensor.tipo === opcion))
  const seleccionado = disponibles.includes(tipo) ? tipo : disponibles[0]
  return <section className="space-y-4" aria-labelledby="titulo-sensores">
    <Titulo nivel={2} id="titulo-sensores" variante="seccion">2. SENSORES</Titulo>
    {!sensores.length && <Texto className="text-sm text-[#64766A]">No hay sensores registrados.</Texto>}
    <ul className="space-y-3">{sensores.map((sensor) => <li key={sensor.id} className="rounded-xl border border-[#D8E1DA] p-3 text-sm">
      <strong>{nombresSensor[sensor.tipo]}</strong>
      <Texto className="mt-1">ID: {sensor.id} · Unidad: {sensor.unidad}</Texto>
      <Texto className="mt-1 text-[#64766A]">Último estado registrado: {sensor.conexion}</Texto>
    </li>)}</ul>
    {disponibles.length ? <form noValidate className="space-y-3" onSubmit={(evento) => {
      evento.preventDefault()
      if (deshabilitado) return
      if (!isLength(unidad.trim(), { min: 1, max: 10 })) { setError('La unidad debe tener entre 1 y 10 caracteres.'); return }
      setError('')
      void onAgregar(seleccionado, unidad)
    }}>
      <label htmlFor="tipo-sensor" className="block text-sm font-semibold">Tipo de sensor</label>
      <Seleccion id="tipo-sensor" value={seleccionado} disabled={deshabilitado} onChange={(evento) => setTipo(evento.target.value as TipoSensor)}>
        {disponibles.map((opcion) => <option key={opcion} value={opcion}>{nombresSensor[opcion]}</option>)}
      </Seleccion>
      <label htmlFor="unidad-sensor" className="block text-sm font-semibold">Unidad de medida</label>
      <Entrada id="unidad-sensor" value={unidad} variante="redondeada" disabled={deshabilitado} onChange={(evento) => { setUnidad(evento.target.value); setError('') }}
        placeholder="Ej. % o cm" aria-invalid={!!error} aria-describedby={error ? 'error-unidad' : 'ayuda-unidad'} />
      <Texto id="ayuda-unidad" className="text-xs text-[#64766A]">Debe coincidir con los valores que envía la placa. La aplicación no convierte unidades.</Texto>
      {error && <Texto id="error-unidad" role="alert" className="text-sm text-red-700">{error}</Texto>}
      <Boton type="submit" variante="verde" disabled={deshabilitado} className="disabled:opacity-60">Agregar sensor</Boton>
    </form> : <Texto className="text-sm text-[#64766A]">Ya registraste los tres tipos disponibles.</Texto>}
  </section>
}
