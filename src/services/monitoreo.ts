import { io } from 'socket.io-client'
import { gestorSesion } from './api'
import { ambitoApi } from './http'
import { crearGestorMonitoreo } from './gestorMonitoreo'
import { servicioHistorial } from './historial'
import type { Sensor } from '../types/equipos'

/** Separa namespace y ruta de transporte; el token viaja en auth y nunca en parámetros de URL. */
export function direccionMonitoreo(base: string) {
  const url = new URL(base)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new Error('La dirección del monitoreo no es válida.')
  return { namespace: `${url.origin}/monitoring`, path: `${url.pathname.replace(/\/$/, '')}/socket.io` }
}

/** Adapta Socket.IO al gestor del sensor sin habilitar reconexión o reenvíos automáticos. */
export function crearMonitoreo(invernaderoId: string, sensor: Sensor) {
  return crearGestorMonitoreo({
    invernaderoId, sensor, suscribirSesion: gestorSesion.suscribir,
    async autenticar(signal) {
      // Verifica sesión y pertenencia actual por HTTP antes de abrir otro canal con un inventario antiguo.
      const inventario = await servicioHistorial.sensores(invernaderoId, signal)
      const actual = inventario.sensores.find((item) => item.id === sensor.id)
      if (!actual || actual.controladorId !== sensor.controladorId || actual.tipo !== sensor.tipo || actual.unidad !== sensor.unidad) throw new Error('Actualiza los sensores antes de iniciar.')
      return gestorSesion.accesoParaCanal(signal)
    },
    crearCanal(token) {
      const direccion = direccionMonitoreo(ambitoApi)
      const socket = io(direccion.namespace, { path: direccion.path, transports: ['websocket'], autoConnect: false,
        reconnection: false, forceNew: true, multiplex: false, timeout: 10000, auth: { token }, withCredentials: false })
      return {
        conectado: () => socket.connected,
        escuchar: (evento, oyente) => { socket.on(evento, oyente) },
        enviar: (evento, cuerpo, respuesta) => { if (socket.connected) { if (respuesta) socket.emit(evento, cuerpo, respuesta); else socket.emit(evento, cuerpo) } },
        conectar: () => { socket.connect() },
        cerrar: () => { socket.auth = {}; socket.removeAllListeners(); socket.disconnect() },
      }
    },
  })
}
