import { peticionApi } from './api'
import isLength from 'validator/lib/isLength'
import { objeto, solicitarApi, type TransporteApi } from './contratoApi'
import { esIdInvernadero } from '../types/invernaderos'
import { tiposSensor, type Sensor, type TipoSensor } from '../types/equipos'
import type { ConsultaHistorial, InventarioSensores, PaginaHistorial } from '../types/historial'

function id(valor: unknown): string {
  if (!esIdInvernadero(valor)) throw new Error('El identificador no es válido.')
  return valor
}

function conteo(valor: unknown): string {
  if (typeof valor !== 'string' || !/^(0|[1-9]\d{0,18})$/.test(valor) || BigInt(valor) > 9223372036854775807n) throw new Error('El conteo del historial no es válido.')
  return valor
}

function instante(valor: unknown): string {
  if (typeof valor !== 'string' || !/(?:Z|[+-]\d{2}:\d{2})$/.test(valor) || !Number.isFinite(Date.parse(valor))) throw new Error('La fecha del historial no es válida.')
  return valor
}

function numero(valor: unknown): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < -273.15) throw new Error('El valor de medición no es válido.')
  return valor
}

/** Proyecta el inventario público y verifica que todos sus sensores pertenezcan al equipo del invernadero solicitado. */
function leerInventario(valor: unknown, invernaderoId: string): InventarioSensores {
  const dato = objeto(valor)
  if (dato.greenhouseId !== invernaderoId || !Array.isArray(dato.items) || dato.items.length > tiposSensor.length) throw new Error('El inventario no corresponde al invernadero.')
  const controladorId = dato.controllerId === null ? null : id(dato.controllerId)
  const sensores = dato.items.map((item): Sensor => {
    const sensor = objeto(item)
    if (!controladorId || sensor.controllerId !== controladorId || !tiposSensor.includes(sensor.type as TipoSensor)
      || typeof sensor.unit !== 'string' || !sensor.unit.trim() || !isLength(sensor.unit, { min: 1, max: 10 })
      || (sensor.connectionStatus !== 'Conectado' && sensor.connectionStatus !== 'Desconectado')) throw new Error('El sensor del inventario no es válido.')
    return { id: id(sensor.id), controladorId, tipo: sensor.type as TipoSensor, unidad: sensor.unit, conexion: sensor.connectionStatus }
  })
  if (new Set(sensores.map((sensor) => sensor.id)).size !== sensores.length || new Set(sensores.map((sensor) => sensor.tipo)).size !== sensores.length) throw new Error('El inventario contiene sensores repetidos.')
  return { invernaderoId, controladorId, sensores }
}

/** Valida intervalos y paginación antes de llamar al historial, sin mezclar ventanas móviles con fechas explícitas. */
export function validarConsultaHistorial(consulta: ConsultaHistorial): void {
  const desde = instante(consulta.rango.desde)
  const hasta = instante(consulta.rango.hasta)
  const duracion = Date.parse(hasta) - Date.parse(desde)
  if (duracion <= 0 || duracion > 31 * 86400000 || !['none', 'hour'].includes(consulta.agrupacion)
    || !Number.isInteger(consulta.pagina) || consulta.pagina < 1 || consulta.pagina > 10000
    || !Number.isInteger(consulta.limite) || consulta.limite < 1 || consulta.limite > 500) throw new Error('Los filtros del historial no son válidos.')
}

/** Adapta una página sin deduplicar por fecha ni confundir grupos horarios con mediciones individuales. */
function leerPagina(valor: unknown, sensor: Sensor, consulta: ConsultaHistorial): PaginaHistorial {
  const valorSensor = (valor: unknown): number => {
    const dato = numero(valor)
    if ((sensor.tipo !== 'Temperatura' && dato < 0) || ((sensor.unidad === '%' || sensor.tipo.startsWith('Humedad')) && dato > 100)) throw new Error('El valor no corresponde a la magnitud del sensor.')
    return dato
  }
  const dato = objeto(valor)
  const recibido = objeto(dato.sensor)
  const rango = objeto(dato.range)
  const resumen = objeto(dato.summary)
  const paginacion = objeto(dato.pagination)
  if (recibido.id !== sensor.id || recibido.controllerId !== sensor.controladorId || recibido.type !== sensor.tipo || recibido.unit !== sensor.unidad
    || dato.groupBy !== consulta.agrupacion || Date.parse(instante(rango.from)) !== Date.parse(consulta.rango.desde) || Date.parse(instante(rango.to)) !== Date.parse(consulta.rango.hasta)
    || paginacion.page !== consulta.pagina || paginacion.limit !== consulta.limite || typeof paginacion.hasNext !== 'boolean'
    || !Array.isArray(dato.items) || dato.items.length > consulta.limite) throw new Error('La respuesta no corresponde a la consulta del historial.')
  const cantidad = conteo(resumen.count)
  const total = conteo(paginacion.total)
  const vacio = cantidad === '0'
  const minimo = vacio && resumen.minimum === null ? null : valorSensor(resumen.minimum)
  const maximo = vacio && resumen.maximum === null ? null : valorSensor(resumen.maximum)
  const promedio = vacio && resumen.average === null ? null : valorSensor(resumen.average)
  if ((vacio && (minimo !== null || maximo !== null || promedio !== null)) || (!vacio && (minimo == null || maximo == null || promedio == null || minimo > promedio || promedio > maximo))
    || (consulta.agrupacion === 'none' && total !== cantidad) || BigInt(total) > BigInt(cantidad)
    || paginacion.hasNext !== (BigInt(consulta.pagina) * BigInt(consulta.limite) < BigInt(total))) throw new Error('Los resúmenes o la paginación no son válidos.')
  let anterior = -Infinity
  const lecturas = dato.items.map((item) => {
    const fila = objeto(item)
    const agrupado = consulta.agrupacion === 'hour'
    const fechaHora = instante(agrupado ? fila.bucketStart : fila.timestamp)
    const tiempo = Date.parse(fechaHora)
    const inicioPermitido = agrupado ? Math.floor(Date.parse(consulta.rango.desde) / 3600000) * 3600000 : Date.parse(consulta.rango.desde)
    if (tiempo < inicioPermitido || tiempo >= Date.parse(consulta.rango.hasta) || tiempo < anterior || (agrupado && (tiempo <= anterior || tiempo % 3600000 !== 0))) throw new Error('La secuencia de fechas del historial no es válida.')
    anterior = tiempo
    const valor = valorSensor(agrupado ? fila.average : fila.value)
    if (sensor.unidad === '%' && valor > 100) throw new Error('El valor porcentual no es válido.')
    if (agrupado) {
      const conteoGrupo = conteo(fila.count)
      const minimoGrupo = valorSensor(fila.minimum)
      const maximoGrupo = valorSensor(fila.maximum)
      if (conteoGrupo === '0' || BigInt(conteoGrupo) > BigInt(cantidad) || minimoGrupo > valor || valor > maximoGrupo) throw new Error('El grupo horario no es válido.')
      return { id: `hora:${fechaHora}`, fechaHora, valor, conteo: conteoGrupo, minimo: minimoGrupo, maximo: maximoGrupo }
    }
    return { id: id(fila.id), fechaHora, valor }
  })
  const esperados = BigInt(total) - BigInt(consulta.pagina - 1) * BigInt(consulta.limite)
  if (BigInt(lecturas.length) !== (esperados < 0n ? 0n : esperados > BigInt(consulta.limite) ? BigInt(consulta.limite) : esperados)
    || new Set(lecturas.map((lectura) => lectura.id)).size !== lecturas.length) throw new Error('La página está incompleta o contiene registros repetidos.')
  return { sensor, rango: { desde: instante(rango.from), hasta: instante(rango.to) }, agrupacion: consulta.agrupacion,
    resumen: { cantidad, minimo, maximo, promedio }, paginacion: { pagina: consulta.pagina, limite: consulta.limite, total, haySiguiente: paginacion.hasNext }, lecturas }
}

/** Acceso al inventario y al historial mediante la sesión humana; no consulta endpoints administrativos del equipo. */
export function crearServicioHistorial(enviar: TransporteApi) {
  async function sensores(invernaderoId: string, signal?: AbortSignal): Promise<InventarioSensores> {
    return solicitarApi(enviar, `/greenhouses/${id(invernaderoId)}/sensors`, { signal }, (valor) => leerInventario(valor, invernaderoId))
  }
  async function consultar(sensor: Sensor, consulta: ConsultaHistorial, signal?: AbortSignal): Promise<PaginaHistorial> {
    id(sensor.id)
    validarConsultaHistorial(consulta)
    const parametros = new URLSearchParams({ from: consulta.rango.desde, to: consulta.rango.hasta, groupBy: consulta.agrupacion, page: String(consulta.pagina), limit: String(consulta.limite) })
    return solicitarApi(enviar, `/telemetry/sensors/${sensor.id}/history?${parametros}`, { signal }, (valor) => leerPagina(valor, sensor, consulta))
  }
  return { sensores, consultar }
}

export const servicioHistorial = crearServicioHistorial(peticionApi)
