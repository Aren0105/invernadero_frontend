import { useCallback, useEffect, useState } from 'react'

/** Consulta cancelable reutilizable; conserva los datos al actualizar y descarta respuestas de visitas anteriores.
 * La función consultar debe ser estable entre renders (por ejemplo, mediante useCallback).
 */
export function useConsulta<T>(consultar: (signal: AbortSignal) => Promise<T>) {
  const [datos, setDatos] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  const [revision, setRevision] = useState(0)
  const recargar = useCallback(() => { setCargando(true); setError(''); setRevision((actual) => actual + 1) }, [])
  useEffect(() => {
    const controlador = new AbortController()
    void consultar(controlador.signal).then((nuevos) => {
      if (!controlador.signal.aborted) { setDatos(nuevos); setError(''); setCargando(false) }
    }).catch((fallo: unknown) => {
      if (!controlador.signal.aborted) { setError(fallo instanceof Error ? fallo.message : 'No se pudo cargar la información.'); setCargando(false) }
    })
    return () => controlador.abort()
  }, [consultar, revision])
  return { datos, error, cargando, recargar }
}
