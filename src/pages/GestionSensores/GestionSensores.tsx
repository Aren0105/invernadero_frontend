import Boton from '../../components/ui/Boton'
import Tarjeta from '../../components/ui/Tarjeta'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { servicioEquipos } from '../../services/equipos'
import { useConfiguracionEquipo } from '../ConfigurarEquipo/useConfiguracionEquipo'
import MarcoEquipo from '../ConfigurarEquipo/components/MarcoEquipo'
import PanelSensores from '../ConfigurarEquipo/components/PanelSensores'

type Props = {
  /** Identificador del invernadero recibido desde la URL. */
  id: string
  /** Navega de regreso al detalle del invernadero. */
  onVolver: () => void
  /** Navega a la pantalla 1 (Asociar controlador y token). */
  onIrControlador: () => void
  /** Navega a la pantalla 3 (Probar conexión y activar placa). */
  onIrConexion: () => void
}

/**
 * Pantalla 2: Gestión y asociación de sensores al invernadero.
 * Reutiliza useConfiguracionEquipo y PanelSensores para evitar lógica repetida.
 */
export default function GestionSensores({ id, onVolver, onIrControlador, onIrConexion }: Props) {
  // Reutilizamos el hook compartido que carga invernadero, controlador, sensores y credenciales.
  const flujo = useConfiguracionEquipo(id)
  const { datos, cargando, ocupado, requiereRevisar } = flujo

  // Bloqueamos los formularios mientras carga, guarda o existe una operación incierta pendiente de revisar.
  const bloqueado = ocupado || cargando || !!flujo.error || requiereRevisar
  const controlador = datos?.controlador

  return (
    <MarcoEquipo
      titulo="Gestión de sensores"
      subtitulo="Asocia, edita o elimina los sensores conectados al controlador del invernadero."
      pasoActivo="sensores"
      invernaderoNombre={datos?.invernadero.nombre}
      rol={datos?.invernadero.rol}
      estadoInvernadero={datos?.invernadero.estado}
      cargando={cargando}
      ocupado={ocupado}
      error={flujo.error}
      errorOperacion={flujo.errorOperacion}
      aviso={flujo.aviso}
      onActualizar={flujo.actualizar}
      onVolver={onVolver}
      onIrControlador={onIrControlador}
      onIrSensores={() => { }}
      onIrConexion={onIrConexion}
    >
      {/* Solo mostramos contenido cuando los datos del invernadero ya están disponibles */}
      {datos && (
        !controlador ? (
          // Si todavía no se asoció un ESP32, guiamos al usuario directamente a la pantalla 1.
          <Tarjeta como="section" className="space-y-3">
            <Titulo nivel={2} variante="seccion">CONTROLADOR REQUERIDO</Titulo>
            <Texto className="text-sm text-[#64766A]">
              Este invernadero aún no tiene un controlador ESP32 asociado. Regístralo primero para poder agregarle sensores.
            </Texto>
            <Boton type="button" variante="verde" onClick={onIrControlador}>
              Ir a asociar controlador
            </Boton>
          </Tarjeta>
        ) : (
          <>
            {/* Resumen mínimo del controlador al que pertenecen los sensores */}
            <Tarjeta como="section" className="space-y-2 text-sm">
              <Texto className="break-words font-semibold">Controlador: {controlador.nombre}</Texto>
              <Texto className="text-[#64766A]">
                ID {controlador.id} · Comunicaciones {controlador.activo ? 'habilitadas' : 'bloqueadas'}
              </Texto>

              {/* El backend exige bloquear comunicaciones antes de editar o eliminar un sensor existente */}
              {controlador.activo && (
                <div className="pt-1">
                  <Texto className="mb-2 text-xs text-amber-800">
                    Para editar o eliminar sensores, primero debes bloquear las comunicaciones en la pantalla de Conexión.
                  </Texto>
                  <Boton
                    type="button"
                    onClick={onIrConexion}
                    className="min-h-11 rounded-xl border border-[#91A595] px-4 text-xs font-semibold"
                  >
                    Ir a bloquear comunicaciones
                  </Boton>
                </div>
              )}
            </Tarjeta>

            {/* Panel reutilizable que lista sensores y maneja agregar / editar / eliminar */}
            <Tarjeta>
              <PanelSensores
                sensores={datos.sensores}
                deshabilitado={bloqueado}
                controladorActivo={controlador.activo}
                onAgregar={(tipo) =>
                  flujo.ejecutar(
                    () => servicioEquipos.agregarSensor(controlador.id, tipo),
                    'Sensor asociado al controlador. Configura su ID en la placa o continúa a Conexión.',
                  )
                }
                onEditar={(sensorId, tipo) =>
                  flujo.ejecutar(
                    () => servicioEquipos.editarSensor(controlador.id, sensorId, tipo),
                    'Sensor actualizado. Recuerda actualizar la configuración en el firmware del ESP32.',
                  )
                }
                onEliminar={(sensorId) =>
                  flujo.ejecutar(
                    () => servicioEquipos.eliminarSensor(controlador.id, sensorId),
                    'Sensor eliminado del controlador.',
                  )
                }
              />
            </Tarjeta>

            {/* Acceso directo al siguiente paso lógico del flujo */}
            <Tarjeta como="section" variante="verde" className="space-y-3">
              <Texto className="text-sm">
                ¿Ya asociaste todos tus sensores? Pasa a la pantalla de conexión para revisar sus IDs y probar la comunicación.
              </Texto>
              <Boton type="button" variante="verde" disabled={ocupado} onClick={onIrConexion}>
                Ir a probar conexión
              </Boton>
            </Tarjeta>
          </>
        )
      )}
    </MarcoEquipo>
  )
}
