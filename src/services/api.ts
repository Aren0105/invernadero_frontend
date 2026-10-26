import { enviarHttp, ambitoApi } from './http'
import { crearCoordinacionSesion } from './coordinacionSesion'
import { crearGestorSesion } from './gestorSesion'

export type { UsuarioAutenticado, EstadoSesion } from './gestorSesion'

/** Única instancia compartida por las rutas, los formularios y las consultas protegidas. */
export const gestorSesion = crearGestorSesion({ enviar: enviarHttp, coordinacion: crearCoordinacionSesion(ambitoApi) })
export const iniciarSesion = gestorSesion.iniciarSesion
export const registrarUsuario = gestorSesion.registrarUsuario
export const peticionApi = gestorSesion.peticionApi
export const cerrarSesion = gestorSesion.cerrarSesion
