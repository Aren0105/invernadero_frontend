import { useEffect, useMemo, useSyncExternalStore } from 'react'
import type { Sensor } from '../../types/equipos'
import { crearMonitoreo } from '../../services/monitoreo'

/** Cierra la concesión al salir, ocultar la página o perder red; volver al primer plano nunca reanuda órdenes. */
export function useMonitoreo(invernaderoId: string, sensor: Sensor) {
  const gestor = useMemo(() => crearMonitoreo(invernaderoId, sensor), [invernaderoId, sensor])
  const estado = useSyncExternalStore(gestor.suscribir, gestor.obtenerEstado)
  useEffect(() => {
    const ocultar = () => { if (document.visibilityState === 'hidden') gestor.detener('Monitoreo finalizado al ocultar esta pantalla. Pulsa Iniciar para retomarlo.') }
    const desconectar = () => gestor.detener('Sin conexión de red. Vuelve a iniciar cuando se restablezca.')
    const salir = () => gestor.detener()
    document.addEventListener('visibilitychange', ocultar)
    window.addEventListener('offline', desconectar)
    window.addEventListener('pagehide', salir)
    return () => {
      document.removeEventListener('visibilitychange', ocultar)
      window.removeEventListener('offline', desconectar)
      window.removeEventListener('pagehide', salir)
      gestor.cerrar()
    }
  }, [gestor])
  return { estado, iniciar: gestor.iniciar, detener: gestor.detener }
}
