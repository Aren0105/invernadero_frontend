export type TransporteApi = (ruta: string, opciones?: RequestInit) => Promise<Response>

/** Distingue un rechazo HTTP de una escritura cuyo resultado no pudo recuperarse. */
export class ErrorOperacion extends Error {
  readonly resultado: 'rechazada' | 'incierta' | 'confirmada'
  readonly status: number | null

  constructor(mensaje: string, resultado: ErrorOperacion['resultado'], status: number | null = null, causa?: unknown) {
    super(mensaje, { cause: causa })
    this.resultado = resultado
    this.status = status
  }
}

/** Comprueba objetos JSON sin permitir que un arreglo o null se interprete como un recurso. */
export function objeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('La respuesta del servidor no es válida.')
  return valor as Record<string, unknown>
}

/** Envía una operación una sola vez y valida su respuesta; nunca reintenta una escritura.
 * @param mensajesPublicos Lista opcional de mensajes de rechazo conocidos que pueden mostrarse.
 * @param interpretar Proyecta únicamente los datos públicos esperados.
 * @throws ErrorOperacion si el servidor rechaza la operación o no puede determinarse su resultado.
 */
export async function solicitarApi<T>(enviar: TransporteApi, ruta: string, opciones: RequestInit, interpretar: (valor: unknown) => T, mensajesPublicos: readonly string[] = []): Promise<T> {
  const escritura = opciones.method != null && opciones.method !== 'GET'
  let respuesta: Response
  try {
    respuesta = await enviar(ruta, opciones)
  } catch (error) {
    if (!escritura) throw error
    throw new ErrorOperacion('No se pudo confirmar la operación. Actualiza los datos antes de intentarlo otra vez.', 'incierta', null, error)
  }
  if (!respuesta.ok) {
    const mensajes: Record<number, string> = {
      400: 'Revisa los datos enviados. El servidor rechazó la operación.',
      401: 'Tu sesión no está disponible. Vuelve a iniciar sesión.',
      403: 'No tienes permiso para acceder a este recurso.',
      404: 'El recurso no está disponible.',
      409: 'El registro ya existe o fue modificado. Actualiza los datos.',
      429: 'Se hicieron demasiadas solicitudes. Espera un momento.',
    }
    // Solo expone mensajes públicos conocidos por el llamador, nunca errores internos arbitrarios.
    let mensajePublico: string | undefined
    if (mensajesPublicos.length) {
      try {
        const cuerpo = objeto(await respuesta.json())
        if (typeof cuerpo.message === 'string' && mensajesPublicos.includes(cuerpo.message)) mensajePublico = cuerpo.message
      } catch { /* Conserva el mensaje genérico si el error no tiene un contrato reconocido. */ }
    }
    throw new ErrorOperacion(mensajePublico || mensajes[respuesta.status] || 'El servidor no pudo completar la solicitud.',
      escritura && respuesta.status >= 500 ? 'incierta' : 'rechazada', respuesta.status)
  }
  try {
    return interpretar(respuesta.status === 204 ? null : await respuesta.json())
  } catch (error) {
    if (escritura) throw new ErrorOperacion('El servidor confirmó la operación, pero no pudimos recuperar sus datos. Actualiza la información antes de repetirla.', 'confirmada', respuesta.status, error)
    throw new Error('La respuesta del servidor no es válida.', { cause: error })
  }
}

/** Genera exclusivamente el cuerpo JSON solicitado, sin datos de sesión ni propietarios enviados por el formulario. */
export function cuerpoJson(method: string, datos: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) }
}
