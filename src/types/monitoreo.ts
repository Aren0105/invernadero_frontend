import type { Sensor } from './equipos'
import type { Lectura } from './mediciones'

export type FaseMonitoreo = 'listo' | 'conectando' | 'solicitando' | 'activo' | 'detenido' | 'desconectado' | 'error'
export type EstadoMonitoreo = { fase: FaseMonitoreo; mensaje: string; lecturas: Lectura[]; intervaloMs: number | null; venceEn: string | null; recibidaEn: string | null }
export type EstadoRemoto = { sensorId: string; state: 'starting' | 'active' | 'stopped'; reason?: string; intervalMs?: number; expiresAt?: string }
export type LecturaViva = { requestId: string; sequence: number; readingId: string; value: number; measuredAt: string | null; receivedAt: string }

/** Comprueba instantes enviados por el servidor sin depender de la zona local del navegador. */
function fecha(valor: unknown): valor is string {
  return typeof valor === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(valor) && Number.isFinite(Date.parse(valor))
}

/** Rechaza estados malformados e ignora sensores ajenos a la selección actual. */
export function leerEstadoRemoto(valor: unknown, sensorId: string): EstadoRemoto | null {
  if (!valor || typeof valor !== 'object') throw new Error('El estado del monitoreo no es válido.')
  const dato = valor as Record<string, unknown>
  if (typeof dato.sensorId !== 'string') throw new Error('Falta el sensor del monitoreo.')
  if (dato.sensorId !== sensorId) return null
  if (!['starting', 'active', 'stopped'].includes(String(dato.state))) throw new Error('El estado del monitoreo no es válido.')
  if (dato.state !== 'stopped' && !fecha(dato.expiresAt)) throw new Error('La concesión del monitoreo no es válida.')
  if (dato.state === 'active' && (!Number.isInteger(dato.intervalMs) || Number(dato.intervalMs) < 1000 || Number(dato.intervalMs) > 30000)) throw new Error('El intervalo confirmado no es válido.')
  return { sensorId, state: dato.state as EstadoRemoto['state'], reason: typeof dato.reason === 'string' ? dato.reason : undefined,
    intervalMs: dato.state === 'active' ? Number(dato.intervalMs) : undefined, expiresAt: dato.state === 'stopped' ? undefined : dato.expiresAt as string }
}

/** Valida identidad, unidad y correlación de cada lectura antes de incorporarla a la interfaz. */
export function leerLecturaViva(valor: unknown, invernaderoId: string, sensor: Sensor): LecturaViva | null {
  if (!valor || typeof valor !== 'object') throw new Error('La lectura en vivo no es válida.')
  const dato = valor as Record<string, unknown>
  if (typeof dato.sensorId !== 'string') throw new Error('Falta el sensor de la lectura.')
  if (dato.sensorId !== sensor.id) return null
  if (dato.controllerId !== sensor.controladorId || dato.greenhouseId !== invernaderoId || dato.type !== sensor.tipo || dato.unit !== sensor.unidad
    || typeof dato.requestId !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(dato.requestId)
    || !Number.isInteger(dato.sequence) || Number(dato.sequence) < 0 || Number(dato.sequence) > 2147483647
    || typeof dato.readingId !== 'string' || !/^[a-z\d][a-z\d_:-]{0,99}$/i.test(dato.readingId)
    || typeof dato.value !== 'number' || !Number.isFinite(dato.value) || dato.value < 0 || dato.value > 99999.99
    || ((sensor.unidad === '%' || sensor.tipo.startsWith('Humedad')) && dato.value > 100)
    || !fecha(dato.receivedAt) || (dato.measuredAt !== null && !fecha(dato.measuredAt))) throw new Error('La lectura no corresponde al sensor o contiene datos inválidos.')
  return { requestId: dato.requestId, sequence: Number(dato.sequence), readingId: dato.readingId, value: dato.value, measuredAt: dato.measuredAt as string | null, receivedAt: dato.receivedAt }
}

/** Traduce causas públicas sin mostrar mensajes internos ni credenciales del transporte. */
export function motivoFinalizacion(motivo?: string): string {
  const motivos: Record<string, string> = {
    device_offline: 'El ESP32 se desconectó. Vuelve a iniciar cuando esté disponible.',
    sensor_unsupported: 'El ESP32 no tiene disponible el sensor o su driver.',
    ack_timeout: 'El ESP32 no confirmó la solicitud a tiempo.',
    reading_timeout: 'El sensor dejó de enviar lecturas recientes.',
    lease_expired: 'La concesión venció. Vuelve a iniciar el monitoreo.',
    server_shutdown: 'El servidor cerró el canal. Vuelve a iniciar el monitoreo.',
    user_stopped: 'Monitoreo finalizado en esta pantalla.', disconnected: 'Se cerró la conexión de monitoreo.',
  }
  return motivos[motivo ?? ''] ?? 'El monitoreo finalizó. Puedes volver a iniciarlo.'
}
