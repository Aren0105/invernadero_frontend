import type { Sensor } from './equipos'
import type { Lectura, RangoHistorial } from './mediciones'

/** Inventario de lectura para miembros del invernadero; no contiene credenciales ni permisos administrativos. */
export type InventarioSensores = { invernaderoId: string; controladorId: string | null; sensores: Sensor[] }
export type AgrupacionHistorial = 'none' | 'hour'
export type ConsultaHistorial = { rango: RangoHistorial; agrupacion: AgrupacionHistorial; pagina: number; limite: number }
export type PaginaHistorial = {
  sensor: Sensor
  rango: RangoHistorial
  agrupacion: AgrupacionHistorial
  resumen: { cantidad: string; minimo: number | null; maximo: number | null; promedio: number | null }
  paginacion: { pagina: number; limite: number; total: string; haySiguiente: boolean }
  lecturas: Array<Lectura & { id: string }>
}

/** Calcula páginas sin convertir conteos PostgreSQL a Number ni perder precisión. */
export function totalPaginas(total: string, limite: number): bigint {
  return (BigInt(total) + BigInt(limite) - 1n) / BigInt(limite)
}

/** Formato de valores, unidades y resúmenes; null se mantiene ausente y nunca se sustituye por cero. */
export function valorMedicion(valor: number | null, unidad: string): string {
  return valor == null ? '—' : `${valor.toLocaleString('es-PE', { maximumFractionDigits: 2 })} ${unidad}`
}
