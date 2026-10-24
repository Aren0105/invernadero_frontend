export type TipoMedicion = 'HumedadSuelo' | 'NivelAgua'
export type Lectura = { fechaHora: string; valor: number }
export type SensorMediciones = {
  id: string
  nombre: string
  tipo: TipoMedicion
  lecturas: Lectura[]
}

export const nombresMedicion: Record<TipoMedicion, string> = {
  HumedadSuelo: 'Humedad del suelo',
  NivelAgua: 'Nivel de agua',
}

export function ordenarLecturas(lecturas: Lectura[]) {
  const unicas = new Map<number, Lectura>()
  for (const lectura of lecturas) {
    const fecha = Date.parse(lectura.fechaHora)
    if (Number.isFinite(fecha) && Number.isFinite(lectura.valor)) unicas.set(fecha, lectura)
  }
  return [...unicas.entries()].sort(([a], [b]) => a - b).map(([, lectura]) => lectura)
}

export function lecturasDelPeriodo(lecturas: Lectura[], periodo: 'hoy' | 'semana', ahora = Date.now()) {
  // Hoy y los últimos siete días calendario, según la zona horaria de Perú.
  const fechaLima = new Date(ahora - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const inicioHoy = Date.parse(`${fechaLima}T00:00:00-05:00`)
  const inicio = inicioHoy - (periodo === 'semana' ? 6 * 86400000 : 0)
  return ordenarLecturas(lecturas).filter((lectura) => {
    const fecha = Date.parse(lectura.fechaHora)
    return fecha >= inicio && fecha <= ahora
  })
}

export function fechaLectura(fecha?: string) {
  return fecha ? new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short',
  }).format(new Date(fecha)) : '—'
}
