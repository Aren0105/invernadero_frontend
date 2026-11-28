
import type { Sensor } from '../../../types/equipos'
import type {
  ConsultaHistorial,
  PaginaHistorial
} from '../../../types/historial'

// Datos exclusivos para la demostración visual.
export function generarDatosSimulados(
  sensor: Sensor,
  consulta: ConsultaHistorial
): PaginaHistorial {

  const agrupado = consulta.agrupacion === 'hour'

  const inicio = Date.parse(consulta.rango.desde)
  const fin = Date.parse(consulta.rango.hasta)

  const intervalo = 3600000

  const valores = sensor.tipo === 'Temperatura'
    ? [22, 24, 26, 29, 28, 25, 24, 23]
    : sensor.tipo === 'HumedadSuelo'
      ? [55, 60, 70, 75, 65, 60, 65, 70]
      : sensor.tipo === 'HumedadAmbiental'
        ? [65, 70, 62, 58, 68, 75, 70, 65]
        : [90, 90, 80, 75, 75, 65, 85, 90]

  const lecturas: PaginaHistorial['lecturas'] = []

  const primeraFecha = agrupado
    ? Math.ceil(inicio / intervalo) * intervalo
    : inicio

  for (
    let fecha = primeraFecha, i = 0;
    fecha < fin;
    fecha += intervalo, i++
  ) {
    const base = valores[0]

const variacion =
  Math.sin(i * 0.65) * 9 +
  Math.sin(i * 1.8) * 4 +
  Math.cos(i * 0.9) * 3

const valor = Number(
  Math.max(0, Math.min(100, base + variacion)).toFixed(1)
)

    lecturas.push({
      id: `demo-${i}`,
      fechaHora: new Date(fecha).toISOString(),
      valor,
      ...(agrupado
        ? {
            conteo: '1',
            minimo: valor,
            maximo: valor
          }
        : {})
    })
  }

  const total = lecturas.length

  const minimo = total
    ? Math.min(...lecturas.map(item => item.valor))
    : null

  const maximo = total
    ? Math.max(...lecturas.map(item => item.valor))
    : null

  const promedio = total
    ? lecturas.reduce((suma, item) => suma + item.valor, 0) / total
    : null

  const desde = (consulta.pagina - 1) * consulta.limite
  const hasta = desde + consulta.limite

  return {
    sensor,
    rango: consulta.rango,
    agrupacion: consulta.agrupacion,

    resumen: {
      cantidad: String(total),
      minimo,
      maximo,
      promedio
    },

    paginacion: {
      pagina: consulta.pagina,
      limite: consulta.limite,
      total: String(total),
      haySiguiente: hasta < total
    },

    lecturas: lecturas.slice(desde, hasta)
  }
}
