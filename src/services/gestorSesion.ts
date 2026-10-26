import { ErrorResultadoRegistro, leerErrorAutenticacion } from './erroresAutenticacion'
import type { CoordinacionSesion, MarcaSesion } from './coordinacionSesion'

/** Perfil público de la cuenta; los permisos se resuelven por invernadero. */
export type UsuarioAutenticado = { id: string; name: string; email: string }
export type EstadoSesion = {
  estado: 'inicializando' | 'autenticada' | 'anonima' | 'error' | 'cerrando' | 'cierre-pendiente'
  usuario: UsuarioAutenticado | null
  venceEn: number | null
  error: string | null
}
type RespaldoAcceso = { token: string; venceEn: number }
type Credenciales = { accessToken: string; tokenType: 'Bearer'; expiresIn: number; user: UsuarioAutenticado }
type Dependencias = {
  enviar: (ruta: string, opciones?: RequestInit) => Promise<Response>
  coordinacion: CoordinacionSesion
  ahora?: () => number
}

/** Rechaza operaciones que pertenecen a una sesión reemplazada o cerrada durante una petición. */
export class ErrorSesionCambiada extends Error {
  constructor() { super('La sesión cambió. Vuelve a intentarlo desde tu cuenta actual.') }
}

/** Comprueba el perfil HTTP sin convertir campos adicionales en permisos globales. */
function perfilValido(dato: unknown): dato is UsuarioAutenticado {
  if (!dato || typeof dato !== 'object') return false
  const usuario = dato as Record<string, unknown>
  return ['id', 'name', 'email'].every((campo) => typeof usuario[campo] === 'string' && (usuario[campo] as string).trim())
}

/** Valida los tokens emitidos y copia únicamente los campos públicos del perfil. */
async function leerCredenciales(respuesta: Response): Promise<Credenciales> {
  const dato = await respuesta.json()
  if (!dato || typeof dato.accessToken !== 'string' || !dato.accessToken.trim() ||
    dato.tokenType !== 'Bearer' || !Number.isSafeInteger(dato.expiresIn) || dato.expiresIn <= 0 ||
    !perfilValido(dato.user)) throw new Error('La API devolvió una respuesta de sesión inesperada.')
  return { accessToken: dato.accessToken, tokenType: 'Bearer', expiresIn: dato.expiresIn, user: { id: dato.user.id, name: dato.user.name, email: dato.user.email } }
}

/** Gestiona los dos tokens: acceso solo en memoria y renovación solo mediante cookie HttpOnly.
 * Coordina login, alta, refresh y logout; invalida respuestas tardías y reintenta un 401 una sola vez.
 */
export function crearGestorSesion({ enviar, coordinacion, ahora = Date.now }: Dependencias) {
  let vista: EstadoSesion = { estado: 'inicializando', usuario: null, venceEn: null, error: null }
  let acceso: string | null = null
  let generacion = 0
  let revision: string | null = null
  let arranque: Promise<void> | undefined
  let renovacion: Promise<void> | undefined
  let cierre: Promise<void> | undefined
  let detenerEscucha: (() => void) | undefined
  const oyentes = new Set<() => void>()

  function publicar(estado: EstadoSesion['estado'], usuario: UsuarioAutenticado | null = null, venceEn: number | null = null, error: string | null = null) {
    vista = { estado, usuario, venceEn, error }
    oyentes.forEach((oyente) => oyente())
  }
  function comprobar(turno: number, comprobarMarca = false) {
    if (turno !== generacion || (comprobarMarca && (coordinacion.leer()?.revision ?? null) !== revision)) {
      throw new ErrorSesionCambiada()
    }
  }
  function marcar(estado: MarcaSesion['estado'], cierrePendiente = false) {
    const marca: MarcaSesion = { revision: crypto.randomUUID(), estado, cierrePendiente }
    coordinacion.escribir(marca)
    revision = marca.revision
  }
  function vaciar(estado: EstadoSesion['estado'], error: string | null = null) {
    acceso = null
    publicar(estado, null, null, error)
  }
  function aceptar(dato: Credenciales) {
    acceso = dato.accessToken
    publicar('autenticada', dato.user, ahora() + dato.expiresIn * 1000)
  }
  function mensaje(error: unknown) {
    return error instanceof Error ? error.message : 'No se pudo comprobar la sesión.'
  }

  /** Revoca por cookie; si no está disponible, admite el acceso vigente como respaldo en memoria.
   * Debe ejecutarse con el bloqueo y nunca envía un acceso conocido como vencido.
   */
  async function revocarCookie(respaldo?: RespaldoAcceso) {
    let respuesta = await enviar('/auth/logout', { method: 'POST', credentials: 'include' })
    if (respuesta.status === 401 && respaldo && respaldo.venceEn > ahora()) {
      respuesta = await enviar('/auth/logout', {
        method: 'POST', credentials: 'include', headers: { Authorization: `Bearer ${respaldo.token}` },
      })
    }
    // Un 401 ya dejó de autorizar la cookie; el controlador también la elimina.
    if (!respuesta.ok && respuesta.status !== 401) throw new Error('No se pudo confirmar el cierre de sesión. Inténtalo nuevamente.')
    marcar('cerrada')
  }

  /** Rota una sola vez el refresh; los errores transitorios requieren un reintento explícito. */
  function renovar(): Promise<void> {
    if (renovacion) return renovacion
    const turno = generacion
    renovacion = coordinacion.exclusiva(async () => {
      comprobar(turno)
      const marca = coordinacion.leer()
      revision = marca?.revision ?? null
      if (marca?.estado === 'cerrada') {
        if (marca.cierrePendiente) {
          vaciar('cerrando')
          await revocarCookie()
        }
        vaciar('anonima')
        return
      }
      const respuesta = await enviar('/auth/refresh', { method: 'POST', credentials: 'include' })
      comprobar(turno, true)
      if (respuesta.status === 401) {
        generacion++
        marcar('cerrada')
        vaciar('anonima', 'Tu sesión terminó. Inicia sesión nuevamente.')
        return
      }
      if (!respuesta.ok) throw new Error(respuesta.status === 429
        ? 'Se realizaron demasiadas renovaciones. Espera un minuto y vuelve a intentar.'
        : 'No se pudo renovar la sesión. Inténtalo nuevamente.')
      const datos = await leerCredenciales(respuesta)
      comprobar(turno, true)
      if (!marca) marcar('activa')
      aceptar(datos)
    }).catch((error) => {
      if (turno === generacion) {
        acceso = null
        let pendiente = false
        try { pendiente = coordinacion.leer()?.cierrePendiente ?? false } catch { /* Se conserva el error de almacenamiento original. */ }
        publicar(pendiente ? 'cierre-pendiente' : 'error', null, null, mensaje(error))
      }
      throw error
    }).finally(() => { renovacion = undefined })
    return renovacion
  }

  /** Se llama una sola vez por instancia, también bajo el montaje doble de StrictMode. */
  function restaurar(): Promise<void> {
    arranque ??= renovar()
    return arranque
  }

  /** Conserva sincronizados los estados de pestañas sin transmitir tokens por almacenamiento o mensajes. */
  async function sincronizar() {
    let turno = generacion
    try {
      const marca = coordinacion.leer()
      if (marca?.revision === revision) return
      revision = marca?.revision ?? null
      turno = ++generacion
      vaciar(marca?.cierrePendiente ? 'cierre-pendiente' : marca?.estado === 'cerrada' ? 'anonima' : 'inicializando')
      if (marca?.estado === 'activa' || !marca) {
        await renovacion?.catch(() => {})
        if (turno !== generacion) return
        await renovar()
      }
    } catch (error) {
      if (turno === generacion) vaciar('error', mensaje(error))
    }
  }

  /** Abre una nueva sesión tras login o alta y verifica /auth/me antes de exponer la cuenta. */
  async function autenticar(ruta: '/auth/login' | '/auth/register', cuerpo: Record<string, string>) {
    const turno = ++generacion
    const revisionInicio = coordinacion.leer()?.revision ?? null
    return coordinacion.exclusiva(async () => {
      comprobar(turno)
      if ((coordinacion.leer()?.revision ?? null) !== revisionInicio) throw new ErrorSesionCambiada()
      const marca = coordinacion.leer()
      if (marca?.cierrePendiente) await revocarCookie()
      marcar('cerrada', true)
      acceso = null
      let tokenCreado: RespaldoAcceso | undefined
      let estadoRespuesta: number | undefined
      let cuentaCreada = false
      try {
        const respuesta = await enviar(ruta, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
        })
        estadoRespuesta = respuesta.status
        cuentaCreada = ruta === '/auth/register' && respuesta.ok
        comprobar(turno, true)
        if (!respuesta.ok) throw await leerErrorAutenticacion(respuesta)
        const datos = await leerCredenciales(respuesta)
        tokenCreado = { token: datos.accessToken, venceEn: ahora() + datos.expiresIn * 1000 }
        const perfil = await enviar('/auth/me', { credentials: 'omit', headers: { Authorization: `Bearer ${datos.accessToken}` } })
        comprobar(turno, true)
        if (!perfil.ok) throw new Error('No se pudo validar la sesión. Vuelve a iniciar sesión.')
        const usuario = await perfil.json()
        if (!perfilValido(usuario) || usuario.id !== datos.user.id) throw new Error('La API devolvió un perfil de usuario inesperado.')
        comprobar(turno, true)
        marcar('activa')
        aceptar({ ...datos, user: { id: usuario.id, name: usuario.name, email: usuario.email } })
      } catch (error) {
        // Un rechazo 4xx no emitió cookie; evita que un logout innecesario oculte el error de validación.
        // Ante una respuesta perdida o un 5xx, el alta o la cookie pudieron haberse creado parcialmente.
        try {
          if (estadoRespuesta && estadoRespuesta >= 400 && estadoRespuesta < 500) marcar('cerrada')
          else await revocarCookie(tokenCreado)
        } catch { /* La marca persistida mantiene bloqueada la restauración hasta cerrar. */ }
        if (turno === generacion) {
          const pendiente = coordinacion.leer()?.cierrePendiente
          const aviso = cuentaCreada
            ? 'Tu cuenta ya se creó. Reintenta el cierre pendiente y después inicia sesión con tus datos.'
            : 'No se pudo confirmar el cierre de la sesión anterior. Reintenta el cierre.'
          vaciar(pendiente ? 'cierre-pendiente' : 'anonima', pendiente ? aviso : null)
        }
        if (ruta === '/auth/register') {
          if (cuentaCreada) throw new ErrorResultadoRegistro('creada', error)
          if (estadoRespuesta === undefined || estadoRespuesta >= 500) throw new ErrorResultadoRegistro('incierto', error)
        }
        throw error
      }
    })
  }

  /** Bloquea inmediatamente el acceso local y espera la revocación; los fallos quedan pendientes de reintento. */
  function cerrarSesion(): Promise<void> {
    if (cierre) return cierre
    const respaldo: RespaldoAcceso | undefined = acceso && vista.venceEn ? { token: acceso, venceEn: vista.venceEn } : undefined
    const revisionAnterior = revision
    generacion++
    vaciar('cerrando')
    cierre = coordinacion.exclusiva(async () => {
      const mismaSesion = coordinacion.leer()?.revision === revisionAnterior
      marcar('cerrada', true)
      await revocarCookie(mismaSesion ? respaldo : undefined)
      vaciar('anonima')
    }).catch((error) => {
      // Incluso si no se obtuvo el bloqueo, se conserva la intención de cierre para la próxima carga.
      try { marcar('cerrada', true) } catch { /* Si el almacenamiento falla, la recuperación también se bloqueará. */ }
      vaciar('cierre-pendiente', mensaje(error))
      throw error
    }).finally(() => { cierre = undefined })
    return cierre
  }

  /** Consulta protegida: renueva antes del vencimiento y solo reenvía un 401 bajo la misma cuenta.
   * Acepta cuerpos repetibles de fetch; no permite ReadableStream porque no puede reenviarse con seguridad.
   */
  async function peticionApi(ruta: string, opciones: RequestInit = {}): Promise<Response> {
    opciones.signal?.throwIfAborted()
    if (vista.estado === 'inicializando') await restaurar()
    const turno = generacion
    if (opciones.body instanceof ReadableStream) throw new Error('Esta petición requiere un cuerpo que pueda reenviarse.')
    const cuenta = vista.usuario?.id
    if (vista.estado !== 'autenticada' || !cuenta) throw new Error('Inicia sesión para continuar.')
    if ((vista.venceEn ?? 0) <= ahora()) await renovar()
    comprobar(turno, true)
    if (vista.usuario?.id !== cuenta || !acceso) throw new ErrorSesionCambiada()
    const usado = acceso
    const solicitar = (token: string) => {
      const headers = new Headers(opciones.headers)
      headers.set('Authorization', `Bearer ${token}`)
      return enviar(ruta, { ...opciones, credentials: 'omit', headers })
    }
    let respuesta = await solicitar(usado)
    comprobar(turno, true)
    if (respuesta.status === 401) {
      if (opciones.signal?.aborted) throw opciones.signal.reason
      // Otra petición pudo haber renovado mientras esta respuesta viajaba.
      if (acceso === usado) await renovar()
      comprobar(turno, true)
      if (vista.usuario?.id !== cuenta || !acceso) throw new Error('Tu sesión terminó. Inicia sesión nuevamente.')
      respuesta = await solicitar(acceso)
      comprobar(turno, true)
      if (respuesta.status === 401) {
        generacion++
        vaciar('anonima', 'Tu sesión terminó. Inicia sesión nuevamente.')
        // La cookie se revoca sin una tercera petición al recurso ni otra renovación.
        await cerrarSesion()
      }
    }
    return respuesta
  }

  return {
    obtenerEstado: () => vista,
    suscribir(oyente: () => void) { oyentes.add(oyente); return () => { oyentes.delete(oyente) } },
    conectar() {
      detenerEscucha ??= coordinacion.escuchar(() => { void sincronizar() })
      return () => { detenerEscucha?.(); detenerEscucha = undefined }
    },
    restaurar,
    renovar,
    cerrarSesion,
    peticionApi,
    iniciarSesion: (email: string, password: string) => autenticar('/auth/login', { email: email.trim().toLowerCase(), password }),
    registrarUsuario: (name: string, email: string, password: string) => autenticar('/auth/register', { name: name.trim(), email: email.trim().toLowerCase(), password }),
  }
}
