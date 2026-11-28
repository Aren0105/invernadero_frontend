import { useState } from 'react'
import Boton from '../../../components/ui/Boton'
import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { nombresSensor, tiposSensorRegistrables, type Sensor, type TipoSensor } from '../../../types/equipos'
import FormularioSensor from './FormularioSensor'

type Props = {
  /** Lista actual de sensores asociados al controlador. */
  sensores: Sensor[]
  /** Deshabilita acciones por carga o escritura en curso. */
  deshabilitado: boolean
  /** True si el controlador tiene comunicaciones habilitadas (impide editar o eliminar). */
  controladorActivo: boolean
  /** Callbacks para crear, editar y eliminar sensores en el servidor. */
  onAgregar: (tipo: TipoSensor) => Promise<boolean>
  onEditar: (id: string, tipo: TipoSensor) => Promise<boolean>
  onEliminar: (id: string) => Promise<boolean>
}

/**
 * Lista y administra los sensores asociados al controlador.
 * Reutiliza FormularioSensor tanto para crear un sensor nuevo como para editar uno existente.
 */
export default function PanelSensores({ sensores, deshabilitado, controladorActivo, onAgregar, onEditar, onEliminar }: Props) {
  // Controla qué sensor está actualmente en modo 'editar' o confirmando 'eliminar'.
  const [accion, setAccion] = useState<{ id: string; tipo: 'editar' | 'eliminar' } | null>(null)

  // Filtra los tipos de sensor que todavía no se han registrado en este controlador (máximo 1 por tipo).
  const disponibles = tiposSensorRegistrables.filter((tipo) => !sensores.some((sensor) => sensor.tipo === tipo))

  // Editar o eliminar exige que el controlador tenga las comunicaciones bloqueadas.
  const bloqueado = deshabilitado || controladorActivo

  return (
    <section className="space-y-4" aria-labelledby="titulo-sensores">
      <Titulo nivel={2} id="titulo-sensores" variante="seccion">
        SENSORES ASOCIADOS
      </Titulo>

      {!sensores.length && <Texto className="text-sm text-[#64766A]">No hay sensores registrados.</Texto>}

      <Texto className="text-xs text-[#64766A]">
        Para editar o eliminar, bloquea primero las comunicaciones del controlador desde la pantalla de Conexión. Los sensores con mediciones conservan su tipo, unidad e historial.
      </Texto>

      {/* Listado de sensores ya asociados al controlador */}
      <ul className="space-y-3">
        {sensores.map((sensor) => (
          <li key={sensor.id} className="space-y-2 rounded-xl border border-[#D8E1DA] p-3 text-sm">
            <strong>{nombresSensor[sensor.tipo]}</strong>
            <Texto>
              ID: {sensor.id} · Unidad: {sensor.unidad}
            </Texto>
            <Texto className="text-[#64766A]">Último estado registrado: {sensor.conexion}</Texto>

            {accion?.id === sensor.id ? (
              accion.tipo === 'editar' ? (
                // Modo edición: solo ofrece el tipo actual más los tipos que aún no existen en otro sensor.
                <FormularioSensor
                  tipos={tiposSensorRegistrables.filter((tipo) => !sensores.some((otro) => otro.id !== sensor.id && otro.tipo === tipo))}
                  inicial={sensor.tipo}
                  id={`editar-sensor-${sensor.id}`}
                  deshabilitado={bloqueado}
                  etiqueta="Guardar sensor"
                  onGuardar={async (tipo) => {
                    if (await onEditar(sensor.id, tipo)) setAccion(null)
                  }}
                  onCancelar={() => setAccion(null)}
                />
              ) : (
                // Modo confirmación antes de eliminar el sensor.
                <div className="space-y-2" role="group" aria-label="Confirmar eliminación del sensor">
                  <Texto>
                    ¿Eliminar {nombresSensor[sensor.tipo]}? Su identificador dejará de funcionar en la placa. Si tiene mediciones, el servidor rechazará la eliminación.
                  </Texto>
                  <div className="flex flex-wrap gap-2">
                    <Boton
                      type="button"
                      variante="verde"
                      disabled={bloqueado}
                      onClick={() => {
                        void onEliminar(sensor.id).then((ok) => {
                          if (ok) setAccion(null)
                        })
                      }}
                    >
                      Eliminar sensor
                    </Boton>
                    <Boton type="button" disabled={deshabilitado} onClick={() => setAccion(null)} className="min-h-11 rounded-xl border px-4">
                      Cancelar
                    </Boton>
                  </div>
                </div>
              )
            ) : (
              // Botones normales de Editar y Eliminar para cada sensor.
              <div className="flex gap-2">
                <Boton
                  type="button"
                  disabled={bloqueado}
                  onClick={() => setAccion({ id: sensor.id, tipo: 'editar' })}
                  className="min-h-11 rounded-xl border px-4 disabled:opacity-60"
                  aria-label={`Editar ${nombresSensor[sensor.tipo]}`}
                >
                  Editar
                </Boton>
                <Boton
                  type="button"
                  disabled={bloqueado}
                  onClick={() => setAccion({ id: sensor.id, tipo: 'eliminar' })}
                  className="min-h-11 rounded-xl border border-red-300 px-4 text-red-700 disabled:opacity-60"
                  aria-label={`Eliminar ${nombresSensor[sensor.tipo]}`}
                >
                  Eliminar
                </Boton>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* Formulario de alta cuando aún quedan tipos de sensor por asociar */}
      {disponibles.length ? (
        <FormularioSensor
          key={disponibles.join(',')}
          tipos={disponibles}
          id="agregar-sensor"
          deshabilitado={deshabilitado || !!accion}
          etiqueta="Agregar sensor"
          onGuardar={onAgregar}
        />
      ) : (
        <Texto className="text-sm text-[#64766A]">Ya registraste los cuatro tipos disponibles.</Texto>
      )}
    </section>
  )
}
