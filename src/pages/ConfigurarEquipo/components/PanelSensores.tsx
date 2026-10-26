import { useState } from 'react'
import Boton from '../../../components/ui/Boton'
import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { nombresSensor, tiposSensorRegistrables, type Sensor, type TipoSensor } from '../../../types/equipos'
import FormularioSensor from './FormularioSensor'

type Props = {
  sensores: Sensor[]; deshabilitado: boolean; controladorActivo: boolean
  onAgregar: (tipo: TipoSensor) => Promise<boolean>
  onEditar: (id: string, tipo: TipoSensor) => Promise<boolean>
  onEliminar: (id: string) => Promise<boolean>
}

/** Administra registros; confirma la eliminación sin borrar ni reinterpretar el historial. */
export default function PanelSensores({ sensores, deshabilitado, controladorActivo, onAgregar, onEditar, onEliminar }: Props) {
  const [accion, setAccion] = useState<{ id: string; tipo: 'editar' | 'eliminar' } | null>(null)
  const disponibles = tiposSensorRegistrables.filter((tipo) => !sensores.some((sensor) => sensor.tipo === tipo))
  const bloqueado = deshabilitado || controladorActivo
  return <section className="space-y-4" aria-labelledby="titulo-sensores">
    <Titulo nivel={2} id="titulo-sensores" variante="seccion">2. SENSORES</Titulo>
    {!sensores.length && <Texto className="text-sm text-[#64766A]">No hay sensores registrados.</Texto>}
    <Texto className="text-xs text-[#64766A]">Para editar o eliminar, bloquea primero las comunicaciones del controlador en esta pantalla. Los sensores con mediciones conservan su tipo, unidad e historial.</Texto>
    <ul className="space-y-3">{sensores.map((sensor) => <li key={sensor.id} className="space-y-2 rounded-xl border border-[#D8E1DA] p-3 text-sm">
      <strong>{nombresSensor[sensor.tipo]}</strong>
      <Texto>ID: {sensor.id} · Unidad: {sensor.unidad}</Texto>
      <Texto className="text-[#64766A]">Último estado registrado: {sensor.conexion}</Texto>
      {accion?.id === sensor.id ? accion.tipo === 'editar' ? <FormularioSensor
        tipos={tiposSensorRegistrables.filter((tipo) => !sensores.some((otro) => otro.id !== sensor.id && otro.tipo === tipo))}
        inicial={sensor.tipo} id={`editar-sensor-${sensor.id}`} deshabilitado={bloqueado} etiqueta="Guardar sensor"
        onGuardar={async (tipo) => { if (await onEditar(sensor.id, tipo)) setAccion(null) }}
        onCancelar={() => setAccion(null)} /> : <div className="space-y-2" role="group" aria-label="Confirmar eliminación del sensor">
          <Texto>¿Eliminar {nombresSensor[sensor.tipo]}? Su identificador dejará de funcionar en la placa. Si tiene mediciones, el servidor rechazará la eliminación.</Texto>
          <div className="flex flex-wrap gap-2">
            <Boton type="button" variante="verde" disabled={bloqueado} onClick={() => { void onEliminar(sensor.id).then((ok) => { if (ok) setAccion(null) }) }}>Eliminar sensor</Boton>
            <Boton type="button" disabled={deshabilitado} onClick={() => setAccion(null)} className="min-h-11 rounded-xl border px-4">Cancelar</Boton>
          </div>
        </div> : <div className="flex gap-2">
          <Boton type="button" disabled={bloqueado} onClick={() => setAccion({ id: sensor.id, tipo: 'editar' })} className="min-h-11 rounded-xl border px-4 disabled:opacity-60" aria-label={`Editar ${nombresSensor[sensor.tipo]}`}>Editar</Boton>
          <Boton type="button" disabled={bloqueado} onClick={() => setAccion({ id: sensor.id, tipo: 'eliminar' })} className="min-h-11 rounded-xl border border-red-300 px-4 text-red-700 disabled:opacity-60" aria-label={`Eliminar ${nombresSensor[sensor.tipo]}`}>Eliminar</Boton>
        </div>}
    </li>)}</ul>
    {disponibles.length ? <FormularioSensor key={disponibles.join(',')} tipos={disponibles} id="agregar-sensor" deshabilitado={deshabilitado || !!accion}
      etiqueta="Agregar sensor" onGuardar={onAgregar} /> : <Texto className="text-sm text-[#64766A]">Ya registraste los cuatro tipos disponibles.</Texto>}
  </section>
}
