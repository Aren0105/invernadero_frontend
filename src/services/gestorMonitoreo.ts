import type { Sensor } from '../types/equipos'
import { leerEstadoRemoto, leerLecturaViva, motivoFinalizacion, type EstadoMonitoreo, type FaseMonitoreo } from '../types/monitoreo'

/** Puerto sustituible para probar carreras y fallos sin conexiones ni credenciales reales. */
export type CanalMonitoreo = {
  conectado: () => boolean
  escuchar: (evento: string, oyente: (...datos: unknown[]) => void) => void
  enviar: (evento: string, cuerpo: { sensorId: string; intervalMs?: number }, respuesta?: (dato: unknown) => void) => void
  conectar: () => void
  cerrar: () => void
}
export type AccesoCanal = { token: string; venceEn: number; vigente: () => boolean }
type Dependencias = {
  sensor: Sensor; invernaderoId: string
  autenticar: (signal: AbortSignal) => Promise<AccesoCanal>
  crearCanal: (token: string) => CanalMonitoreo
  suscribirSesion: (oyente: () => void) => () => void
  ahora?: () => number
  programar?: (accion: () => void, ms: number) => () => void
}

/** Sesión explícita de un sensor: no reconecta, reproduce órdenes ni conserva tokens en su estado público. */
export function crearGestorMonitoreo({ sensor, invernaderoId, autenticar, crearCanal, suscribirSesion, ahora = Date.now,
  programar = (accion, ms) => { const id = setTimeout(accion, ms); return () => clearTimeout(id) },
}: Dependencias) {
  let vista: EstadoMonitoreo = { fase: 'listo', mensaje: 'Pulsa Iniciar para solicitar lecturas al equipo.', lecturas: [], intervaloMs: null, venceEn: null, recibidaEn: null }
  const oyentes = new Set<() => void>()
  let generacion = 0
  let canal: CanalMonitoreo | undefined
  let aborto: AbortController | undefined
  let desuscribir: (() => void) | undefined
  const temporizadores = new Set<() => void>()
  let acceso: AccesoCanal | undefined
  let solicitado = false
  let solicitudActual: string | undefined
  let secuencia = -1
  let recibidaLocal: number | undefined
  let activoDesde: number | undefined
  let recibidoServidor = -Infinity
  const retiradas = new Set<string>()
  const identificadores = new Set<string>()

  function publicar(cambio: Partial<EstadoMonitoreo>) { vista = { ...vista, ...cambio }; oyentes.forEach((oyente) => oyente()) }
  function despues(ms: number, accion: () => void) {
    const detener = () => { cancelar(); temporizadores.delete(detener) }
    const cancelar = programar(() => { temporizadores.delete(detener); accion() }, ms)
    temporizadores.add(detener)
    return detener
  }
  function limpiar(notificar: boolean) {
    generacion++
    aborto?.abort()
    desuscribir?.(); desuscribir = undefined
    temporizadores.forEach((cancelar) => cancelar()); temporizadores.clear()
    const anterior = canal
    canal = undefined
    if (notificar && solicitado && anterior?.conectado()) {
      try { anterior.enviar('monitoring.stop', { sensorId: sensor.id }) } catch { /* El cierre y la concesión también liberan la suscripción. */ }
    }
    anterior?.cerrar()
    acceso = undefined
    solicitado = false
  }
  function finalizar(fase: FaseMonitoreo, mensaje: string, notificar = false) {
    limpiar(notificar)
    publicar({ fase, mensaje, venceEn: null })
  }
  function autorizado() {
    if (!acceso?.vigente() || acceso.venceEn <= ahora()) {
      finalizar('detenido', 'La sesión cambió o se renovó. Vuelve a iniciar el monitoreo.', true)
      return false
    }
    return true
  }
  function estadoRemoto(valor: unknown) {
    const estado = leerEstadoRemoto(valor, sensor.id)
    if (!estado) return
    if (estado.state === 'stopped') { finalizar('detenido', motivoFinalizacion(estado.reason)); return }
    if (estado.state === 'active' && activoDesde === undefined) activoDesde = ahora()
    publicar({ fase: estado.state === 'active' || vista.fase === 'activo' ? 'activo' : 'solicitando',
      mensaje: estado.state === 'active' ? 'Equipo confirmado. Se muestran las lecturas recibidas.' : vista.fase === 'activo' ? vista.mensaje : 'Esperando la confirmación del ESP32…',
      intervaloMs: estado.intervalMs ?? vista.intervaloMs, venceEn: estado.expiresAt! })
  }
  function solicitar(evento: string, cuerpo: { sensorId: string; intervalMs?: number }, turno: number) {
    if (turno !== generacion || !canal?.conectado() || !autorizado()) return
    const cancelar = despues(8000, () => { if (turno === generacion) finalizar('error', 'El servidor no confirmó la solicitud. Vuelve a iniciar.', true) })
    try { canal.enviar(evento, cuerpo, (respuesta) => {
      cancelar()
      if (turno !== generacion || !autorizado()) return
      try {
        if (!respuesta || typeof respuesta !== 'object') throw new Error('La confirmación del servidor no es válida.')
        const resultado = respuesta as { ok?: unknown; data?: unknown; error?: { status?: number } }
        if (resultado.ok !== true) {
          const mensajes: Record<number, string> = { 401: 'Tu sesión no autoriza el canal. Vuelve a iniciar sesión.', 403: 'No tienes permiso para monitorear este sensor.', 503: 'El ESP32 no está conectado o sus comunicaciones están bloqueadas.', 429: 'Se hicieron demasiadas solicitudes. Espera antes de volver a iniciar.' }
          finalizar('error', mensajes[resultado.error?.status ?? 0] ?? 'El servidor rechazó la solicitud de monitoreo.', true)
          return
        }
        estadoRemoto(resultado.data)
      } catch (error) { finalizar('error', error instanceof Error ? error.message : 'Respuesta de monitoreo inválida.', true) }
    }) } catch { cancelar(); finalizar('error', 'No se pudo enviar la solicitud. Vuelve a iniciar.', true) }
  }

  /** Inicia una única conexión nueva por acción humana; nunca reutiliza una instancia desconectada. */
  async function iniciar(intervaloMs = 1000) {
    if (['conectando', 'solicitando', 'activo'].includes(vista.fase)) return
    if (!Number.isInteger(intervaloMs) || intervaloMs < 1000 || intervaloMs > 10000) { publicar({ fase: 'error', mensaje: 'Selecciona un intervalo entre 1 y 10 segundos.' }); return }
    limpiar(false)
    const turno = generacion
    aborto = new AbortController()
    retiradas.clear(); identificadores.clear(); solicitudActual = undefined; secuencia = -1; recibidaLocal = undefined; activoDesde = undefined; recibidoServidor = -Infinity
    publicar({ fase: 'conectando', mensaje: 'Abriendo el canal de monitoreo…', lecturas: [], intervaloMs: null, venceEn: null, recibidaEn: null })
    try {
      const autorizadoParaCanal = await autenticar(aborto.signal)
      if (turno !== generacion) return
      acceso = autorizadoParaCanal
      if (!autorizado()) return
      canal = crearCanal(acceso.token)
      desuscribir = suscribirSesion(() => { if (turno === generacion) autorizado() })
      canal.escuchar('connect', () => {
        if (turno !== generacion || solicitado || !autorizado()) return
        solicitado = true
        publicar({ fase: 'solicitando', mensaje: 'Solicitando el sensor al ESP32…' })
        solicitar('monitoring.start', { sensorId: sensor.id, intervalMs: intervaloMs }, turno)
      })
      canal.escuchar('connect_error', () => { if (turno === generacion) finalizar('error', 'No se pudo abrir el canal. Comprueba conexión, sesión y disponibilidad del servidor.') })
      canal.escuchar('disconnect', () => { if (turno === generacion) finalizar('desconectado', 'Se perdió la conexión. Pulsa Iniciar para crear una sesión nueva.') })
      canal.escuchar('monitoring.error', () => { if (turno === generacion) finalizar('error', 'El servidor interrumpió el monitoreo. Vuelve a iniciar.', true) })
      canal.escuchar('monitoring.state', (dato) => {
        if (turno !== generacion || !solicitado || !autorizado()) return
        try { estadoRemoto(dato) } catch { finalizar('error', 'El estado recibido del servidor no es válido.', true) }
      })
      canal.escuchar('monitoring.reading', (dato) => {
        if (turno !== generacion || !solicitado || vista.fase !== 'activo' || !autorizado()) return
        try {
          const lectura = leerLecturaViva(dato, invernaderoId, sensor)
          if (!lectura || retiradas.has(lectura.requestId) || identificadores.has(lectura.readingId) || Date.parse(lectura.receivedAt) < recibidoServidor) return
          if (lectura.requestId !== solicitudActual) {
            if (solicitudActual) retiradas.add(solicitudActual)
            if (retiradas.size > 256) { finalizar('detenido', 'Vuelve a iniciar para renovar la sesión de monitoreo.', true); return }
            solicitudActual = lectura.requestId; secuencia = -1
          }
          if (lectura.sequence <= secuencia) return
          secuencia = lectura.sequence; identificadores.add(lectura.readingId)
          if (identificadores.size > 120) identificadores.delete(identificadores.values().next().value!)
          recibidoServidor = Date.parse(lectura.receivedAt); recibidaLocal = ahora()
          publicar({ recibidaEn: lectura.receivedAt, mensaje: 'Recibiendo lecturas en vivo.', lecturas: [...vista.lecturas, { id: `${lectura.requestId}:${lectura.sequence}`, fechaHora: lectura.measuredAt ?? lectura.receivedAt, valor: lectura.value }].slice(-60) })
        } catch { finalizar('error', 'La lectura recibida no corresponde al sensor o tiene un formato inválido.', true) }
      })
      despues(10000, () => { if (turno === generacion && vista.fase === 'conectando') finalizar('error', 'No se pudo conectar a tiempo. Vuelve a iniciar.') })
      let proximaRenovacion = ahora() + 20000
      const vigilar = () => {
        if (turno !== generacion || !autorizado()) return
        if (vista.venceEn && Date.parse(vista.venceEn) <= ahora()) { finalizar('detenido', motivoFinalizacion('lease_expired'), true); return }
        if (activoDesde !== undefined && ahora() - (recibidaLocal ?? activoDesde) > Math.max(5000, (vista.intervaloMs ?? intervaloMs) * 3)) { finalizar('detenido', motivoFinalizacion('reading_timeout'), true); return }
        if (solicitado && canal?.conectado() && ahora() >= proximaRenovacion) {
          proximaRenovacion = ahora() + 20000
          solicitar('monitoring.renew', { sensorId: sensor.id }, turno)
        }
        if (turno === generacion) despues(1000, vigilar)
      }
      despues(1000, vigilar)
      canal.conectar()
    } catch {
      if (turno === generacion) finalizar('error', 'No se pudo autorizar el monitoreo. Comprueba tu sesión e inténtalo nuevamente.')
    }
  }

  return {
    obtenerEstado: () => vista,
    suscribir(oyente: () => void) { oyentes.add(oyente); return () => { oyentes.delete(oyente) } },
    iniciar,
    detener(mensaje = 'Monitoreo finalizado en esta pantalla.') { finalizar('detenido', mensaje, true) },
    cerrar() { limpiar(true) },
  }
}
