import Boton from '../../../components/ui/Boton'
import Tarjeta from '../../../components/ui/Tarjeta'
import { Texto, Titulo } from '../../../components/ui/Tipografia'
import { fechaEquipo, type Controlador } from '../../../types/equipos'

type Props = {
  /** Controlador asociado al invernadero (null si todavía no se registró ninguno). */
  equipo: Controlador | null
  /** Mensaje de error si falló la consulta del equipo. */
  error: string
  /** Abre la pantalla 1: asociar controlador y generar token de conexión. */
  onConfigurar: () => void
  /** Abre la pantalla 2: gestión y asociación de sensores. */
  onSensores?: () => void
  /** Abre la pantalla 3: probar conexión y activar/bloquear placa. */
  onConexion?: () => void
}

/**
 * Resume el estado del controlador en el detalle del invernadero y ofrece
 * accesos directos a cada pantalla (Controlador/Token, Sensores y Conexión).
 */
export default function SeccionEquipo({ equipo, error, onConfigurar, onSensores, onConexion }: Props) {
  return (
    <section aria-labelledby="titulo-equipo">
      <Titulo nivel={2} id="titulo-equipo" variante="seccion">
        CONTROLADOR DEL INVERNADERO
      </Titulo>
      <Tarjeta className="space-y-3 text-sm">
        {error ? (
          <Texto role="alert" className="text-red-700">{error}</Texto>
        ) : equipo ? (
          <>
            <Texto className="break-words font-semibold">{equipo.nombre}</Texto>
            <Texto>
              Comunicaciones: {equipo.activo ? 'Habilitadas' : 'Bloqueadas'} · Estado: {equipo.conexion}
            </Texto>
            <Texto className="text-[#64766A]">
              Última comunicación: {fechaEquipo(equipo.ultimaComunicacion)}
            </Texto>
          </>
        ) : (
          <Texto className="text-[#64766A]">
            Sin controlador registrado. Asocia el ESP32 y genera su token para comenzar a conectar sensores.
          </Texto>
        )}

        {/* Si todavía no hay controlador, un solo botón lleva al paso 1; si ya existe, mostramos los 3 accesos */}
        {!equipo ? (
          <Boton type="button" variante="verde" onClick={onConfigurar}>
            Asociar controlador
          </Boton>
        ) : (
          <div className="space-y-2 pt-1">
            <Boton type="button" variante="verde" onClick={onConfigurar}>
              Controlador y token
            </Boton>
            <div className="grid grid-cols-2 gap-2">
              <Boton
                type="button"
                onClick={onSensores ?? onConfigurar}
                className="min-h-11 rounded-xl border border-[#91A595] bg-white px-3 text-xs font-semibold text-[#233D32]"
              >
                Sensores
              </Boton>
              <Boton
                type="button"
                onClick={onConexion ?? onConfigurar}
                className="min-h-11 rounded-xl border border-[#91A595] bg-white px-3 text-xs font-semibold text-[#233D32]"
              >
                Probar conexión
              </Boton>
            </div>
          </div>
        )}
      </Tarjeta>
    </section>
  )
}
