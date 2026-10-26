import { nombresSensor, type TipoSensor } from './equipos'

export type TipoMedicion = TipoSensor
/** Punto observado o promedio horario; id conserva lecturas diferentes con la misma marca de tiempo. */
export type Lectura = { id?: string; fechaHora: string; valor: number; conteo?: string; minimo?: number; maximo?: number }
export type SensorMediciones = {
  id: string
  nombre: string
  tipo: TipoMedicion
  unidad?: string
  lecturas: Lectura[]
}

export const nombresMedicion = nombresSensor

/** Ordena sin mutar ni descartar muestras válidas que coincidan en fecha. */
export function ordenarLecturas(lecturas: Lectura[]) {
  return lecturas.filter((lectura) => Number.isFinite(Date.parse(lectura.fechaHora)) && Number.isFinite(lectura.valor))
    .sort((a, b) => Date.parse(a.fechaHora) - Date.parse(b.fechaHora))
}

/** Separa huecos de agregaciones horarias para no dibujar continuidad donde no existen muestras. */
export function segmentarLecturas(lecturas: Lectura[], intervaloMaximoMs?: number): Lectura[][] {
  const segmentos: Lectura[][] = []
  for (const lectura of ordenarLecturas(lecturas)) {
    const ultimo = segmentos.at(-1)
    if (!ultimo || (intervaloMaximoMs != null && Date.parse(lectura.fechaHora) - Date.parse(ultimo.at(-1)!.fechaHora) > intervaloMaximoMs)) segmentos.push([lectura])
    else ultimo.push(lectura)
  }
  return segmentos
}

export type PeriodoHistorial = 'hoy' | 'semana'
export type RangoHistorial = { desde: string; hasta: string }

/** Congela Hoy o siete días calendario en Perú; el inicio se incluye y el final se excluye, como en la API. */
export function rangoHistorial(periodo: PeriodoHistorial, ahora = Date.now()): RangoHistorial {
  if (!Number.isFinite(ahora)) throw new Error('La fecha de consulta no es válida.')
  const fechaLima = new Date(ahora - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const inicioHoy = Date.parse(`${fechaLima}T00:00:00-05:00`)
  const desde = inicioHoy - (periodo === 'semana' ? 6 * 86400000 : 0)
  return { desde: new Date(desde).toISOString(), hasta: new Date(Math.max(ahora, desde + 1)).toISOString() }
}

/** Filtra observaciones locales con la misma ventana inclusiva/exclusiva del historial persistido. */
export function lecturasDelPeriodo(lecturas: Lectura[], periodo: 'hoy' | 'semana', ahora = Date.now()) {
  const rango = rangoHistorial(periodo, ahora)
  return ordenarLecturas(lecturas).filter((lectura) => {
    const fecha = Date.parse(lectura.fechaHora)
    return fecha >= Date.parse(rango.desde) && fecha < Date.parse(rango.hasta)
  })
}

/** Presenta la fecha de medición o recepción en Perú; una fecha desconocida se representa sin inventar un instante. */
export function fechaLectura(fecha?: string) {
  return fecha && Number.isFinite(Date.parse(fecha)) ? new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short',
  }).format(new Date(fecha)) : '—'
}
