import { useCallback, useRef, useState } from 'react'
import { useConsulta } from '../../hooks/useConsulta'
import { servicioInvernaderos } from '../../services/invernaderos'
import { servicioEquipos } from '../../services/equipos'
import { ErrorOperacion } from '../../services/contratoApi'
import type { CredencialEmitida } from '../../types/equipos'

/**
 * Hook compartido por las 3 pantallas de equipo (Controlador, Sensores y Conexión).
 * Coordina lecturas cancelables y escrituras seguras: nunca lanza dos mutaciones a la vez
 * ni reintenta automáticamente una emisión de token o registro.
 */
export function useConfiguracionEquipo(id: string) {
  // Función de carga que consulta en secuencia/paralelo el estado real en el backend.
  const consulta = useCallback(async (signal: AbortSignal) => {
    // 1. Verificamos el invernadero y el rol actual del usuario (ADMIN u OPERATOR).
    const invernadero = await servicioInvernaderos.consultar(id, signal)
    // 2. Solo un ADMIN puede consultar los recursos administrativos del controlador.
    const controlador = invernadero.rol === 'ADMIN' ? await servicioEquipos.consultar(id, signal) : null
    // 3. Si existe controlador, cargamos en paralelo sus sensores y sus tokens (sin secretos).
    const [sensores, credenciales] = controlador
      ? await Promise.all([
          servicioEquipos.sensores(controlador.id, signal),
          servicioEquipos.credenciales(controlador.id, signal),
        ])
      : [[], []]
    return { invernadero, controlador, sensores, credenciales }
  }, [id])

  // Hook genérico que ejecuta `consulta`, maneja abortos al salir y expone recargar().
  const carga = useConsulta(consulta)

  // Estados de interfaz para operaciones de escritura (POST / PATCH / DELETE).
  const [ocupado, setOcupado] = useState(false)
  const [errorOperacion, setErrorOperacion] = useState('')
  // Se activa cuando una escritura tuvo resultado incierto (ej. corte de red) y exige recargar antes de volver a escribir.
  const [requiereRevisar, setRequiereRevisar] = useState(false)
  const [aviso, setAviso] = useState('')
  // Guarda temporalmente en memoria el token recién generado hasta que el usuario confirme que lo copió.
  const [secreto, setSecreto] = useState<CredencialEmitida | null>(null)
  // Referencia síncrona para evitar dobles clics antes de que React re-renderice `ocupado`.
  const operando = useRef(false)

  /** Limpia errores pendientes de escritura y vuelve a consultar todo al servidor. */
  const actualizar = () => {
    if (operando.current) return
    setRequiereRevisar(false)
    setErrorOperacion('')
    carga.recargar()
  }

  /**
   * Ejecuta una operación de escritura (registrar controlador, agregar sensor, emitir token, activar, etc.)
   * garantizando exclusividad mutua y recargando los datos reales tras el éxito.
   */
  async function ejecutar<T>(operacion: () => Promise<T>, mensaje: string, alCompletar?: (valor: T) => void): Promise<boolean> {
    if (
      operando.current ||
      carga.cargando ||
      carga.error ||
      requiereRevisar ||
      secreto ||
      carga.datos?.invernadero.rol !== 'ADMIN'
    ) {
      return false
    }
    operando.current = true
    setOcupado(true)
    setErrorOperacion('')
    setAviso('')
    try {
      const resultado = await operacion()
      // Callback opcional (por ejemplo, guardar el secreto efímero cuando se emite un token).
      alCompletar?.(resultado)
      setAviso(mensaje)
      // Tras confirmar la escritura, refrescamos los datos desde el servidor.
      carga.recargar()
      return true
    } catch (error) {
      setErrorOperacion(error instanceof Error ? error.message : 'No se pudo completar la operación.')
      // Si el servidor no confirmó rechazo claro (ej. 5xx o red caída), bloqueamos nuevas escrituras hasta revisar.
      if (error instanceof ErrorOperacion && error.resultado !== 'rechazada') setRequiereRevisar(true)
      // Si hubo conflicto (409) o pérdida de permisos (403), recargamos el estado actual.
      if (error instanceof ErrorOperacion && (error.status === 409 || error.status === 403)) carga.recargar()
      return false
    } finally {
      operando.current = false
      setOcupado(false)
    }
  }

  return { ...carga, actualizar, ocupado, ejecutar, aviso, errorOperacion, requiereRevisar, secreto, setSecreto }
}
