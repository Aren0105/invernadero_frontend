export type CampoCredenciales = 'name' | 'email' | 'password'

/** Rechazo HTTP conocido; expone campos del contrato, sin incluir valores ni mensajes internos del servidor. */
export class ErrorValidacionAutenticacion extends Error {
  readonly campos: CampoCredenciales[]
  readonly status: number
  constructor(mensaje: string, status: number, campos: CampoCredenciales[] = []) {
    super(mensaje)
    this.status = status
    this.campos = campos
  }
}

/** Distingue una cuenta ya creada de un registro cuyo resultado no pudo confirmarse.
 * La pantalla debe ofrecer iniciar sesión en vez de repetir automáticamente el alta.
 */
export class ErrorResultadoRegistro extends Error {
  readonly resultado: 'creada' | 'incierto'
  constructor(resultado: 'creada' | 'incierto', causa: unknown) {
    super(resultado === 'creada'
      ? 'Tu cuenta se creó, pero no pudimos completar el inicio de sesión. Ingresa con el correo y la contraseña que registraste.'
      : 'No pudimos confirmar si se creó tu cuenta. Intenta iniciar sesión con tus datos antes de volver a registrarte.', { cause: causa })
    this.resultado = resultado
  }
}

/** Traduce los códigos del contrato y reconoce solo los nombres de campo del DTO de NestJS.
 * Un cuerpo vacío, HTML o JSON inesperado conserva el mensaje general en español.
 */
export async function leerErrorAutenticacion(respuesta: Response): Promise<ErrorValidacionAutenticacion> {
  const status = respuesta.status
  if (status === 401) return new ErrorValidacionAutenticacion('Correo y contraseña incorrectos', status)
  if (status === 403) return new ErrorValidacionAutenticacion('Este sitio no está autorizado para acceder. Contacta al administrador.', status)
  if (status === 409) return new ErrorValidacionAutenticacion('Ya existe una cuenta registrada con ese correo.', status, ['email'])
  if (status === 429) return new ErrorValidacionAutenticacion('Demasiados intentos. Espera un minuto antes de volver a intentar.', status)
  if (status === 400 || status === 422) {
    const campos: CampoCredenciales[] = []
    try {
      const dato = await respuesta.json()
      const mensajes: unknown[] = Array.isArray(dato?.message) ? dato.message : [dato?.message]
      for (const campo of ['name', 'email', 'password'] as const) {
        if (mensajes.some((mensaje) => typeof mensaje === 'string' && mensaje.startsWith(`${campo} `))) campos.push(campo)
      }
    } catch { /* La respuesta no siempre contiene JSON; se mantiene el mensaje seguro. */ }
    return new ErrorValidacionAutenticacion('Revisa los datos ingresados e inténtalo nuevamente.', status, campos)
  }
  return new ErrorValidacionAutenticacion('El servidor no pudo completar el acceso. Inténtalo más tarde.', status)
}
