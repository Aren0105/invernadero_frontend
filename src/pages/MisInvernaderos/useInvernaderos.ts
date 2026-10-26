import { useCallback, useEffect, useState } from 'react'
import { servicioInvernaderos } from '../../services/invernaderos'
import type { Invernadero } from '../../types/invernaderos'

type Carga = { estado: 'cargando' | 'listo' | 'error'; registros: Invernadero[]; error: string | null }

/** Carga al entrar y al recuperar el foco; cancela respuestas antiguas y ofrece reintento manual. */
export function useInvernaderos() {
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando', registros: [], error: null })
  const [revision, setRevision] = useState(0)
  const recargar = useCallback(() => {
    setCarga({ estado: 'cargando', registros: [], error: null })
    setRevision((actual) => actual + 1)
  }, [])

  useEffect(() => {
    const controlador = new AbortController()
    // El resultado solo se publica si sigue perteneciendo a esta visita de la página.
    void servicioInvernaderos.listar(controlador.signal).then((registros) => {
      if (!controlador.signal.aborted) setCarga({ estado: 'listo', registros, error: null })
    }).catch((error: unknown) => {
      if (!controlador.signal.aborted) setCarga({ estado: 'error', registros: [], error: error instanceof Error ? error.message : 'No se pudieron cargar los invernaderos.' })
    })
    return () => controlador.abort()
  }, [revision])

  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') recargar()
    }
    window.addEventListener('focus', alVolver)
    window.addEventListener('online', alVolver)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      window.removeEventListener('focus', alVolver)
      window.removeEventListener('online', alVolver)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [recargar])

  return { ...carga, recargar }
}
