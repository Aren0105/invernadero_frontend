import isEmail from 'validator/lib/isEmail'
import isLength from 'validator/lib/isLength'

/** Valores del formulario; la confirmación se utiliza localmente y nunca se envía al backend. */
export type DatosRegistroUsuario = { nombre: string; correo: string; password: string; confirmacion: string }
export type CampoRegistroUsuario = keyof DatosRegistroUsuario
export type ErroresRegistroUsuario = Partial<Record<CampoRegistroUsuario, string>>

/** Mensajes de las reglas de RegisterDto/LoginDto del servidor, expresados en español. */
export const mensajesAutenticacion = {
  nombre: 'El nombre debe tener entre 2 y 80 caracteres.',
  correo: 'Ingresa un correo electrónico válido de hasta 254 caracteres.',
  password: 'La contraseña debe tener entre 8 y 128 caracteres.',
  confirmacion: 'Las contraseñas no coinciden.',
}

/** Valida con validator.js, la misma dependencia que utiliza class-validator en el backend.
 * Recorta nombre y correo para validarlos; conserva exactamente ambas contraseñas, incluidos los espacios.
 * @returns Errores por campo. No modifica los valores recibidos ni realiza peticiones.
 */
export function validarRegistroUsuario(datos: DatosRegistroUsuario): ErroresRegistroUsuario {
  const errores: ErroresRegistroUsuario = {}
  const nombre = datos.nombre.trim()
  if (!nombre) errores.nombre = 'Este campo es obligatorio.'
  else if (!isLength(nombre, { min: 2, max: 80 })) errores.nombre = mensajesAutenticacion.nombre
  Object.assign(errores, validarCredenciales(datos))
  if (!datos.confirmacion) errores.confirmacion = 'Este campo es obligatorio.'
  else if (datos.password !== datos.confirmacion) errores.confirmacion = mensajesAutenticacion.confirmacion
  return errores
}

/** Reproduce LoginDto para que una contraseña aceptada al registrarse también pueda usarse al acceder. */
export function validarCredenciales(datos: Pick<DatosRegistroUsuario, 'correo' | 'password'>): Pick<ErroresRegistroUsuario, 'correo' | 'password'> {
  const errores: Pick<ErroresRegistroUsuario, 'correo' | 'password'> = {}
  const correo = datos.correo.trim().toLowerCase()
  if (!correo) errores.correo = 'Este campo es obligatorio.'
  else if (!isEmail(correo) || !isLength(correo, { max: 254 })) errores.correo = mensajesAutenticacion.correo
  if (!datos.password) errores.password = 'Este campo es obligatorio.'
  else if (!isLength(datos.password, { min: 8, max: 128 })) errores.password = mensajesAutenticacion.password
  return errores
}
