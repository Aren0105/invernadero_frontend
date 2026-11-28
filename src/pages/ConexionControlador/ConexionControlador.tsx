import { useEffect, useState } from 'react'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import Boton from '../../components/ui/Boton'
import Tarjeta from '../../components/ui/Tarjeta'
import { Texto, Titulo } from '../../components/ui/Tipografia'
import { servicioEquipos } from '../../services/equipos'
import { credencialVigente, fechaEquipo, nombresSensor } from '../../types/equipos'
import { useConfiguracionEquipo } from '../ConfigurarEquipo/useConfiguracionEquipo'
import MarcoEquipo from '../ConfigurarEquipo/components/MarcoEquipo'
import GuiaInstalacion from '../ConfigurarEquipo/components/GuiaInstalacion'
import PanelEstadoControlador from '../ConfigurarEquipo/components/PanelEstadoControlador'

type Props = {
  /** Identificador del invernadero leído de la URL. */
  id: string
  /** Navega de vuelta al detalle del invernadero. */
  onVolver: () => void
  /** Navega a la pantalla 1 (Controlador y generación de token). */
  onIrControlador: () => void
  /** Navega a la pantalla 2 (Gestión y asociación de sensores). */
  onIrSensores: () => void
}

/**
 * Pantalla 3: Prueba/verificación de conexión, parámetros del firmware y activación del controlador.
 * Consulta el estado real reportado por el servidor sin simular conexiones ni enviar tokens humanos a rutas del ESP32.
 */
export default function ConexionControlador({ id, onVolver, onIrControlador, onIrSensores }: Props) {
  const flujo = useConfiguracionEquipo(id)

  // Reloj periódico para evaluar si alguna credencial venció mientras la pantalla está abierta.
  const [ahora, setAhora] = useState(Date.now)
  useEffect(() => {
    const temporizador = window.setInterval(() => setAhora(Date.now()), 10000)
    return () => window.clearInterval(temporizador)
  }, [])

  const { datos, cargando, ocupado, requiereRevisar } = flujo
  const bloqueado = ocupado || cargando || !!flujo.error || requiereRevisar
  const controlador = datos?.controlador

  // Verificamos si existe al menos una credencial activa (no revocada y no vencida).
  const tieneCredencial = !!datos?.credenciales.some((clave) => credencialVigente(clave, ahora))
  const invernaderoDesactivado = datos?.invernadero.estado === 'Desactivado'

  // Lista de comprobaciones reales para ayudar al usuario a diagnosticar por qué aún no conecta la placa.
  const requisitos = controlador
    ? [
        {
          etiqueta: `Controlador asociado (${controlador.nombre})`,
          cumplido: true,
        },
        {
          etiqueta: tieneCredencial ? 'Token de conexión vigente disponible' : 'Falta generar un token de conexión vigente',
          cumplido: tieneCredencial,
          accionTexto: 'Crear token',
          onAccion: onIrControlador,
        },
        {
          etiqueta: datos.sensores.length
            ? `${datos.sensores.length} sensor(es) asociado(s)`
            : 'Falta asociar al menos un sensor',
          cumplido: datos.sensores.length > 0,
          accionTexto: 'Asociar sensores',
          onAccion: onIrSensores,
        },
        {
          etiqueta: !invernaderoDesactivado ? 'Invernadero habilitado' : 'El invernadero está desactivado',
          cumplido: !invernaderoDesactivado,
        },
        {
          etiqueta: controlador.activo
            ? 'Comunicaciones habilitadas en el servidor'
            : 'Comunicaciones bloqueadas (habilítalas abajo)',
          cumplido: controlador.activo,
        },
      ]
    : []

  return (
    <MarcoEquipo
      titulo="Conexión del controlador"
      subtitulo="Verifica el estado real de comunicación de la placa, revisa los requisitos y habilita el ESP32."
      pasoActivo="conexion"
      invernaderoNombre={datos?.invernadero.nombre}
      rol={datos?.invernadero.rol}
      estadoInvernadero={datos?.invernadero.estado}
      cargando={cargando}
      ocupado={ocupado}
      error={flujo.error}
      errorOperacion={flujo.errorOperacion}
      aviso={flujo.aviso}
      ocultarActualizar={!!controlador}
      onActualizar={flujo.actualizar}
      onVolver={onVolver}
      onIrControlador={onIrControlador}
      onIrSensores={onIrSensores}
      onIrConexion={() => {}}
    >
      {datos && (
        !controlador ? (
          // Sin controlador asociado no hay datos de conexión que comprobar.
          <Tarjeta como="section" className="space-y-3">
            <Titulo nivel={2} variante="seccion">CONTROLADOR REQUERIDO</Titulo>
            <Texto className="text-sm text-[#64766A]">
              Asocia primero un controlador ESP32 al invernadero y genera su token para poder probar la conexión.
            </Texto>
            <Boton type="button" variante="verde" onClick={onIrControlador}>
              Ir a asociar controlador
            </Boton>
          </Tarjeta>
        ) : (
          <>
            {/* Bloque 1: Diagnóstico y prueba de comunicación real contra el servidor */}
            <Tarjeta como="section" className="space-y-4" aria-labelledby="titulo-diagnostico">
              <Titulo nivel={2} id="titulo-diagnostico" variante="seccion">
                DIAGNÓSTICO DE CONEXIÓN
              </Titulo>

              {/* Resumen directo del estado actual de la placa */}
              <div className="rounded-xl border border-[#D8E1DA] bg-[#F5F8F5] p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">Estado de la placa</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      controlador.conexion === 'Conectado'
                        ? 'bg-[#DCEEE2] text-[#265E3E]'
                        : 'bg-[#ECEFED] text-[#52675A]'
                    }`}
                  >
                    {controlador.conexion}
                  </span>
                </div>
                <Texto className="mt-1 text-xs text-[#64766A]">
                  Última comunicación registrada: {fechaEquipo(controlador.ultimaComunicacion)}
                </Texto>
              </div>

              {/* Lista de verificación previa antes de esperar datos de la placa física */}
              <ul className="space-y-2 text-sm">
                {requisitos.map((item) => (
                  <li key={item.etiqueta} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      {item.cumplido ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2F704B]" aria-hidden="true" />
                      ) : (
                        <CircleAlert className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
                      )}
                      <span>{item.etiqueta}</span>
                    </span>
                    {!item.cumplido && item.onAccion && (
                      <Boton
                        type="button"
                        onClick={item.onAccion}
                        className="shrink-0 text-xs font-semibold text-[#2F704B] underline"
                      >
                        {item.accionTexto}
                      </Boton>
                    )}
                  </li>
                ))}
              </ul>

              {/* Estado individual de conexión reportado por cada sensor asociado */}
              {datos.sensores.length > 0 && (
                <div className="space-y-2 border-t border-[#E6EFE8] pt-3">
                  <Titulo nivel={3} className="text-xs font-semibold uppercase tracking-wide text-[#64766A]">
                    Estado por sensor
                  </Titulo>
                  <ul className="space-y-1.5 text-sm">
                    {datos.sensores.map((sensor) => (
                      <li key={sensor.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#E6EFE8] px-3 py-2">
                        <span>
                          {nombresSensor[sensor.tipo]} <span className="text-xs text-[#64766A]">(ID {sensor.id})</span>
                        </span>
                        <span
                          className={`text-xs font-semibold ${
                            sensor.conexion === 'Conectado' ? 'text-[#2F704B]' : 'text-[#64766A]'
                          }`}
                        >
                          {sensor.conexion}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Boton type="button" variante="verde" disabled={ocupado || cargando} onClick={flujo.actualizar}>
                {cargando ? 'Comprobando…' : 'Comprobar conexión ahora'}
              </Boton>
              <Texto className="text-xs text-[#64766A]">
                Al pulsar "Comprobar conexión ahora", se consulta al servidor si el ESP32 físico ya envió datos con su token.
              </Texto>
            </Tarjeta>

            {/* Bloque 2: Botón para habilitar o bloquear comunicaciones del ESP32 */}
            <Tarjeta>
              <PanelEstadoControlador
                controlador={controlador}
                invernaderoDesactivado={invernaderoDesactivado}
                tieneCredencial={tieneCredencial}
                deshabilitado={bloqueado}
                onCambiar={(activo) =>
                  flujo.ejecutar(
                    () => servicioEquipos.activar(controlador.id, activo),
                    activo
                      ? 'ESP32 habilitado. Conecta la placa y pulsa "Comprobar conexión ahora" para verificar su comunicación.'
                      : 'Comunicaciones del ESP32 bloqueadas.',
                  )
                }
              />
            </Tarjeta>

            {/* Bloque 3: Parámetros exactos (servidor e IDs) para cargar en el firmware del ESP32 */}
            <Tarjeta>
              <GuiaInstalacion controlador={controlador} sensores={datos.sensores} />
            </Tarjeta>
          </>
        )
      )}
    </MarcoEquipo>
  )
}
