import { useCallback, useRef, useState } from 'react'
import { useConsulta } from '../../hooks/useConsulta'
import { servicioInvernaderos } from '../../services/invernaderos'
import { servicioEquipos } from '../../services/equipos'
import { ErrorOperacion } from '../../services/contratoApi'
import type { CredencialEmitida } from '../../types/equipos'

/** Coordina lecturas y escrituras del equipo; nunca lanza dos mutaciones ni reintenta una emisión automáticamente. */
export function useConfiguracionEquipo(id: string) {
  const consulta = useCallback(async (signal: AbortSignal) => {
    const invernadero = await servicioInvernaderos.consultar(id, signal)
    const controlador = invernadero.rol === 'ADMIN' ? await servicioEquipos.consultar(id, signal) : null
    const [sensores, credenciales] = controlador ? await Promise.all([
      servicioEquipos.sensores(controlador.id, signal), servicioEquipos.credenciales(controlador.id, signal),
    ]) : [[], []]
    return { invernadero, controlador, sensores, credenciales }
  }, [id])
  const carga = useConsulta(consulta)
  const [ocupado, setOcupado] = useState(false)
  const [errorOperacion, setErrorOperacion] = useState('')
  const [requiereRevisar, setRequiereRevisar] = useState(false)
  const [aviso, setAviso] = useState('')
  const [secreto, setSecreto] = useState<CredencialEmitida | null>(null)
  const operando = useRef(false)

  const actualizar = () => {
    if (operando.current) return
    setRequiereRevisar(false)
    setErrorOperacion('')
    carga.recargar()
  }

  async function ejecutar<T>(operacion: () => Promise<T>, mensaje: string, alCompletar?: (valor: T) => void): Promise<boolean> {
    if (operando.current || carga.cargando || carga.error || requiereRevisar || secreto || carga.datos?.invernadero.rol !== 'ADMIN') return false
    operando.current = true
    setOcupado(true)
    setErrorOperacion('')
    setAviso('')
    try {
      const resultado = await operacion()
      alCompletar?.(resultado)
      setAviso(mensaje)
      carga.recargar()
      return true
    } catch (error) {
      setErrorOperacion(error instanceof Error ? error.message : 'No se pudo completar la operación.')
      if (error instanceof ErrorOperacion && error.resultado !== 'rechazada') setRequiereRevisar(true)
      // Se revisan registros concurrentes y permisos que pudieron cambiar en otra pestaña.
      if (error instanceof ErrorOperacion && (error.status === 409 || error.status === 403)) carga.recargar()
      return false
    } finally { operando.current = false; setOcupado(false) }
  }

  return { ...carga, actualizar, ocupado, ejecutar, aviso, errorOperacion, requiereRevisar, secreto, setSecreto }
}
