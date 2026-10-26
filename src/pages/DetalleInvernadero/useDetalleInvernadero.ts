import { useCallback } from 'react'
import { useConsulta } from '../../hooks/useConsulta'
import { servicioInvernaderos } from '../../services/invernaderos'
import { servicioEquipos } from '../../services/equipos'

/** Consulta los datos del invernadero y, para ADMIN, el resumen del equipo sin exponer credenciales. */
export function useDetalleInvernadero(id: string) {
  const consultar = useCallback(async (signal: AbortSignal) => {
    const invernadero = await servicioInvernaderos.consultar(id, signal)
    try {
      const equipo = invernadero.rol === 'ADMIN' ? await servicioEquipos.consultar(id, signal) : null
      return { invernadero, equipo, errorEquipo: '' }
    } catch (error) {
      if (signal.aborted) throw error
      return { invernadero, equipo: null, errorEquipo: error instanceof Error ? error.message : 'No se pudo consultar el equipo.' }
    }
  }, [id])
  return useConsulta(consultar)
}
