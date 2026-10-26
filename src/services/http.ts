const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/** Error de transporte distinguible de una respuesta HTTP rechazada por el servidor. */
export class ErrorConexion extends Error {}

/** Envía una petición al backend con timeout y respeta la cancelación del consumidor.
 * Nunca reintenta operaciones automáticamente ni permite enviar tokens a otra URL.
 */
export async function enviarHttp(ruta: string, opciones: RequestInit = {}): Promise<Response> {
  if (!baseUrl) throw new Error('Falta configurar VITE_API_URL para este entorno.')
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta.includes('://')) {
    throw new Error('La ruta de la API debe ser relativa al servidor configurado.')
  }
  const timeout = AbortSignal.timeout(15000)
  const signal = opciones.signal ? AbortSignal.any([opciones.signal, timeout]) : timeout
  try {
    return await fetch(`${baseUrl}${ruta}`, { ...opciones, cache: 'no-store', signal, redirect: 'error' })
  } catch (error) {
    if (opciones.signal?.aborted) throw error
    throw new ErrorConexion('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo nuevamente.')
  }
}

export const ambitoApi = baseUrl
